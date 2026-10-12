"use strict";

const { PyroeisVm, LuaError, Yield } = require("../src/pyroeis-vm.js");

describe("PyroeisVm libraries", () => {
    test("default opens everything", () => {
        const vm = new PyroeisVm();
        expect(vm.run("return type(load) .. type(require) .. type(os)")).toBe("functionfunctiontable");
    });

    test("libs selects libraries", () => {
        const vm = new PyroeisVm(undefined, undefined, { libs: ["base", "string", "table", "coroutine"] });
        expect(vm.run("return type(require) .. type(os) .. type(string.rep)")).toBe("nilnilfunction");
    });

    test("remove drops globals", () => {
        const vm = new PyroeisVm(undefined, undefined, { remove: ["load", "dofile", "loadfile", "os.exit"] });
        expect(vm.run("return type(load) .. type(dofile) .. type(os.exit) .. type(os.time)")).toBe("nilnilnilfunction");
    });

    test("unknown library throws", () => {
        expect(() => new PyroeisVm(undefined, undefined, { libs: ["nope"] })).toThrow(/Unknown/);
    });
});

describe("PyroeisVm sandbox leaves no host helper behind", () => {
    test("__random, __fs_read and __fs_list are not visible to a sandboxed script", () => {
        const vm = new PyroeisVm(undefined, undefined, { sandbox: true });
        expect(vm.run("return type(__random) .. type(__fs_read) .. type(__fs_list)")).toBe("nilnilnil");
        const names = vm.run("local names = {} for key in pairs(_G) do names[#names + 1] = key end table.sort(names) return table.concat(names, ',')");
        expect(names).not.toMatch(/__/);
        expect(typeof vm.nextRandom()).toBe("number");
    });

    test("outside the sandbox the helpers keep working", () => {
        const vm = new PyroeisVm();
        expect(vm.run("return type(__random)")).toBe("function");
        const value = vm.run("return __random()");
        expect(value >= 0 && value < 1).toBe(true);
    });
});

describe("PyroeisVm print option", () => {
    test("'buffer' (default) collects the lines", () => {
        const vm = new PyroeisVm();
        vm.run("print('a', 1)");
        expect(vm.output).toEqual(["a\t1"]);
    });

    test("'native' keeps the print of the base library and does not touch the buffer", () => {
        const vm = new PyroeisVm(undefined, undefined, { print: "native" });
        const written = [];
        const write = process.stdout.write;
        process.stdout.write = (chunk) => { written.push(String(chunk)); return true; };
        try {
            vm.run("print('native', 2)");
        } finally {
            process.stdout.write = write;
        }
        expect(vm.output).toEqual([]);
        expect(written.join("")).toContain("native\t2");
    });

    test("false removes print", () => {
        const vm = new PyroeisVm(undefined, undefined, { print: false });
        expect(vm.run("return type(print)")).toBe("nil");
    });

    test("'native' with the sandbox keeps string.dump removed (no library re-opening needed)", () => {
        const vm = new PyroeisVm(undefined, undefined, { sandbox: true, print: "native" });
        expect(vm.run("return type(print) .. type(string.dump) .. type(os)")).toBe("functionnilnil");
    });

    test("rejects an unknown value", () => {
        expect(() => new PyroeisVm(undefined, undefined, { print: "buffered" })).toThrow(RangeError);
    });
});

