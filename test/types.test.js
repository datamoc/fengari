"use strict";

const fs = require('fs');
const path = require('path');
const fengari = require('../src/fengari.js');

const { FengariVm, LuaError, LimitError } = fengari;
const declarations = fs.readFileSync(path.join(__dirname, '..', 'src', 'fengari.d.ts'), 'utf8').replace(/\r\n/g, '\n');

describe('TypeScript declarations', () => {
    test('package.json points to the declarations, which are published', () => {
        const pkg = require('../package.json');
        expect(pkg.types).toBe('src/fengari.d.ts');
        expect(pkg.files).toContain('src/');
        expect(fs.existsSync(path.join(__dirname, '..', pkg.types))).toBe(true);
    });

    test('every runtime export is declared', () => {
        const declared = new Set([...declarations.matchAll(/^export (?:declare )?(?:class|const|function|interface|type) (\w+)/gm)].map(m => m[1]));
        const missing = Object.keys(fengari).filter(name => !declared.has(name));
        expect(missing).toEqual([]);
    });

    test('every declared class and constant exists at runtime', () => {
        const values = [...declarations.matchAll(/^export (?:class|const) (\w+)/gm)].map(m => m[1]);
        expect(values.filter(name => !(name in fengari))).toEqual([]);
    });

    test('every public FengariVm method that is declared exists', () => {
        const body = declarations.slice(declarations.indexOf('export class FengariVm'));
        const methods = [...body.matchAll(/^    (?:static )?(\w+)(?:<\w+>)?\(/gm)].map(m => m[1]).filter(name => name !== 'constructor');
        const missing = methods.filter(name => !(name in FengariVm.prototype) && !(name in FengariVm));
        expect(missing).toEqual([]);
    });
});

describe('FengariVm#throwLuaError', () => {
    test('throws the error value at the given index with the message as traceback', () => {
        const vm = new FengariVm();
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
        const vm = new FengariVm();
        vm.lua.lua_newtable(vm.state);
        expect(() => vm.throwLuaError(vm.state)).toThrow(/error table/);
    });

    test('raises a LimitError once a limit was exceeded', () => {
        const vm = new FengariVm(undefined, undefined, { limits: { instructions: 10000 } });
        expect(() => vm.run('while true do end')).toThrow(LimitError);
        vm.lua.lua_pushstring(vm.state, vm.to_luastring('late'));
        expect(() => vm.throwLuaError(vm.state)).toThrow(LimitError);
    });

    test('Coroutine#close reports a failing closer as a LuaError and resets the thread', () => {
        const vm = new FengariVm();
        const co = vm.coroutineFromSource('local x <close> = setmetatable({}, {__close = function() error("closing failed") end}); coroutine.yield(1)');
        co.resume();
        expect(() => co.close()).toThrow(/closing failed/);
        expect(vm.lua.lua_gettop(co.thread)).toBe(0);
    });
});
