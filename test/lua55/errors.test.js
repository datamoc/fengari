"use strict";

const { lua, lauxlib } = require("../../src/pyroeis.js");
const { runPyroeis } = require("../../tools/lua55/differential.cjs");
const absentError = "string:" + Buffer.from("<no error object>").toString("hex");

test.each([
    ["return pcall(error,nil)", ["boolean:false", absentError]],
    ["return pcall(error)", ["boolean:false", absentError]],
    ["local seen; local ok,e=xpcall(function() error(nil) end,function(e) seen=type(e); return e end); return ok,e,seen",
        ["boolean:false", absentError, "string:6e696c"]],
    ["return xpcall(function() error('boom',0) end,function() return nil end)", ["boolean:false", absentError]],
    ["return pcall(error,false)", ["boolean:false", "boolean:false"]],
    ["local t={}; local ok,e=pcall(error,t); return ok,e==t", ["boolean:false", "boolean:true"]],
    ["return pcall(assert,false,nil)", ["boolean:false", absentError]]
])("Lua 5.5 error contract: %s", (source, expected) => {
    expect(runPyroeis({ id: "error-contract", source })).toEqual({ phase: "execution", status: "ok", values: expected });
});

test("the native-style API normalizes a nil error object and preserves stack values", () => {
    const L = lauxlib.luaL_newstate();
    try {
        lua.lua_pushinteger(L, 42);
        lua.lua_pushcfunction(L, L => {
            lua.lua_pushnil(L);
            return lua.lua_error(L);
        });
        expect(lua.lua_pcall(L, 0, 0, 0)).toBe(lua.LUA_ERRRUN);
        expect(lua.lua_gettop(L)).toBe(2);
        expect(lua.lua_tointeger(L, 1)).toBe(42);
        expect(lua.lua_tojsstring(L, -1)).toBe("<no error object>");
    } finally {
        lua.lua_close(L);
    }
});
