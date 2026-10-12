const {
    lua_pushinteger,
    lua_pushliteral,
    lua_setfield
} = require('./lua.js');
const {
    luaL_newlib
} = require('./lauxlib.js');
const {
    PYROEIS_AUTHORS,
    PYROEIS_COPYRIGHT,
    PYROEIS_RELEASE,
    PYROEIS_VERSION,
    PYROEIS_VERSION_MAJOR,
    PYROEIS_VERSION_MINOR,
    PYROEIS_VERSION_NUM,
    PYROEIS_VERSION_RELEASE,
    to_luastring
} = require("./pyroeiscore.js");

const luaopen_pyroeis = function(L) {
    luaL_newlib(L, {});
    lua_pushliteral(L, PYROEIS_AUTHORS);
    lua_setfield(L, -2, to_luastring("AUTHORS"));
    lua_pushliteral(L, PYROEIS_COPYRIGHT);
    lua_setfield(L, -2, to_luastring("COPYRIGHT"));
    lua_pushliteral(L, PYROEIS_RELEASE);
    lua_setfield(L, -2, to_luastring("RELEASE"));
    lua_pushliteral(L, PYROEIS_VERSION);
    lua_setfield(L, -2, to_luastring("VERSION"));
    lua_pushliteral(L, PYROEIS_VERSION_MAJOR);
    lua_setfield(L, -2, to_luastring("VERSION_MAJOR"));
    lua_pushliteral(L, PYROEIS_VERSION_MINOR);
    lua_setfield(L, -2, to_luastring("VERSION_MINOR"));
    lua_pushinteger(L, PYROEIS_VERSION_NUM);
    lua_setfield(L, -2, to_luastring("VERSION_NUM"));
    lua_pushliteral(L, PYROEIS_VERSION_RELEASE);
    lua_setfield(L, -2, to_luastring("VERSION_RELEASE"));
    return 1;
};

module.exports.luaopen_pyroeis = luaopen_pyroeis;
