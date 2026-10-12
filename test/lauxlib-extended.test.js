"use strict";

const assert = require('assert');
const pyroeis = require('../src/pyroeis.js');
const lauxlib = require('../src/lauxlib');
const lua = require('../src/lua');
const lualib = require('../src/lualib');
const { to_luastring } = require('../src/pyroeiscore');

describe('Extended lauxlib Tests', function() {
    let L;
    
    beforeEach(function() {
        L = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(L);
    });
    
    afterEach(function() {
        lua.lua_close(L);
    });
    
    describe('luaL_addgsub', function() {
        it('should substitute patterns in a buffer', function() {
            const B = new lauxlib.luaL_Buffer();
            lauxlib.luaL_buffinit(L, B);
            lauxlib.luaL_addgsub(B, to_luastring("hello world"), to_luastring("world"), to_luastring("Lua"));
            lauxlib.luaL_pushresult(B);
            const result = lua.lua_tostring(L, -1);
            assert.strictEqual(pyroeis.to_jsstring(result), "hello Lua");
        });
    });
    
    describe('luaL_argexpected', function() {
        it('should not raise an error for correct argument types', function() {
            lua.lua_pushinteger(L, 42);
            lauxlib.luaL_argexpected(L, lua.lua_isinteger(L, -1), 1, to_luastring("integer"));
            assert.ok(true); // No error thrown
        });
        
        it('should raise an error for incorrect argument types', function() {
            lua.lua_pushstring(L, to_luastring("not an integer"));
            assert.throws(() => {
                lauxlib.luaL_argexpected(L, lua.lua_isinteger(L, -1), 1, to_luastring("integer"));
            }, /integer expected/);
        });
    });
    
    describe('luaL_pushfail', function() {
        it('should push a nil value onto the stack', function() {
            lauxlib.luaL_pushfail(L);
            assert.ok(lua.lua_isnil(L, -1));
        });
    });
    
    describe('luaL_typeerror', function() {
        it('should raise a type error', function() {
            lua.lua_pushstring(L, to_luastring("not a number"));
            assert.throws(() => {
                lauxlib.luaL_typeerror(L, 1, to_luastring("number"));
            }, /number expected/);
        });
    });
    
    describe('luaL_buffaddr', function() {
        it('should return the address of the buffer', function() {
            const B = new lauxlib.luaL_Buffer();
            lauxlib.luaL_buffinit(L, B);
            const addr = lauxlib.luaL_buffaddr(B);
            assert.ok(addr !== undefined);
        });
    });
    
    describe('luaL_bufflen', function() {
        it('should return the length of the buffer', function() {
            const B = new lauxlib.luaL_Buffer();
            lauxlib.luaL_buffinit(L, B);
            lauxlib.luaL_addstring(B, to_luastring("test"));
            const len = lauxlib.luaL_bufflen(B);
            assert.strictEqual(len, 4);
        });
    });
    
    describe('luaL_buffsub', function() {
        it('should add a substring to the buffer', function() {
            const B = new lauxlib.luaL_Buffer();
            lauxlib.luaL_buffinit(L, B);
            lauxlib.luaL_buffsub(B, to_luastring("test"));
            lauxlib.luaL_pushresult(B);
            const result = lua.lua_tostring(L, -1);
            assert.strictEqual(pyroeis.to_jsstring(result), "test");
        });
    });
    
    describe('luaL_checkint', function() {
        it('should check for an integer', function() {
            lua.lua_pushinteger(L, 42);
            const result = lauxlib.luaL_checkint(L, 1);
            assert.strictEqual(result, 42);
        });
    });
    
    describe('luaL_checklong', function() {
        it('should check for a long integer', function() {
            lua.lua_pushinteger(L, 42);
            const result = lauxlib.luaL_checklong(L, 1);
            assert.strictEqual(result, 42);
        });
    });
    
    describe('luaL_checkunsigned', function() {
        it('should check for an unsigned integer', function() {
            lua.lua_pushinteger(L, 42);
            const result = lauxlib.luaL_checkunsigned(L, 1);
            assert.strictEqual(result, 42);
        });
        
        it('should raise an error for negative integers', function() {
            lua.lua_pushinteger(L, -42);
            assert.throws(() => {
                lauxlib.luaL_checkunsigned(L, 1);
            }, /unsigned integer expected/);
        });
    });
    
    describe('luaL_intop', function() {
        it('should perform integer operations', function() {
            const resultAdd = lauxlib.luaL_intop(0, 10, 5); // LUA_OPADD
            assert.strictEqual(resultAdd, 15);
            
            const resultSub = lauxlib.luaL_intop(1, 10, 5); // LUA_OPSUB
            assert.strictEqual(resultSub, 5);
            
            const resultMul = lauxlib.luaL_intop(2, 10, 5); // LUA_OPMUL
            assert.strictEqual(resultMul, 50);
        });
    });
    
    describe('luaL_makeseed', function() {
        it('should generate a seed for randomization', function() {
            const seed = lauxlib.luaL_makeseed();
            assert.ok(seed >= 0 && seed < 0x100000000);
        });
    });
    
    describe('luaL_optint', function() {
        it('should opt for an integer', function() {
            lua.lua_pushinteger(L, 42);
            const result = lauxlib.luaL_optint(L, 1, 0);
            assert.strictEqual(result, 42);
        });
    });
    
    describe('luaL_optlong', function() {
        it('should opt for a long integer', function() {
            lua.lua_pushinteger(L, 42);
            const result = lauxlib.luaL_optlong(L, 1, 0);
            assert.strictEqual(result, 42);
        });
    });
    
    describe('luaL_optunsigned', function() {
        it('should opt for an unsigned integer', function() {
            lua.lua_pushinteger(L, 42);
            const result = lauxlib.luaL_optunsigned(L, 1, 0);
            assert.strictEqual(result, 42);
        });
        
        it('should raise an error for negative integers', function() {
            lua.lua_pushinteger(L, -42);
            assert.throws(() => {
                lauxlib.luaL_optunsigned(L, 1, 0);
            }, /unsigned integer expected/);
        });
    });
});