describe("PyroeisVm conversions", () => {
    test("arrays vs objects", () => {
        const vm = new PyroeisVm();
        expect(vm.run("return {1, 2, 3}")).toEqual([1, 2, 3]);
        expect(vm.run("return {a = 1, [1] = 2}")).toEqual({ a: 1, 1: 2 });
        expect(vm.run("return {}")).toEqual({});
    });

    test("functions come back as callable refs", () => {
        const vm = new PyroeisVm();
        const ref = vm.run("return function(a, b) return a + b end");
        expect(ref.type).toBe("function");
        expect(ref.call(2, 3)).toBe(5);
        vm.defineFunction("apply", (fn, x) => fn.call(x));
        expect(vm.run("return apply(function(x) return x * 2 end, 21)")).toBe(42);
        ref.release();
        expect(() => ref.call(1, 1)).toThrow();
    });

    test("JS functions can be pushed", () => {
        const vm = new PyroeisVm();
        vm.defineFunction("give", () => ({ f: (x) => x + 1 }));
        expect(vm.run("return give().f(1)")).toBe(2);
    });

    test("cyclic tables are preserved, cyclic JS throws", () => {
        const vm = new PyroeisVm();
        const t = vm.run("local t = {} t.self = t return t");
        expect(t.self).toBe(t);
        const cyc = {}; cyc.self = cyc;
        expect(() => vm.push(cyc)).toThrow(RangeError);
        vm.lua.lua_settop(vm.state, 0);
    });

    test("host function called from a coroutine sees the right stack", () => {
        const vm = new PyroeisVm();
        vm.defineFunction("echo", (v) => v);
        expect(vm.run("return coroutine.wrap(function() return echo({1, 2}) end)()")).toEqual([1, 2]);
    });
});

describe("PyroeisVm coroutines", () => {
    test("resume/yield from Lua with values both ways", () => {
        const vm = new PyroeisVm();
        vm.run("function gen(a) local b = coroutine.yield(a + 1) local c = coroutine.yield(b * 2) return 'end', c end");
        const co = vm.coroutine("gen");
        expect(co.status).toBe("suspended");
        expect(co.resume(1)).toEqual({ done: false, values: [2] });
        expect(co.resume(10)).toEqual({ done: false, values: [20] });
        expect(co.resume("z")).toEqual({ done: true, values: ["end", "z"] });
        expect(co.status).toBe("dead");
        expect(() => co.resume()).toThrow(/dead/);
    });

    test("host function yields and receives the answer on resume", () => {
        const vm = new PyroeisVm();
        const log = [];
        vm.defineFunction("ask", (question) => new Yield([question]));
        vm.defineFunction("log", (v) => { log.push(v); });
        const co = vm.coroutineFromSource("local ans = ask('name?') log(ans) local a, b = ask('x') return a .. b");
        expect(co.resume()).toEqual({ done: false, values: ["name?"] });
        expect(co.resume("bob")).toEqual({ done: false, values: ["x"] });
        expect(log).toEqual(["bob"]);
        expect(co.resume("a", "b")).toEqual({ done: true, values: ["ab"] });
    });

    test("yield outside a coroutine is a Lua error", () => {
        const vm = new PyroeisVm();
        vm.defineFunction("ask", () => new Yield([]));
        expect(() => vm.run("return ask()")).toThrow(LuaError);
    });

    test("errors carry a traceback and kill the coroutine", () => {
        const vm = new PyroeisVm();
        const co = vm.coroutineFromSource("error('boom')", "=co");
        let error;
        try { co.resume(); } catch (e) { error = e; }
        expect(error).toBeInstanceOf(LuaError);
        expect(error.message).toMatch(/boom/);
        expect(error.traceback).toMatch(/stack traceback/);
        expect(co.status).toBe("dead");
    });

    test("close runs pending <close> variables", () => {
        const vm = new PyroeisVm();
        vm.defineFunction("mark", () => { vm.closed = true; });
        const co = vm.coroutineFromSource("local x <close> = setmetatable({}, {__close = mark}) coroutine.yield(1)");
        expect(co.resume().done).toBe(false);
        co.close();
        expect(vm.closed).toBe(true);
        expect(co.status).toBe("dead");
    });

    test("bad target and syntax errors throw", () => {
        const vm = new PyroeisVm();
        expect(() => vm.coroutine("nothing.here")).toThrow(TypeError);
        expect(() => vm.coroutineFromSource("this is not lua")).toThrow(LuaError);
        expect(vm.lua.lua_gettop(vm.state)).toBe(0);
    });

    test("two coroutines interleave independently", () => {
        const vm = new PyroeisVm();
        vm.run("function counter() local i = 0 while true do i = i + 1 coroutine.yield(i) end end");
        const a = vm.coroutine("counter");
        const b = vm.coroutine("counter");
        a.resume(); a.resume();
        expect(a.resume().values).toEqual([3]);
        expect(b.resume().values).toEqual([1]);
    });
});

