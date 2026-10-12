"use strict";
const integer = require('./linteger.js');

const {
    LUA_OPLT,
    LUA_TNUMBER,
    lua_compare,
    lua_gettop,
    lua_isinteger,
    lua_isnoneornil,
    lua_pushboolean,
    lua_pushinteger,
    lua_pushliteral,
    lua_pushnil,
    lua_pushnumber,
    lua_pushvalue,
    lua_setfield,
    lua_settop,
    lua_tointeger,
    lua_tointegerx,
    lua_type
} = require('./lua.js');
const {
    luaL_argcheck,
    luaL_argerror,
    luaL_checkany,
    luaL_checkinteger,
    luaL_checknumber,
    luaL_error,
    luaL_newlib,
    luaL_optinteger,
    luaL_optnumber
} = require('./lauxlib.js');
const {
    LUA_MAXINTEGER,
    LUA_MININTEGER,
    lua_numbertointeger
} = require('./luaconf.js');
const { to_luastring } = require("./pyroeiscore.js");

/*
** Random-integer machinery ported from Lua 5.5.1 lmathlib.c:
** 'xoshiro256**' over four unsigned 64-bit values, projected into
** intervals with the 'project' algorithm to keep uniformity.
** All arithmetic is done modulo 2^64 with BigInt.
*/
const MASK64 = (1n << 64n) - 1n;

let rand_state = [0n, 0n, 0n, 0n];  /* current state */
let rand_seeded = false;

const rotl64 = function(x, n) {
    return ((x << BigInt(n)) | (x >> BigInt(64 - n))) & MASK64;
};

const nextrand = function() {
    let s = rand_state;
    let res = rotl64((s[1] * 5n) & MASK64, 7) * 9n & MASK64;
    let t = (s[1] << 17n) & MASK64;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl64(s[3], 45);
    return res;
};

/* converts an unsigned 64-bit random value into a float in [0, 1) */
const I2d = function(x) {
    return Number(x >> 11n) / 9007199254740992;  /* 2^53 random bits */
};

/* seed the state (as Lua 5.5.1 'setseed') */
const setrandseed = function(n1, n2) {
    rand_state[0] = n1 & MASK64;
    rand_state[1] = 0xffn;  /* avoid a zero state */
    rand_state[2] = n2 & MASK64;
    rand_state[3] = 0n;
    for (let i = 0; i < 16; i++)  /* discard initial values to "spread" seed */
        nextrand();
    rand_seeded = true;
};

/* if not seeded yet, use a "random" seed from time and Math.random */
const checkrandseed = function() {
    if (!rand_seeded)
        setrandseed(
            BigInt(Math.floor(Math.random() * 0x100000000)) ^ BigInt(Date.now()),
            BigInt(Math.floor(Math.random() * 0x100000000)));
};

/*
** Project the random integer 'ran' into the interval [0, n]:
** 'lim' is the smallest Mersenne number not smaller than 'n'; 'ran'
** is projected into [0, lim] and re-drawn while it falls outside [0, n].
*/
const project = function(ran, n) {
    let lim = n;  /* to compute the Mersenne number */
    for (let sh = 1; (lim & (lim + 1n)) !== 0n; sh *= 2)
        lim |= lim >> BigInt(sh);  /* spread 1s to the right */
    while ((ran &= lim) > n)  /* project 'ran' into [0..lim] and test */
        ran = nextrand();  /* not inside [0..n]? try again */
    return ran;
};

const math_random = function(L) {
    let low, up;
    checkrandseed();
    let rv = nextrand();  /* next pseudo-random value */
    switch (lua_gettop(L)) {  /* check number of arguments */
        case 0:
            lua_pushnumber(L, I2d(rv));  /* float between 0 and 1 */
            return 1;
        case 1: {
            low = 1;
            up = luaL_checkinteger(L, 1);
            if (up === 0) {  /* single 0 as argument? */
                lua_pushinteger(L, integer.wrap(rv));  /* full random integer */
                return 1;
            }
            break;
        }
        case 2: {
            low = luaL_checkinteger(L, 1);
            up = luaL_checkinteger(L, 2);
            break;
        }
        default: return luaL_error(L, "wrong number of arguments");
    }

    /* random integer in the interval [low, up] */
    luaL_argcheck(L, low <= up, 1, "interval is empty");
    luaL_argcheck(L, low >= 0 || up <= integer.add(LUA_MAXINTEGER, low), 1,
        "interval too large");

    /* project random integer into the interval [0, up - low] */
    let p = project(rv, integer.unsigned(integer.sub(up, low)));
    lua_pushinteger(L, integer.wrap(integer.unsigned(low) + p));
    return 1;
};

