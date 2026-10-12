"use strict";

const { lua, lauxlib, lualib, to_luastring } = require("../../src/pyroeis.js");
const { runPyroeis } = require("../../tools/lua55/differential.cjs");

function run(source) {
    const result = runPyroeis({ id: "library-test", source });
    expect(result.status).toBe("ok");
    return result.values;
}

test("UTF-8 accepts the full 31-bit range and rejects non-Unicode points in strict mode", () => {
    expect(run(`
        local s=utf8.char(0,0xD800,0x10FFFF,0x110000,0x200000,0x4000000,0x7FFFFFFF)
        local count,pos=utf8.len(s)
        return count,pos,utf8.len(s,1,-1,true),utf8.codepoint(s,1,-1,true)
    `)).toEqual(["nil", "integer:2", "integer:7", "integer:0", "integer:55296",
        "integer:1114111", "integer:1114112", "integer:2097152", "integer:67108864", "integer:2147483647"]);
    expect(run(`local f=load("return '\\\\u{80000000}'")
        return '\\u{7fffffff}' == utf8.char(0x7fffffff), f==nil`)).toEqual(["boolean:true", "boolean:true"]);
});

test("UTF-8 offset returns both endpoints, including the end sentinel, and one nil on failure", () => {
    expect(run(`local s=utf8.char(65,0x20AC,66)
        local a,b=utf8.offset(s,2); local c,d=utf8.offset(s,0,3)
        local e,f=utf8.offset(s,-1); local g,h=utf8.offset(s,4)
        return a,b,c,d,e,f,g,h,select('#',utf8.offset(s,5)),utf8.offset(s,5)`))
        .toEqual(["integer:2", "integer:4", "integer:2", "integer:4", "integer:5", "integer:5",
            "integer:6", "integer:6", "integer:1", "nil"]);
});

test("UTF-8 rejects overlong and truncated byte sequences even in lax mode", () => {
    expect(run(`local bad={string.char(0xC0,0x80),string.char(0xE2,0x82),string.char(0xFE),string.char(0x80)}
        local trace={}; for _,s in ipairs(bad) do
            local n,p=utf8.len(s,1,-1,true); trace[#trace+1]=tostring(n)..':'..p
        end; local a=pcall(utf8.codes,string.char(0x80)); local b=pcall(utf8.offset,string.char(0x80),0)
        return table.concat(trace,','),a,b`))
        .toEqual(["string:6e696c3a312c6e696c3a312c6e696c3a312c6e696c3a31", "boolean:false", "boolean:false"]);
});

test("UTF-8 codes supports lax decoding and treats negative control positions as exhausted", () => {
    expect(run(`local s=utf8.char(0xDFFF,0x7FFFFFFF); local out={}
        for p,c in utf8.codes(s,true) do out[#out+1]=p..':'..c end
        local it,state=utf8.codes('abc'); local ok=pcall(function()
            for p,c in utf8.codes(s) do end
        end); return table.concat(out,','),select('#',it(state,-1)),ok`))
        .toEqual(["string:313a35373334332c343a32313437343833363437", "integer:0", "boolean:false"]);
});

test("table.create returns a fresh empty table and validates its capacity hints", () => {
    expect(run(`local a,b=table.create(0),table.create('4',nil)
        local x=pcall(table.create,-1); local y=pcall(table.create,0,-1); local z=pcall(table.create,1.5)
        return type(a),#a,next(a),a~=b,x,y,z`))
        .toEqual(["string:7461626c65", "integer:0", "nil", "boolean:true", "boolean:false", "boolean:false", "boolean:false"]);
});

test("selected library masks match Lua 5.5.1 and keep the caller stack intact", () => {
    expect([lualib.LUA_GLIBK, lualib.LUA_LOADLIBK, lualib.LUA_COLIBK, lualib.LUA_DBLIBK,
        lualib.LUA_IOLIBK, lualib.LUA_MATHLIBK, lualib.LUA_OSLIBK, lualib.LUA_STRLIBK,
        lualib.LUA_TABLIBK, lualib.LUA_UTF8LIBK]).toEqual([1,2,4,8,16,32,64,128,256,512]);
    const L = lauxlib.luaL_newstate();
    try {
        lua.lua_pushinteger(L, 42);
        lualib.luaL_openselectedlibs(L, lualib.LUA_GLIBK | lualib.LUA_LOADLIBK | lualib.LUA_TABLIBK,
            lualib.LUA_TABLIBK | lualib.LUA_UTF8LIBK);
        expect(lua.lua_gettop(L)).toBe(1);
        expect(lua.lua_tointeger(L, 1)).toBe(42);
        const source = to_luastring(`
            assert(math==nil and utf8==nil and fengari==nil)
            assert(type(table.create)=='function')
            assert(package.preload.table==nil and type(package.preload.utf8)=='function')
            local u=require('utf8'); assert(utf8==nil and package.loaded.utf8==u)
            return u.offset('a',1)
        `);
        expect(lauxlib.luaL_loadstring(L, source)).toBe(lua.LUA_OK);
        expect(lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0)).toBe(lua.LUA_OK);
        expect(lua.lua_gettop(L)).toBe(3);
        expect(lua.lua_tointeger(L, -2)).toBe(1);
        expect(lua.lua_tointeger(L, -1)).toBe(1);
        lualib.luaL_openselectedlibs(L, lualib.LUA_UTF8LIBK, 0);
        expect(lua.lua_gettop(L)).toBe(3);
        expect(lua.lua_getglobal(L, to_luastring("utf8"))).toBe(lua.LUA_TTABLE);
    } finally {
        lua.lua_close(L);
    }
});