describe("PyroeisVm numbers and exports", () => {
    const { LuaFloat } = require("../src/pyroeis-vm.js");

    test("LuaFloat pushes a float", () => {
        const vm = new PyroeisVm();
        vm.defineFunction("f", () => new LuaFloat(5));
        vm.defineFunction("i", () => 5);
        expect(vm.run("return math.type(f()) .. math.type(i())")).toBe("floatinteger");
    });

    test("preserveFloats round-trips float-valued integers", () => {
        const vm = new PyroeisVm(undefined, undefined, { preserveFloats: true });
        const value = vm.run("return 5.0");
        expect(value).toBeInstanceOf(LuaFloat);
        expect(Number(value)).toBe(5);
        expect(vm.run("return 5")).toBe(5);
        expect(vm.run("return 1.5")).toBe(1.5);
        vm.defineFunction("id", (v) => v);
        expect(vm.run("return math.type(id(5.0))")).toBe("float");
    });

    test("default reads 5.0 as a plain number", () => {
        expect(new PyroeisVm().run("return 5.0")).toBe(5);
    });

    test("fengari entry point exposes the VM", () => {
        const fengari = require("../src/pyroeis.js");
        expect(fengari.PyroeisVm).toBe(PyroeisVm);
        expect(fengari.Coroutine).toBeDefined();
        expect(fengari.lua).toBeDefined();
    });
});

describe("PyroeisVm userdata and 64-bit integers", () => {
    const { Userdata, LuaRef } = require("../src/pyroeis-vm.js");

    test("full userdata is a LuaRef", () => {
        const vm = new PyroeisVm();
        const stdout = vm.run("return io.stdout");
        expect(stdout).toBeInstanceOf(LuaRef);
        expect(stdout.type).toBe("userdata");
        vm.defineFunction("same", (a) => a);
        vm.defineFunction("kind", (a) => a.type);
        expect(vm.run("return kind(io.stdout)")).toBe("userdata");
    });

    test("host values round-trip as light userdata", () => {
        const vm = new PyroeisVm();
        const unit = { id: 7 };
        vm.defineFunction("get_unit", () => new Userdata(unit));
        vm.defineFunction("unit_id", (u) => u.value.id);
        expect(vm.run("local u = get_unit() return type(u) .. unit_id(u)")).toBe("userdata7");
        expect(vm.run("return get_unit()").value).toBe(unit);
    });

    test("integers beyond 2^53 are BigInt and round-trip", () => {
        const vm = new PyroeisVm();
        expect(vm.run("return math.maxinteger")).toBe(9223372036854775807n);
        expect(vm.run("return 42")).toBe(42);
        vm.defineFunction("id", (v) => v);
        expect(vm.run("return id(math.maxinteger) == math.maxinteger")).toBe(true);
        expect(vm.run("return math.type(id(2^62 // 1 | 0))")).toBe("integer");
    });

    test("unsafe JS numbers are pushed as floats instead of throwing", () => {
        const vm = new PyroeisVm();
        vm.defineFunction("big", () => 1e300);
        expect(vm.run("return math.type(big())")).toBe("float");
    });

    test("print and error tables tolerate non-JSON values", () => {
        const vm = new PyroeisVm();
        vm.run("print(function() end, math.maxinteger, io.stdout, {f = print})");
        expect(vm.output[0]).toContain("<function>");
        expect(() => vm.run("error({f = print})")).toThrow(/error table/);
    });
});

test("runMulti and callMulti return every value", () => {
    const vm = new PyroeisVm();
    expect(vm.runMulti("return 1, 'a', {2}")).toEqual([1, "a", [2]]);
    expect(vm.runMulti("return")).toEqual([]);
    vm.run("function pair(a) return a, a * 2 end");
    expect(vm.callMulti("pair", 4)).toEqual([4, 8]);
    expect(vm.run("return 1, 2")).toBe(1);
    expect(vm.lua.lua_gettop(vm.state)).toBe(0);
});