const math_randomseed = function(L) {
    let n1, n2;
    if (lua_isnoneornil(L, 1)) {
        checkrandseed();  /* "random" seed */
        n1 = BigInt(Date.now()) ^ BigInt(Math.floor(Math.random() * 0x100000000));
        n2 = nextrand();  /* in case seed is not that random... */
    }
    else {
        n1 = integer.unsigned(luaL_checkinteger(L, 1));
        n2 = integer.unsigned(luaL_optinteger(L, 2, 0));
    }
    setrandseed(n1, n2);
    lua_pushinteger(L, integer.wrap(n1));
    lua_pushinteger(L, integer.wrap(n2));
    return 2;  /* return seeds */
};

const math_abs = function(L) {
    if (lua_isinteger(L, 1)) {
        let n = lua_tointeger(L, 1);
        if (n < 0) n = integer.neg(n);
        lua_pushinteger(L, n);
    }
    else
        lua_pushnumber(L, Math.abs(luaL_checknumber(L, 1)));
    return 1;
};

const math_sin = function(L) {
    lua_pushnumber(L, Math.sin(luaL_checknumber(L, 1)));
    return 1;
};

const math_cos = function(L) {
    lua_pushnumber(L, Math.cos(luaL_checknumber(L, 1)));
    return 1;
};

const math_tan = function(L) {
    lua_pushnumber(L, Math.tan(luaL_checknumber(L, 1)));
    return 1;
};

const math_asin = function(L) {
    lua_pushnumber(L, Math.asin(luaL_checknumber(L, 1)));
    return 1;
};

const math_acos = function(L) {
    lua_pushnumber(L, Math.acos(luaL_checknumber(L, 1)));
    return 1;
};

const math_atan = function(L) {
    let y = luaL_checknumber(L, 1);
    let x = luaL_optnumber(L, 2, 1);
    lua_pushnumber(L, Math.atan2(y, x));
    return 1;
};

const math_toint = function(L) {
    let n = lua_tointegerx(L, 1);
    if (n !== false)
        lua_pushinteger(L, n);
    else {
        luaL_checkany(L, 1);
        lua_pushnil(L);  /* value is not convertible to integer */
    }
    return 1;
};

const pushnumint = function(L, d) {
    let n = lua_numbertointeger(d);
    if (n !== false)  /* does 'd' fit in an integer? */
        lua_pushinteger(L, n);  /* result is integer */
    else
        lua_pushnumber(L, d);  /* result is float */
};

const math_floor = function(L) {
    if (lua_isinteger(L, 1))
        lua_settop(L, 1);
    else
        pushnumint(L, Math.floor(luaL_checknumber(L, 1)));

    return 1;
};

const math_ceil = function(L) {
    if (lua_isinteger(L, 1))
        lua_settop(L, 1);
    else
        pushnumint(L, Math.ceil(luaL_checknumber(L, 1)));

    return 1;
};

const math_sqrt = function(L) {
    lua_pushnumber(L, Math.sqrt(luaL_checknumber(L, 1)));
    return 1;
};

const math_ult = function(L) {
    let a = luaL_checkinteger(L, 1);
    let b = luaL_checkinteger(L, 2);
    lua_pushboolean(L, (a >= 0)?(b<0 || a<b):(b<0 && a<b));
    return 1;
};

const math_log = function(L) {
    let x = luaL_checknumber(L, 1);
    let res;
    if (lua_isnoneornil(L, 2))
        res = Math.log(x);
    else {
        let base = luaL_checknumber(L, 2);
        if (base === 2)
            res = Math.log2(x);
        else if (base === 10)
            res = Math.log10(x);
        else
            res = Math.log(x)/Math.log(base);
    }
    lua_pushnumber(L, res);
    return 1;
};

