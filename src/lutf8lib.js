"use strict";

const {
    lua_gettop,
    lua_pushcfunction,
    lua_pushfstring,
    lua_pushinteger,
    lua_pushnil,
    lua_pushstring,
    lua_pushvalue,
    lua_setfield,
    lua_toboolean,
    lua_tointeger
} = require('./lua.js');
const {
    luaL_Buffer,
    luaL_addvalue,
    luaL_argcheck,
    luaL_buffinit,
    luaL_checkinteger,
    luaL_checkstack,
    luaL_checkstring,
    luaL_error,
    luaL_newlib,
    luaL_optinteger,
    luaL_pushresult
} = require('./lauxlib.js');
const {
    luastring_of,
    to_luastring
} = require("./pyroeiscore.js");

const MAXUNICODE = 0x10FFFF;
const MAXUTF = 0x7FFFFFFF;

const iscont = function(p) {
    let c = p & 0xC0;
    return c === 0x80;
};

/* translate a relative string position: negative means back from end */
const u_posrelat = function(pos, len) {
    if (pos >= 0) return pos;
    else if (0 - pos > len) return 0;
    else return len + pos + 1;
};

/*
** Decode one UTF-8 sequence, returning NULL if byte sequence is invalid.
*/
const limits = [0xFFFFFFFF, 0x80, 0x800, 0x10000, 0x200000, 0x4000000];
const utf8_decode = function(s, pos, strict) {
    let c = s[pos];
    let res = 0;  /* final result */
    if (c < 0x80)  /* ascii? */
        res = c;
    else if (c >= 0xFE)
        return null;
    else {
        let count = 0;  /* to count number of continuation bytes */
        while (c & 0x40) {  /* still have continuation bytes? */
            let cc = s[pos + (++count)];  /* read next byte */
            if ((cc & 0xC0) !== 0x80)  /* not a continuation byte? */
                return null;  /* invalid byte sequence */
            res = (res << 6) | (cc & 0x3F);  /* add lower 6 bits from cont. byte */
            c <<= 1;  /* to test next bit */
        }
        res |= ((c & 0x7F) << (count * 5));  /* add first byte */
        if (res > MAXUTF || res < limits[count])
            return null;  /* invalid byte sequence */
        pos += count;  /* skip continuation bytes read */
    }

    if (strict && (res > MAXUNICODE || (res >= 0xD800 && res <= 0xDFFF)))
        return null;

    return {
        code: res,
        pos: pos + 1
    };
};

/*
** utf8len(s [, i [, j]]) --> number of characters that start in the
** range [i,j], or nil + current position if 's' is not well formed in
** that interval
*/
const utflen = function(L) {
    let n = 0;
    let s = luaL_checkstring(L, 1);
    let len = s.length;
    let posi = u_posrelat(luaL_optinteger(L, 2, 1), len);
    let posj = u_posrelat(luaL_optinteger(L, 3, -1), len);
    let lax = lua_toboolean(L, 4);

    luaL_argcheck(L, 1 <= posi && --posi <= len, 2, "initial position out of bounds");
    luaL_argcheck(L, --posj < len, 3, "final position out of bounds");

    while (posi <= posj) {
        let dec = utf8_decode(s, posi, !lax);
        if (dec === null) { /* conversion error? */
            lua_pushnil(L);  /* return nil ... */
            lua_pushinteger(L, posi + 1);  /* ... and current position */
            return 2;
        }
        posi = dec.pos;
        n++;
    }
    lua_pushinteger(L, n);
    return 1;
};

const p_U = to_luastring("%U");
const pushutfchar = function(L, arg) {
    let code = luaL_checkinteger(L, arg);
    luaL_argcheck(L, 0 <= code && code <= MAXUTF, arg, "value out of range");
    lua_pushfstring(L, p_U, code);
};

/*
** utfchar(n1, n2, ...)  -> char(n1)..char(n2)...
*/
const utfchar = function(L) {
    let n = lua_gettop(L);  /* number of arguments */
    if (n === 1)  /* optimize common case of single char */
        pushutfchar(L, 1);
    else {
        let b = new luaL_Buffer();
        luaL_buffinit(L, b);
        for (let i = 1; i <= n; i++) {
            pushutfchar(L, i);
            luaL_addvalue(b);
        }
        luaL_pushresult(b);
    }
    return 1;
};