describe("PyroeisVm binary strings and exotic keys", () => {
    test("non-UTF-8 strings are Uint8Array and round-trip", () => {
        const vm = new PyroeisVm();
        const bytes = vm.run("return string.char(255, 254, 97)");
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(Array.from(bytes)).toEqual([255, 254, 97]);
        vm.defineFunction("bytes", () => new Uint8Array([0, 200, 10]));
        expect(vm.run("local s = bytes() return #s .. ':' .. s:byte(2)")).toBe("3:200");
        expect(vm.run("return 'é\0x'")).toBe("é\u0000x");
    });

    test("valid UTF-8 and a leading BOM stay strings", () => {
        const vm = new PyroeisVm();
        expect(vm.run("return '\u{FEFF}ok'")).toBe("\uFEFFok");
    });

    test("boolean, float, function and binary keys become a Map", () => {
        const vm = new PyroeisVm();
        const map = vm.run("return {[true] = 1, [1.5] = 'x', a = 2}");
        expect(map).toBeInstanceOf(Map);
        expect(map.get(true)).toBe(1);
        expect(map.get(1.5)).toBe("x");
        expect(map.get("a")).toBe(2);
        const fnKeyed = vm.run("return {[print] = 1}");
        expect([...fnKeyed.keys()][0].type).toBe("function");
        expect(vm.run("return {[string.char(255)] = 1}")).toBeInstanceOf(Map);
    });

    test("a string key colliding with an integer key becomes a Map", () => {
        const vm = new PyroeisVm();
        const map = vm.run("return {[1] = 'i', ['1'] = 's'}");
        expect(map).toBeInstanceOf(Map);
        expect(map.get(1)).toBe("i");
        expect(map.get("1")).toBe("s");
    });

    test("Map pushes back with exact key types", () => {
        const vm = new PyroeisVm();
        vm.defineFunction("m", () => new Map([[true, "t"], [1.5, "f"], ["1", "s"], [1, "i"]]));
        expect(vm.run("local t = m() return t[true] .. t[1.5] .. t['1'] .. t[1]")).toBe("tfsi");
        vm.defineFunction("bad", () => new Map([[NaN, 1]]));
        expect(() => vm.run("return bad()")).toThrow(/NaN/);
    });

    test("round trip keeps booleans keys", () => {
        const vm = new PyroeisVm();
        vm.defineFunction("id", (v) => v);
        expect(vm.run("local t = id({[true] = 'y', [false] = 'n'}) return t[true] .. t[false]")).toBe("yn");
    });

    test("cyclic tables become arrays/maps without stale references", () => {
        const vm = new PyroeisVm();
        const arr = vm.run("local t = {} t[1] = t t[2] = 5 return t");
        expect(Array.isArray(arr)).toBe(true);
        expect(arr[0]).toBe(arr);
    });
});

describe("PyroeisVm hardening", () => {
    test("a __proto__ key stays an own property", () => {
        const vm = new PyroeisVm();
        const value = vm.run("return {['__proto__'] = {polluted = true}, a = 1}");
        expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
        expect(value.polluted).toBeUndefined();
        expect(Object.keys(value).sort()).toEqual(["__proto__", "a"]);
        expect({}.polluted).toBeUndefined();
    });

    test("references from another VM are rejected", () => {
        const a = new PyroeisVm();
        const b = new PyroeisVm();
        const ref = a.run("return function() return 'A' end");
        b.defineFunction("leak", () => ref);
        expect(() => b.run("return leak()")).toThrow(/another PyroeisVm/);
        b.defineFunction("leakCo", () => a.coroutineFromSource("return 1"));
        expect(() => b.run("return leakCo()")).toThrow(/another PyroeisVm/);
    });

    test("removing a library also removes it from package.loaded and preload", () => {
        const vm = new PyroeisVm(undefined, undefined, { remove: ["os", "io"] });
        expect(vm.run("return type(os) .. type(package.loaded.os) .. type(package.loaded.io)")).toBe("nilnilnil");
        expect(vm.run("return pcall(require, 'os')")).toBe(false);
    });
});

