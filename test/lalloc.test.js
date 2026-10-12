"use strict";

const lua = require('../src/lua.js');
const lauxlib = require("../src/lauxlib.js");
const lualib = require("../src/lualib.js");
const {to_luastring} = require("../src/pyroeiscore.js");

const newstate = function() {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");
    lualib.luaL_openlibs(L);
    return L;
};

test('lua_setallocf and lua_getallocf round-trip', () => {
    let L = lauxlib.luaL_newstate();

    expect(lua.lua_getallocf(L)).toEqual([null, null]);

    let hook = (ud, nsize) => {};
    lua.lua_setallocf(L, hook, 42);
    expect(lua.lua_getallocf(L)).toEqual([hook, 42]);

    lua.lua_setallocf(L, null, null);
    expect(lua.lua_getallocf(L)).toEqual([null, null]);

    lua.lua_close(L);
});

test('the alloc hook observes string library and concat allocations', () => {
    let L = newstate();

    let seen = 0;
    let calls = 0;
    lua.lua_setallocf(L, (ud, nsize) => {
        seen += nsize;
        calls++;
    }, null);

    expect(lauxlib.luaL_dostring(L, to_luastring('return ("x"):rep(10) .. "y"')))
        .toEqual(lua.LUA_OK);
    expect(lua.lua_tojsstring(L, -1)).toEqual("xxxxxxxxxxy");
    /* rep's result buffer, the concat buffer: at least the bytes asked for */
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(seen).toBeGreaterThanOrEqual(11);

    seen = 0;
    calls = 0;
    expect(lauxlib.luaL_dostring(L, to_luastring('return ("abc"):upper()')))
        .toEqual(lua.LUA_OK);
    expect(lua.lua_tojsstring(L, -1)).toEqual("ABC");
    expect(seen).toBeGreaterThanOrEqual(3);

    lua.lua_close(L);
});

test('a throwing hook aborts the enclosing pcall as LUA_ERRMEM', () => {
    let L = newstate();

    lua.lua_setallocf(L, (ud, nsize) => {
        if (nsize > ud.budget)
            throw new Error("over budget");
    }, {budget: 16});

    lauxlib.luaL_loadstring(L, to_luastring('return ("x"):rep(1000)'));
    expect(lua.lua_pcall(L, 0, 1, 0)).toEqual(lua.LUA_ERRMEM);
    expect(lua.lua_tojsstring(L, -1)).toEqual("not enough memory");

    /* the state must stay usable once the hook is lifted */
    lua.lua_setallocf(L, null, null);
    expect(lauxlib.luaL_dostring(L, to_luastring('return 1 + 1'))).toEqual(lua.LUA_OK);
    expect(lua.lua_tonumber(L, -1)).toEqual(2);

    lua.lua_close(L);
});

test('a script-level pcall cannot swallow a refused allocation', () => {
    let L = newstate();

    lua.lua_setallocf(L, (ud, nsize) => {
        if (nsize > ud.budget)
            throw new Error("over budget");
    }, {budget: 16});

    expect(lauxlib.luaL_dostring(L,
        to_luastring('local ok, err = pcall(function() return ("x"):rep(1000) end); return ok')))
        .toEqual(lua.LUA_ERRMEM);
    expect(lua.lua_tojsstring(L, -1)).toEqual("not enough memory");

    lua.lua_close(L);
});

test('alloc hooks are per state', () => {
    let L1 = newstate();
    let L2 = newstate();

    let seen = 0;
    lua.lua_setallocf(L1, (ud, nsize) => {
        seen += nsize;
    }, null);

    expect(lauxlib.luaL_dostring(L2, to_luastring('return ("x"):rep(50)')))
        .toEqual(lua.LUA_OK);
    expect(seen).toEqual(0);

    expect(lauxlib.luaL_dostring(L1, to_luastring('return ("x"):rep(50)')))
        .toEqual(lua.LUA_OK);
    expect(seen).toBeGreaterThanOrEqual(50);

    lua.lua_close(L1);
    lua.lua_close(L2);
});
