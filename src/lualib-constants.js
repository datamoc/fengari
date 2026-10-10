"use strict";

const {
    LUA_VERSION_MAJOR,
    LUA_VERSION_MINOR
} = require("./defs.js");

const LUA_VERSUFFIX = "_" + LUA_VERSION_MAJOR + "_" + LUA_VERSION_MINOR;
module.exports.LUA_VERSUFFIX = LUA_VERSUFFIX;

module.exports.lua_assert = function(c) {};

/* Lua 5.5 library selection masks (also available in browser profiles). */
module.exports.LUA_GLIBK = 1;
module.exports.LUA_LOADLIBK = 2;
module.exports.LUA_COLIBK = 4;
module.exports.LUA_DBLIBK = 8;
module.exports.LUA_IOLIBK = 16;
module.exports.LUA_MATHLIBK = 32;
module.exports.LUA_OSLIBK = 64;
module.exports.LUA_STRLIBK = 128;
module.exports.LUA_TABLIBK = 256;
module.exports.LUA_UTF8LIBK = 512;


const LUA_COLIBNAME = "coroutine";
module.exports.LUA_COLIBNAME = LUA_COLIBNAME;

const LUA_TABLIBNAME = "table";
module.exports.LUA_TABLIBNAME = LUA_TABLIBNAME;

if (typeof process !== "undefined") {
    const LUA_IOLIBNAME = "io";
    module.exports.LUA_IOLIBNAME = LUA_IOLIBNAME;
}

const LUA_OSLIBNAME = "os";
module.exports.LUA_OSLIBNAME = LUA_OSLIBNAME;

const LUA_STRLIBNAME = "string";
module.exports.LUA_STRLIBNAME = LUA_STRLIBNAME;

const LUA_UTF8LIBNAME = "utf8";
module.exports.LUA_UTF8LIBNAME = LUA_UTF8LIBNAME;

const LUA_BITLIBNAME = "bit32";
module.exports.LUA_BITLIBNAME = LUA_BITLIBNAME;
// module.exports.luaopen_bit32 = require("./lbitlib.js").luaopen_bit32;

const LUA_MATHLIBNAME = "math";
module.exports.LUA_MATHLIBNAME = LUA_MATHLIBNAME;

const LUA_DBLIBNAME = "debug";
module.exports.LUA_DBLIBNAME = LUA_DBLIBNAME;

const LUA_LOADLIBNAME = "package";
module.exports.LUA_LOADLIBNAME = LUA_LOADLIBNAME;

const LUA_FENGARILIBNAME = "fengari";
module.exports.LUA_FENGARILIBNAME = LUA_FENGARILIBNAME;

