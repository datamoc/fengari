"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { parse } = require("espree");
const vm = require("vm");

const sourceDirectory = path.resolve(__dirname, "../src");

function sourceFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? sourceFiles(filename) : filename.endsWith(".js") ? [filename] : [];
    });
}

function imports(source, filename = "") {
    const dependencies = [];
    const ast = parse(source, { ecmaVersion: "latest", sourceType: "commonjs" });
    function visit(node) {
        if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "require") {
            const argument = node.arguments[0];
            if (argument && argument.type === "Literal" && typeof argument.value === "string") {
                dependencies.push(argument.value);
            } else if (!(filename === path.join(sourceDirectory, "runtime/loadlib.js") &&
                argument && argument.type === "Identifier" && argument.name === "path")) {
                throw new Error(`Unverifiable dynamic import in ${filename}`);
            }
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(child => { if (child && child.type) visit(child); });
            else if (value && value.type) visit(value);
        }
    }
    visit(ast);
    return dependencies;
}

function findCycles(graph) {
    const visited = new Set();
    const active = [];
    const cycles = [];
    function visit(filename) {
        const index = active.indexOf(filename);
        if (index !== -1) {
            cycles.push([...active.slice(index), filename]);
            return;
        }
        if (visited.has(filename)) return;
        active.push(filename);
        for (const dependency of graph.get(filename)) visit(dependency);
        active.pop();
        visited.add(filename);
    }
    for (const filename of graph.keys()) visit(filename);
    return cycles;
}

test("dependency scanner includes deferred and conditional imports, ignoring comments", () => {
    expect(imports(`// require('./ignored.js')
        function later() { return require('./deferred.js'); }
        if (false) require('./conditional.js');
    `)).toEqual(["./deferred.js", "./conditional.js"]);
    expect(findCycles(new Map([["a", ["b"]], ["b", ["a"]]]))).toEqual([["a", "b", "a"]]);
    expect(() => imports("require('./' + name)")).toThrow("Unverifiable dynamic import");
});

test("all source modules form an acyclic dependency graph", () => {
    const files = sourceFiles(sourceDirectory);
    const graph = new Map(files.map(filename => [filename, []]));
    for (const filename of files) {
        for (const dependency of imports(fs.readFileSync(filename, "utf8"), filename)) {
            if (!dependency.startsWith(".")) continue;
            const target = require.resolve(path.resolve(path.dirname(filename), dependency));
            expect(graph.has(target)).toBe(true);
            graph.get(filename).push(target);
        }
    }
    expect(findCycles(graph).map(cycle => cycle.map(filename => path.relative(sourceDirectory, filename)))).toEqual([]);
});

test("browser initialization and JS libraries use the complete public API", () => {
    const context = vm.createContext({ console });
    context.window = context;
    context.XMLHttpRequest = class {
        open() {}
        send() {
            this.status = 200;
            this.response = `return { luaopen_fixture: function(L) {
                pyroeis.lua.lua_pushboolean(L, pyroeis === window.publicPyroeis &&
                    typeof pyroeis.lualib.luaL_openlibs === 'function');
                return 1;
            } };`;
        }
    };
    const cache = new Map();
    const initializing = new Set();
    function load(filename) {
        if (initializing.has(filename)) throw new Error(`Circular browser import: ${filename}`);
        if (cache.has(filename)) return cache.get(filename);
        initializing.add(filename);
        const module = { exports: {} };
        const requireModule = dependency => {
            if (!dependency.startsWith(".")) return require(dependency);
            return load(require.resolve(path.resolve(path.dirname(filename), dependency)));
        };
        const factory = vm.runInContext(`(function(require, module, exports) {\n${fs.readFileSync(filename, "utf8")}\n})`, context, { filename });
        factory(requireModule, module, module.exports);
        initializing.delete(filename);
        cache.set(filename, module.exports);
        return module.exports;
    }
    const f = load(path.join(sourceDirectory, "pyroeis.js"));
    context.publicPyroeis = f;
    const L = f.lauxlib.luaL_newstate();
    expect(L).toBeTruthy();
    f.lualib.luaL_openlibs(L);
    const source = 'local open = assert(package.loadlib("fixture.js", "luaopen_fixture")); return open()';
    expect(f.lauxlib.luaL_dostring(L, f.to_luastring(source))).toBe(f.lua.LUA_OK);
    expect(f.lua.lua_toboolean(L, -1)).toBe(true);
});

