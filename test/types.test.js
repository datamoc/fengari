"use strict";

const fs = require('fs');
const path = require('path');
const pyroeis = require('../src/pyroeis.js');

const { PyroeisVm, LuaError, LimitError } = pyroeis;
const declarations = fs.readFileSync(path.join(__dirname, '..', 'src', 'pyroeis.d.ts'), 'utf8').replace(/\r\n/g, '\n');

describe('TypeScript declarations', () => {
    test('package.json points to the declarations, which are published', () => {
        const pkg = require('../package.json');
        expect(pkg.types).toBe('src/pyroeis.d.ts');
        expect(pkg.files).toContain('src/');
        expect(fs.existsSync(path.join(__dirname, '..', pkg.types))).toBe(true);
    });

    test('every runtime export is declared', () => {
        const declared = new Set([...declarations.matchAll(/^export (?:declare )?(?:class|const|function|interface|type) (\w+)/gm)].map(m => m[1]));
        const missing = Object.keys(pyroeis).filter(name => !declared.has(name));
        expect(missing).toEqual([]);
    });

    test('every declared class and constant exists at runtime', () => {
        const values = [...declarations.matchAll(/^export (?:class|const) (\w+)/gm)].map(m => m[1]);
        expect(values.filter(name => !(name in pyroeis))).toEqual([]);
    });

    test('every public PyroeisVm method that is declared exists', () => {
        const body = declarations.slice(declarations.indexOf('export class PyroeisVm'));
        const methods = [...body.matchAll(/^    (?:static )?(\w+)(?:<\w+>)?\(/gm)].map(m => m[1]).filter(name => name !== 'constructor');
        const missing = methods.filter(name => !(name in PyroeisVm.prototype) && !(name in PyroeisVm));
        expect(missing).toEqual([]);
    });
});

describe('PyroeisVm internals used by hosts', () => {
    test('pushPath pushes the value of a dotted path, or nil', () => {
        const vm = new PyroeisVm();
        vm.run('cfg = {level = {depth = 3}}');
        const { lua, state } = vm;
        vm.pushPath(state, 'cfg.level.depth');
        expect(lua.lua_tointeger(state, -1)).toBe(3);
        vm.pushPath(state, 'cfg.missing.depth');
        expect(lua.lua_isnil(state, -1)).toBe(true);
        lua.lua_pop(state, 2);
    });

    test('classifyKeys tells arrays, objects and maps apart without touching the stack', () => {
        const vm = new PyroeisVm();
        const { lua, state } = vm;
        const classify = (source) => {
            const index = lua.lua_gettop(state) + 1;
            vm.pushPath(state, 'load');
            lua.lua_pushstring(state, vm.to_luastring('return ' + source));
            lua.lua_call(state, 1, 1); /* load(...) -> chunk */
            lua.lua_call(state, 0, 1); /* chunk() -> the table */
            const kind = vm.classifyKeys(state, index);
            expect(lua.lua_gettop(state)).toBe(index);
            lua.lua_settop(state, index - 1);
            return kind;
        };
        expect(classify('{10, 20, 30}')).toBe('array');
        expect(classify('{a = 1}')).toBe('object');
        expect(classify('{[2] = 1}')).toBe('object');
        expect(classify('{[true] = 1}')).toBe('map');
        expect(classify('{[1] = 1, ["1"] = 2}')).toBe('map');
    });

    test('nextRandom is deterministic per seed and within [0, 1)', () => {
        const a = new PyroeisVm(undefined, 42), b = new PyroeisVm(undefined, 42), c = new PyroeisVm(undefined, 43);
        const first = [a.nextRandom(), a.nextRandom(), a.nextRandom()];
        expect([b.nextRandom(), b.nextRandom(), b.nextRandom()]).toEqual(first);
        expect(c.nextRandom()).not.toBe(first[0]);
        for (const value of first) expect(value >= 0 && value < 1).toBe(true);
    });

    test('limitHit names the limit that stopped the call and resets for the next one', () => {
        const vm = new PyroeisVm(undefined, undefined, { limits: { instructions: 5000 } });
        expect(vm.limitHit).toBeNull();
        expect(() => vm.run('while true do end')).toThrow(LimitError);
        expect(vm.limitHit).toBe('instructions');
        expect(vm.run('return 1')).toBe(1);
        expect(vm.limitHit).toBeNull();
    });
});

describe('PyroeisVm#protect', () => {
    const failingIndex = `
        t = setmetatable({}, {__index = function(_, key) error("no field " .. key) end})
        function ok() return 42 end`;

    test('returns the value of the callback and keeps the stack balanced', () => {
        const vm = new PyroeisVm();
        const before = vm.lua.lua_gettop(vm.state);
        const value = vm.protect((L) => {
            vm.lua.lua_pushinteger(L, 7);
            vm.lua.lua_pushinteger(L, 8);
            return vm.lua.lua_tointeger(L, -1) + vm.lua.lua_tointeger(L, -2);
        });
        expect(value).toBe(15);
        expect(vm.lua.lua_gettop(vm.state)).toBe(before);
    });

    test('turns a Lua error raised through the C API into a LuaError and leaves the VM usable', () => {
        const vm = new PyroeisVm();
        vm.run(failingIndex);
        const before = vm.lua.lua_gettop(vm.state);
        const read = () => vm.protect((L) => {
            vm.pushPath(L, 't');
            vm.lua.lua_getfield(L, -1, vm.to_luastring('missing'));
            return vm.read(-1, 0, L);
        });
        expect(read).toThrow(LuaError);
        expect(read).toThrow(/no field missing/);
        expect(vm.lua.lua_gettop(vm.state)).toBe(before);
        expect(vm.call('ok')).toBe(42);
    });

    test('luaL_error inside the callback is a LuaError', () => {
        const vm = new PyroeisVm();
        expect(() => vm.protect((L) => vm.lauxlib.luaL_error(L, vm.to_luastring('raised by the host')))).toThrow(/raised by the host/);
        expect(vm.run('return 1 + 1')).toBe(2);
    });

    test('rethrows a JavaScript error of the callback unchanged', () => {
        const vm = new PyroeisVm();
        const failure = new TypeError('host bug');
        let caught;
        try {
            vm.protect(() => { throw failure; });
        } catch (error) {
            caught = error;
        }
        expect(caught).toBe(failure);
        expect(vm.run('return 1 + 1')).toBe(2);
    });

    test('reports a limit overrun inside the callback as a LimitError', () => {
        const vm = new PyroeisVm(undefined, undefined, { limits: { instructions: 10000 } });
        expect(() => vm.protect(() => vm.run('while true do end'))).toThrow(LimitError);
        expect(vm.run('return 5')).toBe(5);
    });

    test('works from a host function called by Lua (uses the running coroutine)', () => {
        const vm = new PyroeisVm();
        vm.run(failingIndex);
        vm.defineFunction('probe', () => {
            try {
                vm.protect((L) => {
                    vm.pushPath(L, 't');
                    vm.lua.lua_getfield(L, -1, vm.to_luastring('x'));
                });
            } catch (error) {
                return `${error.name}: ${error.message}`;
            }
            return 'no error';
        });
        const co = vm.coroutineFromSource('return probe()');
        const { values } = co.resume();
        expect(values[0]).toMatch(/^LuaError: .*no field x/);
    });
});

describe('PyroeisVm#throwLuaError', () => {
    test('throws the error value at the given index with the message as traceback', () => {
        const vm = new PyroeisVm();
        const { lua, state } = vm;
        lua.lua_pushstring(state, vm.to_luastring('boom'));
        lua.lua_pushstring(state, vm.to_luastring('other'));
        let error;
        try {
            vm.throwLuaError(state, -2);
        } catch (caught) {
            error = caught;
        }
        expect(error).toBeInstanceOf(LuaError);
        expect(error).not.toBeInstanceOf(LimitError);
        expect(error.message).toBe('boom');
        expect(error.traceback).toBe('boom');
        expect(lua.lua_gettop(state)).toBe(2);
    });

    test('defaults to the top of the stack and describes non-string errors', () => {
        const vm = new PyroeisVm();
        vm.lua.lua_newtable(vm.state);
        expect(() => vm.throwLuaError(vm.state)).toThrow(/error table/);
    });

    test('raises a LimitError once a limit was exceeded', () => {
        const vm = new PyroeisVm(undefined, undefined, { limits: { instructions: 10000 } });
        expect(() => vm.run('while true do end')).toThrow(LimitError);
        vm.lua.lua_pushstring(vm.state, vm.to_luastring('late'));
        expect(() => vm.throwLuaError(vm.state)).toThrow(LimitError);
    });

    test('Coroutine#close reports a failing closer as a LuaError and resets the thread', () => {
        const vm = new PyroeisVm();
        const co = vm.coroutineFromSource('local x <close> = setmetatable({}, {__close = function() error("closing failed") end}); coroutine.yield(1)');
        co.resume();
        expect(() => co.close()).toThrow(/closing failed/);
        expect(vm.lua.lua_gettop(co.thread)).toBe(0);
    });
});