describe("PyroeisVm sandbox preset", () => {
    const sandbox = () => new PyroeisVm(undefined, undefined, { sandbox: true });

    test("only the safe libraries are present", () => {
        const vm = sandbox();
        for (const name of ["os", "io", "debug", "package", "require", "dofile", "loadfile"]) {
            expect(vm.run(`return type(${name})`)).toBe("nil");
        }
        expect(vm.run("return type(string.dump)")).toBe("nil");
        expect(vm.run("return type(string.rep) .. type(table.sort) .. type(math.sin) .. type(utf8.char) .. type(coroutine.wrap)"))
            .toBe("functionfunctionfunctionfunctionfunction");
    });

    test("the host file helpers are not exposed, except in a normal VM", () => {
        const files = { read: () => "secret", list: () => ["a"] };
        const vm = new PyroeisVm(files, undefined, { sandbox: true });
        expect(vm.run("return type(__fs_read) .. type(__fs_list)")).toBe("nilnil");
        const normal = new PyroeisVm(files);
        expect(normal.run("return __fs_read('x')")).toBe("secret");
    });

    test("ordinary scripts still work, including load with text and env", () => {
        const vm = sandbox();
        expect(vm.run("return load('return 1 + 1')()")).toBe(2);
        expect(vm.run("local env = {x = 5} return load('return x', 'chunk', 't', env)()")).toBe(5);
        expect(vm.run("return load('return x')()")).toBeNull();
        expect(vm.run("x = 7 return load('return x')()")).toBe(7);
        expect(vm.run("return coroutine.wrap(function() coroutine.yield(1) end)()")).toBe(1);
    });

    test("load refuses binary chunks even when asked for them", () => {
        const dumper = new PyroeisVm();
        const vm = sandbox();
        vm.defineFunction("bytecode", () => dumper.run("return string.dump(function() return 42 end)"));
        expect(vm.run("local f, err = load(bytecode(), 'b', 'b') return f == nil and err ~= nil")).toBe(true);
        expect(vm.run("local f = load(bytecode()) return f == nil")).toBe(true);
    });

    test("no way back to the removed libraries", () => {
        const vm = sandbox();
        expect(vm.run("return type(_G.os) .. type(getmetatable('').__index.dump) .. type(_ENV.io)")).toBe("nilnilnil");
        expect(vm.run("return select('#', pcall(require, 'os'))")).toBe(2);
        expect(vm.run("return (pcall(require, 'os'))")).toBe(false);
    });

    test("libs can narrow the preset but not widen it", () => {
        const narrowed = new PyroeisVm(undefined, undefined, { sandbox: true, libs: ["base", "string"] });
        expect(narrowed.run("return type(table) .. type(string.rep)")).toBe("nilfunction");
        expect(() => new PyroeisVm(undefined, undefined, { sandbox: true, libs: ["base", "os"] })).toThrow(/not allowed/);
        expect(() => new PyroeisVm(undefined, undefined, { sandbox: true, libs: ["debug"] })).toThrow(/not allowed/);
    });

    test("remove adds to the preset removals", () => {
        const vm = new PyroeisVm(undefined, undefined, { sandbox: true, remove: ["load", "print"] });
        expect(vm.run("return type(load) .. type(dofile)")).toBe("nilnil");
    });
});

describe("string keys", () => {
    test("strings whose bytes differ never share a table slot", () => {
        const vm = new PyroeisVm();
        /* "\1#" and "\18\3" used to hash to the same key because hex digits were not padded */
        expect(vm.run('local t = {}; t["\\1#"] = 1; t["\\18\\3"] = 2; return t["\\1#"] * 10 + t["\\18\\3"]')).toBe(12);
    });

    test("long string keys beyond the hashing chunk size stay distinct", () => {
        const vm = new PyroeisVm();
        expect(vm.run('local a, b = ("x"):rep(20000) .. "a", ("x"):rep(20000) .. "b"; local t = {[a] = 1, [b] = 2}; return t[a] * 10 + t[b]')).toBe(12);
    });
});