/*
** offset(s, n, [i])  -> index where n-th character counting from
**   position 'i' starts and ends; 0 means character at 'i'.
*/
const byteoffset = function(L) {
    let s = luaL_checkstring(L, 1);
    let n = luaL_checkinteger(L, 2);
    let posi = n >= 0 ? 1 : s.length + 1;
    posi = u_posrelat(luaL_optinteger(L, 3, posi), s.length);

    luaL_argcheck(L, 1 <= posi && --posi <= s.length, 3, "position out of bounds");

    if (n === 0) {
        /* find beginning of current byte sequence */
        while (posi > 0 && iscont(s[posi])) posi--;
    } else {
        if (iscont(s[posi]))
            luaL_error(L, "initial position is a continuation byte");

        if (n < 0) {
            while (n < 0 && posi > 0) {  /* move back */
                do {  /* find beginning of previous character */
                    posi--;
                } while (posi > 0 && iscont(s[posi]));
                n++;
            }
        } else {
            n--;  /* do not move for 1st character */
            while (n > 0 && posi < s.length) {
                do {  /* find beginning of next character */
                    posi++;
                } while (iscont(s[posi]));  /* (cannot pass final '\0') */
                n--;
            }
        }
    }

    if (n !== 0) {
        lua_pushnil(L);
        return 1;
    }

    lua_pushinteger(L, posi + 1);
    if (s[posi] & 0x80) {
        if (iscont(s[posi]))
            return luaL_error(L, "initial position is a continuation byte");
        while (iscont(s[posi + 1])) posi++;
    }
    lua_pushinteger(L, posi + 1);
    return 2;
};

/*
** codepoint(s, [i, [j]])  -> returns codepoints for all characters
** that start in the range [i,j]
*/
const codepoint = function(L) {
    let s = luaL_checkstring(L, 1);
    let posi = u_posrelat(luaL_optinteger(L, 2, 1), s.length);
    let pose = u_posrelat(luaL_optinteger(L, 3, posi), s.length);
    let lax = lua_toboolean(L, 4);

    luaL_argcheck(L, posi >= 1, 2, "out of bounds");
    luaL_argcheck(L, pose <= s.length, 3, "out of bounds");

    if (posi > pose) return 0;  /* empty interval; return no values */
    if (pose - posi >= 0x7FFFFFFF)
        return luaL_error(L, "string slice too long");
    let n = (pose - posi) + 1;
    luaL_checkstack(L, n, "string slice too long");
    n = 0;
    for (posi -= 1; posi < pose;) {
        let dec = utf8_decode(s, posi, !lax);
        if (dec === null)
            return luaL_error(L, "invalid UTF-8 code");
        lua_pushinteger(L, dec.code);
        posi = dec.pos;
        n++;
    }
    return n;
};

const iter_aux = function(L, strict) {
    let s = luaL_checkstring(L, 1);
    let len = s.length;
    let n = lua_tointeger(L, 2) >>> 0;
    if (n < len)
        while (iscont(s[n])) n++;

    if (n >= len)
        return 0;  /* no more codepoints */
    else {
        let dec = utf8_decode(s, n, strict);
        if (dec === null || iscont(s[dec.pos]))
            return luaL_error(L, to_luastring("invalid UTF-8 code"));
        lua_pushinteger(L, n + 1);
        lua_pushinteger(L, dec.code);
        return 2;
    }
};

const iter_auxstrict = function(L) { return iter_aux(L, true); };
const iter_auxlax = function(L) { return iter_aux(L, false); };

const iter_codes = function(L) {
    let lax = lua_toboolean(L, 2);
    let s = luaL_checkstring(L, 1);
    luaL_argcheck(L, !iscont(s[0]), 1, "invalid UTF-8 code");
    lua_pushcfunction(L, lax ? iter_auxlax : iter_auxstrict);
    lua_pushvalue(L, 1);
    lua_pushinteger(L, 0);
    return 3;
};

const funcs = {
    "char":      utfchar,
    "codepoint": codepoint,
    "codes":     iter_codes,
    "len":       utflen,
    "offset":    byteoffset
};

/* pattern to match a single UTF-8 character */
const UTF8PATT = luastring_of(91, 0, 45, 127, 194, 45, 253, 93, 91, 128, 45, 191, 93, 42);

const luaopen_utf8 = function(L) {
    luaL_newlib(L, funcs);
    lua_pushstring(L, UTF8PATT);
    lua_setfield(L, -2, to_luastring("charpattern", true));
    return 1;
};

module.exports.luaopen_utf8 = luaopen_utf8;