const math_exp = function(L) {
    lua_pushnumber(L, Math.exp(luaL_checknumber(L, 1)));
    return 1;
};

const math_deg = function(L) {
    lua_pushnumber(L, luaL_checknumber(L, 1) * (180 / Math.PI));
    return 1;
};

const math_rad = function(L) {
    lua_pushnumber(L, luaL_checknumber(L, 1) * (Math.PI / 180));
    return 1;
};

const math_min = function(L) {
    let n = lua_gettop(L);  /* number of arguments */
    let imin = 1;  /* index of current minimum value */
    luaL_argcheck(L, n >= 1, 1, "value expected");
    for (let i = 2; i <= n; i++){
        if (lua_compare(L, i, imin, LUA_OPLT))
            imin = i;
    }
    lua_pushvalue(L, imin);
    return 1;
};

const math_max = function(L) {
    let n = lua_gettop(L);  /* number of arguments */
    let imax = 1;  /* index of current minimum value */
    luaL_argcheck(L, n >= 1, 1, "value expected");
    for (let i = 2; i <= n; i++){
        if (lua_compare(L, imax, i, LUA_OPLT))
            imax = i;
    }
    lua_pushvalue(L, imax);
    return 1;
};

const math_type = function(L) {
    if (lua_type(L, 1) === LUA_TNUMBER) {
        if (lua_isinteger(L, 1))
            lua_pushliteral(L, "integer");
        else
            lua_pushliteral(L, "float");
    } else {
        luaL_checkany(L, 1);
        lua_pushnil(L);
    }
    return 1;
};

const math_fmod = function(L) {
    if (lua_isinteger(L, 1) && lua_isinteger(L, 2)) {
        let d = lua_tointeger(L, 2);
        /* no special case needed for -1 in javascript */
        if (d === 0) {
            luaL_argerror(L, 2, "zero");
        } else
            lua_pushinteger(L, integer.wrap(BigInt(lua_tointeger(L, 1)) % BigInt(d)));
    } else {
        let a = luaL_checknumber(L, 1);
        let b = luaL_checknumber(L, 2);
        lua_pushnumber(L, a%b);
    }
    return 1;
};

const math_modf = function(L) {
    if (lua_isinteger(L, 1)) {
        lua_settop(L, 1);  /* number is its own integer part */
        lua_pushnumber(L, 0);  /* no fractional part */
    } else {
        let n = luaL_checknumber(L, 1);
        let ip = n < 0 ? Math.ceil(n) : Math.floor(n);
        pushnumint(L, ip);
        lua_pushnumber(L, n === ip ? 0 : n - ip);
    }
    return 2;
};

const mathlib = {
    "abs":        math_abs,
    "acos":       math_acos,
    "asin":       math_asin,
    "atan":       math_atan,
    "ceil":       math_ceil,
    "cos":        math_cos,
    "deg":        math_deg,
    "exp":        math_exp,
    "floor":      math_floor,
    "fmod":       math_fmod,
    "log":        math_log,
    "max":        math_max,
    "min":        math_min,
    "modf":       math_modf,
    "rad":        math_rad,
    "random":     math_random,
    "randomseed": math_randomseed,
    "sin":        math_sin,
    "sqrt":       math_sqrt,
    "tan":        math_tan,
    "tointeger":  math_toint,
    "type":       math_type,
    "ult":        math_ult
};

const luaopen_math = function(L) {
    luaL_newlib(L, mathlib);
    lua_pushnumber(L, Math.PI);
    lua_setfield(L, -2, to_luastring("pi", true));
    lua_pushnumber(L, Infinity);
    lua_setfield(L, -2, to_luastring("huge", true));
    lua_pushinteger(L, LUA_MAXINTEGER);
    lua_setfield(L, -2, to_luastring("maxinteger", true));
    lua_pushinteger(L, LUA_MININTEGER);
    lua_setfield(L, -2, to_luastring("mininteger", true));
    return 1;
};

module.exports.luaopen_math = luaopen_math;
