"use strict";

// Mock des modules de Fengari pour éviter les dépendances circulaires
const mockLua = {
    LUA_OK: 0,
    LUA_TBOOLEAN: 1,
    LUA_TNUMBER: 3,
    LUA_TSTRING: 4,
    LUA_TTABLE: 5,
    LUA_TNIL: 0,
    
    luaL_newstate: () => ({}),
    luaL_openlibs: () => {},
    lua_pushjsfunction: () => {},
    lua_setglobal: () => {},
    lua_getglobal: () => {},
    lua_isnil: () => false,
    lua_newtable: () => {},
    lua_pushvalue: () => {},
    lua_getfield: () => {},
    lua_setfield: () => {},
    lua_remove: () => {},
    lua_checkstack: () => {},
    lua_pushnil: () => {},
    lua_pushboolean: () => {},
    lua_pushinteger: () => {},
    lua_pushnumber: () => {},
    lua_pushstring: () => {},
    lua_createtable: () => {},
    lua_seti: () => {},
    lua_gettop: () => 0,
    lua_type: () => mockLua.LUA_TNIL,
    lua_toboolean: () => false,
    lua_tonumber: () => 0,
    lua_tostring: () => "",
    lua_next: () => 0,
    lua_pop: () => {},
    lua_pcall: () => mockLua.LUA_OK,
    lua_error: () => {},
    lua_istable: () => false,
    lua_typename: () => "nil",
};

const mockLauxlib = {
    luaL_loadbuffer: () => mockLua.LUA_OK,
    luaL_traceback: () => {},
};

const mockLualib = {
    luaL_openlibs: () => {},
};

const mockDefs = {
    to_jsstring: (s) => String(s),
    to_luastring: (s) => String(s),
};

// Remplacer les modules de Fengari par des mocks
require.cache[require.resolve('../src/defs.js')] = { exports: mockDefs };
require.cache[require.resolve('../src/lapi.js')] = { exports: mockLua };
require.cache[require.resolve('../src/lauxlib.js')] = { exports: mockLauxlib };
require.cache[require.resolve('../src/lualib.js')] = { exports: mockLualib };

// Test avec les mocks
function testWithMocks() {
    try {
        const { PyroeisVm } = require('../src/pyroeis-vm');
        const vm = new PyroeisVm();
        
        // Exécuter une expression Lua simple
        vm.run("return 42");
        console.log("✅ Test avec mocks: PASSED");
        return true;
    } catch (e) {
        console.error("Test échoué:", e.message);
        return false;
    }
}

// Exécution du test
testWithMocks();