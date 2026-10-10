"use strict";

module.exports = function createLfunc(dependencies) {
    const exports = {};

    const {
        constant_types: { LUA_TNIL },
        thread_status: { LUA_OK },
        to_luastring
    } = require('../defs.js');
    const lobject = dependencies.lobject;
    const ldebug  = dependencies.ldebug;
    const ldo     = dependencies.ldo;
    const ltm     = dependencies.ltm;

    class Proto {
        constructor(L) {
            this.id = L.l_G.id_counter++;
            this.k = [];              // constants used by the function
            this.p = [];              // functions defined inside the function
            this.code = [];           // opcodes
            this.cache = null;        // last-created closure with this prototype
            this.lineinfo = [];       // map from opcodes to source lines (debug information)
            this.upvalues = [];       // upvalue information
            this.numparams = 0;       // number of fixed parameters
            this.is_vararg = false;
            this.maxstacksize = 0;    // number of registers needed by this function
            this.locvars = [];        // information about local variables (debug information)
            this.linedefined = 0;     // debug information
            this.lastlinedefined = 0; // debug information
            this.source = null;       // used for debug information
        }
    }

    const luaF_newLclosure = function(L, n) {
        return new lobject.LClosure(L, n);
    };


    const luaF_findupval = function(L, level) {
        return L.stack[level];
    };

    /*
    ** Register the to-be-closed variable at absolute stack index 'level'
    ** (OP_TBC). A false value (nil or false) is accepted and never closed;
    ** anything else needs a '__close' metamethod, checked now so the error
    ** points at the declaration rather than at the scope exit.
    */
    const luaF_newtbcvar = function(L, level) {
        const obj = L.stack[level];
        if (obj.l_isfalse())
            return;
        if (ltm.luaT_gettmbyobj(L, obj, ltm.TMS.TM_CLOSE).ttisnil()) {
            const ci = L.ci;
            const p = ci.func.value.p;  /* only a Lua function has named locals */
            const name = p ? luaF_getlocalname(p, level - ci.l_base + 1, ci.l_savedpc - 1) : null;
            ldebug.luaG_runerror(L, to_luastring("variable '%s' got a non-closable value", true),
                name || to_luastring("?", true));
        }
        L.tbclist.push(level);
    };

    /* true if some to-be-closed variable lives at or above stack index 'level' */
    const luaF_hastbc = function(L, level) {
        const list = L.tbclist;
        return list.length > 0 && list[list.length - 1] >= level;
    };

    /*
    ** Call the '__close' metamethod of 'obj' with the error object 'err'
    ** (nil on a normal exit). The call is not yieldable.
    */
    const callclosemethod = function(L, obj, err) {
        const func = L.top;
        lobject.pushobj2s(L, ltm.luaT_gettmbyobj(L, obj, ltm.TMS.TM_CLOSE));
        lobject.pushobj2s(L, obj);
        lobject.pushobj2s(L, err);
        ldo.luaD_callnoyield(L, func, 0);
    };

    /*
    ** Close every upvalue and to-be-closed variable from stack index 'level'
    ** up. 'status' is LUA_OK on a normal exit; otherwise the error object is
    ** on top of the stack and every closer receives it. An error inside a
    ** closer propagates, and the closers still pending run when the error
    ** unwinds to its protected call.
    */
    const luaF_close = function(L, level, status = LUA_OK) {
        /* Create new TValues on stack;
         * any closures will keep referencing old TValues */
        for (let i=level; i<L.top; i++) {
            let old = L.stack[i];
            L.stack[i] = new lobject.TValue(old.type, old.value);
        }
        const list = L.tbclist;
        while (list.length > 0 && list[list.length - 1] >= level) {
            const obj = L.stack[list.pop()];
            const err = status === LUA_OK ? new lobject.TValue(LUA_TNIL, null) : L.stack[L.top - 1];
            callclosemethod(L, obj, err);
        }
    };

    /*
    ** fill a closure with new upvalues
    */
    const luaF_initupvals = function(L, cl) {
        for (let i = 0; i < cl.nupvalues; i++)
            cl.upvals[i] = new lobject.TValue(LUA_TNIL, null);
    };

    /*
    ** Look for n-th local variable at line 'line' in function 'func'.
    ** Returns null if not found.
    */
    const luaF_getlocalname = function(f, local_number, pc) {
        for (let i = 0; i < f.locvars.length && f.locvars[i].startpc <= pc; i++) {
            if (pc < f.locvars[i].endpc) {  /* is variable active? */
                local_number--;
                if (local_number === 0)
                    return f.locvars[i].varname.getstr();
            }
        }
        return null;  /* not found */
    };

    exports.MAXUPVAL          = 255;
    exports.Proto             = Proto;
    exports.luaF_findupval    = luaF_findupval;
    exports.luaF_close        = luaF_close;
    exports.luaF_hastbc       = luaF_hastbc;
    exports.luaF_newtbcvar    = luaF_newtbcvar;
    exports.luaF_getlocalname = luaF_getlocalname;
    exports.luaF_initupvals   = luaF_initupvals;
    exports.luaF_newLclosure  = luaF_newLclosure;

    return exports;
};
