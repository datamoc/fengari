"use strict";

/*
** JS analogue of lmem.c: the one place the VM's internal string and buffer
** allocations can be observed, bounded or refused by the embedder.
**
** lua_setallocf(L, allocf, ud) installs allocf on the state. It is then called
** synchronously as allocf(ud, nsize) immediately before each internal
** Uint8Array allocation of nsize bytes, charged at the full new size
** (including growth reallocations). Returning normally permits the
** allocation; throwing refuses it.
**
** A refusal behaves like a failing C allocator: inside a protected call the
** enclosing operation aborts with status LUA_ERRMEM and the standard "not
** enough memory" error object. Outside any protected call the hook's own
** exception propagates to the embedder unchanged.
**
** Not charged: the stateless conversions driven by the embedder itself
** (to_luastring and the other defs.js helpers), zero-size allocations, and
** the few internal temporaries whose site has no lua_State at hand (the
** ldump.js writer views, luaO_chunkid's error-name buffers, the browser
** LoadF read buffer, the lua_writestring copy in lbaselib.js). There are no
** free notifications: the JavaScript engine owns the memory, so this is
** accounting, not ownership.
*/

const LUA_ERRMEM = require("./defs.js").thread_status.LUA_ERRMEM;

const lua_alloc = function(L, nsize) {
    const g = L.l_G;
    if (g.allocf === null)
        return;
    try {
        g.allocf(g.allocud, nsize);
    } catch (e) {
        const lj = L.errorJmp;
        if (lj) {
            /* same contract as ldo.luaD_throw(L, LUA_ERRMEM): the enclosing
               protected call reports "not enough memory" */
            lj.status = LUA_ERRMEM;
            throw lj;
        }
        /* no protected caller: the embedder's own exception is the better signal */
        throw e;
    }
};

module.exports = {
    lua_alloc: lua_alloc
};