test("the VM extension evaluates code and calls host functions", () => {
    const { PyroeisVm } = require("../src/pyroeis-vm.js");
    const engine = new PyroeisVm();
    engine.defineFunction("add", (a, b) => a + b);
    expect(engine.run("value = add(20, 22); return value")).toBe(42);
    expect(engine.run("return value + 1")).toBe(43);
});

test("API extensions use the composed API without importing the auxiliary libraries", () => {
    const { lua, lauxlib, to_luastring } = require("../src/pyroeis.js");
    const extensions = require("../src/lapi-ext.js");
    expect(extensions.lua_resetthread).toBe(lua.lua_resetthread);
    expect(extensions.lua_closeslot).toBe(lua.lua_closeslot);
    const L = lauxlib.luaL_newstate();
    lua.lua_pushjsfunction_ex(L, (a, b) => [a + b, "host result"]);
    lua.lua_setglobal(L, to_luastring("host"));
    expect(lua.lua_eval_multiple(L, 'return host(20, 22); return true, nil')).toEqual({
        status: lua.LUA_OK,
        results: [[42, "host result"], [true, null]]
    });
    expect(lua.lua_eval_multiple(L, "return (").status).toBe(lua.LUA_ERRSYNTAX);
});

test.each(["defs", "luaconf"])("custom stack configuration is consistent when %s loads first", first => {
    const script = `
        const assert = require('assert');
        require(${JSON.stringify(path.join(sourceDirectory, first + ".js"))});
        const defs = require(${JSON.stringify(path.join(sourceDirectory, "defs.js"))});
        const conf = require(${JSON.stringify(path.join(sourceDirectory, "luaconf.js"))});
        assert.strictEqual(conf.LUAI_MAXSTACK, 8192);
        assert.strictEqual(defs.LUA_REGISTRYINDEX, -9192);
    `;
    execFileSync(process.execPath, ["-e", script], {
        env: { ...process.env, PYROEISCONF: JSON.stringify({ LUAI_MAXSTACK: 8192 }) },
        stdio: "pipe"
    });
});

test("only PYROEISCONF configures the VM: the former FENGARICONF name is ignored", () => {
    const maxstack = env => Number(execFileSync(process.execPath, ["-p", `require(${JSON.stringify(path.join(sourceDirectory, "luaconf-base.js"))}).LUAI_MAXSTACK`], {
        env: { ...process.env, PYROEISCONF: "", FENGARICONF: "", ...env }, encoding: "utf8"
    }));
    expect(maxstack({ FENGARICONF: JSON.stringify({ LUAI_MAXSTACK: 4096 }) })).toBe(1000000);
    expect(maxstack({ PYROEISCONF: JSON.stringify({ LUAI_MAXSTACK: 2048 }) })).toBe(2048);
});

test.each([
    "defs", "luaconf", "lobject", "lfunc", "lstate", "ltable", "ltm", "llex", "lcode",
    "lparser", "lundump", "lvm", "ldebug", "ldo", "lapi", "lua", "lauxlib", "lualib",
    "linit", "loadlib", "pyroeis", "pyroeis-vm", "lapi-ext", "tvalue", "lstate_clean"
])("cold import of %s preserves the complete runtime", first => {
    const script = `
        const assert = require('assert');
        require(${JSON.stringify(path.join(sourceDirectory, first + ".js"))});
        const f = require(${JSON.stringify(path.join(sourceDirectory, "pyroeis.js"))});
        const L = f.lauxlib.luaL_newstate();
        assert(L);
        f.lualib.luaL_openlibs(L);
        const source = 'local function f(n) if n == 0 then return 1 end return n * f(n-1) end return f(5), math.sqrt(81)';
        assert.strictEqual(f.lauxlib.luaL_dostring(L, f.to_luastring(source)), f.lua.LUA_OK);
        assert.strictEqual(f.lua.lua_tointeger(L, -2), 120);
        assert.strictEqual(f.lua.lua_tonumber(L, -1), 9);
        assert.strictEqual(require(${JSON.stringify(path.join(sourceDirectory, "tvalue.js"))}).TValue,
            require(${JSON.stringify(path.join(sourceDirectory, "lobject.js"))}).TValue);
    `;
    execFileSync(process.execPath, ["--throw-deprecation", "-e", script], { stdio: "pipe" });
});
