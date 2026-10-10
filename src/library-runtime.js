"use strict";

const core = require("./fengaricore.js");
const luaconf = require("./luaconf.js");
const lua = require("./lua.js");
const lauxlib = require("./lauxlib.js");
const constants = require("./lualib-constants.js");
const createLoadlib = require("./runtime/loadlib.js");

const lualib = { ...constants };
/* Browser JS libraries receive the same API as the public entry point. */
const fengari = { ...core, luaconf, lua, lauxlib, lualib };
const loadlib = createLoadlib({ fengari });

const loadedlibs = {
    _G: require("./lbaselib.js").luaopen_base,
    [constants.LUA_COLIBNAME]: require("./lcorolib.js").luaopen_coroutine,
    [constants.LUA_TABLIBNAME]: require("./ltablib.js").luaopen_table,
    [constants.LUA_OSLIBNAME]: require("./loslib.js").luaopen_os,
    [constants.LUA_STRLIBNAME]: require("./lstrlib.js").luaopen_string,
    [constants.LUA_UTF8LIBNAME]: require("./lutf8lib.js").luaopen_utf8,
    [constants.LUA_MATHLIBNAME]: require("./lmathlib.js").luaopen_math,
    [constants.LUA_DBLIBNAME]: require("./ldblib.js").luaopen_debug,
    [constants.LUA_LOADLIBNAME]: loadlib.luaopen_package,
    [constants.LUA_FENGARILIBNAME]: require("./fengarilib.js").luaopen_fengari
};

lualib.luaopen_base = loadedlibs._G;
lualib.luaopen_coroutine = loadedlibs[constants.LUA_COLIBNAME];
lualib.luaopen_table = loadedlibs[constants.LUA_TABLIBNAME];
lualib.luaopen_os = loadedlibs[constants.LUA_OSLIBNAME];
lualib.luaopen_string = loadedlibs[constants.LUA_STRLIBNAME];
lualib.luaopen_utf8 = loadedlibs[constants.LUA_UTF8LIBNAME];
lualib.luaopen_math = loadedlibs[constants.LUA_MATHLIBNAME];
lualib.luaopen_debug = loadedlibs[constants.LUA_DBLIBNAME];
lualib.luaopen_package = loadlib.luaopen_package;
lualib.luaopen_fengari = loadedlibs[constants.LUA_FENGARILIBNAME];

if (typeof process !== "undefined") {
    lualib.luaopen_io = require("./liolib.js").luaopen_io;
    loadedlibs[constants.LUA_IOLIBNAME] = lualib.luaopen_io;
}

const standardlibs = [
    ["_G", constants.LUA_GLIBK],
    [constants.LUA_LOADLIBNAME, constants.LUA_LOADLIBK],
    [constants.LUA_COLIBNAME, constants.LUA_COLIBK],
    [constants.LUA_DBLIBNAME, constants.LUA_DBLIBK],
    ["io", constants.LUA_IOLIBK],
    [constants.LUA_MATHLIBNAME, constants.LUA_MATHLIBK],
    [constants.LUA_OSLIBNAME, constants.LUA_OSLIBK],
    [constants.LUA_STRLIBNAME, constants.LUA_STRLIBK],
    [constants.LUA_TABLIBNAME, constants.LUA_TABLIBK],
    [constants.LUA_UTF8LIBNAME, constants.LUA_UTF8LIBK]
];

lualib.luaL_openselectedlibs = function(L, load, preload) {
    lauxlib.luaL_getsubtable(L, lua.LUA_REGISTRYINDEX, lauxlib.LUA_PRELOAD_TABLE);
    for (const [name, mask] of standardlibs) {
        const open = loadedlibs[name];
        if (!open) continue;  /* IO requires Node's host services. */
        if (load & mask) {
            lauxlib.luaL_requiref(L, core.to_luastring(name), open, 1);
            lua.lua_pop(L, 1);
        } else if (preload & mask) {
            lua.lua_pushcfunction(L, open);
            lua.lua_setfield(L, -2, core.to_luastring(name));
        }
    }
    lua.lua_pop(L, 1);
};

lualib.luaL_openlibs = function(L) {
    lualib.luaL_openselectedlibs(L, ~0, 0);
    lauxlib.luaL_requiref(L, core.to_luastring(constants.LUA_FENGARILIBNAME), lualib.luaopen_fengari, 1);
    lua.lua_pop(L, 1);
};

module.exports = { lualib, loadlib, fengari };
