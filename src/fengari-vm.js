"use strict";

const { lauxlib, lua, lualib, to_jsstring, to_luastring } = require('./library-runtime.js').fengari;
const { transpile } = require('./ltranspile.js');
const { compileNumeric, FALLBACK, MIN_SAFE: NUMERIC_MIN, MAX_SAFE: NUMERIC_MAX } = require('./lnumeric.js');

const MAX_DEPTH = 128;
const LIMIT_KEYS = ['instructions', 'timeMs', 'allocation', 'totalAllocation'];
const INTERRUPT_STEPS = 65536; /* pattern-matching steps between two calls to the interrupt point */
const HOOK_GRANULARITY = 1000; /* Lua instructions between two limit checks */
const now = () => (typeof performance === 'object' ? performance.now() : Date.now());
const INTEGER_KEY = /^-?\d+$/;
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Multiple return values from a host function.
 */
class Multi {
    constructor(values) {
        this.values = values;
    }
}

/**
 * Number to push as a Lua float (JavaScript does not tell 5 apart from 5.0).
 * With the `preserveFloats` option, Lua floats with an integral value are read in this form.
 */
class LuaFloat {
    constructor(value) {
        this.value = Number(value);
    }

    valueOf() {
        return this.value;
    }
}

/**
 * Opaque host value, pushed as Lua light userdata (and read as such).
 * Lua can only store it, compare it and pass it back to the host.
 */
class Userdata {
    constructor(value) {
        this.value = value;
    }
}

/**
 * Returned by a host function: suspends the calling coroutine and hands it
 * `values`. On resumption, the `resume` arguments become the return values of
 * the host function.
 */
class Yield extends Multi {}

/**
 * Tolerant JSON.stringify for messages: BigInt, Lua references and cycles do not fail it.
 */
function describe(value) {
    const seen = new WeakSet();
    try {
        return JSON.stringify(value, (key, entry) => {
            if (typeof entry === 'bigint') return String(entry);
            if (entry instanceof LuaFloat) return entry.value;
            if (entry instanceof LuaRef) return `<${entry.type}>`;
            if (entry instanceof Userdata) return '<userdata>';
            if (entry instanceof Uint8Array) return `<bytes:${entry.length}>`;
            if (entry instanceof Map) return Array.from(entry);
            if (entry && typeof entry === 'object') {
                if (seen.has(entry)) return '<cycle>';
                seen.add(entry);
            }
            return entry;
        });
    } catch {
        return String(value);
    }
}

/**
 * Lua error with traceback.
 */
class LuaError extends Error {
    constructor(message, traceback) {
        super(message);
        this.name = 'LuaError';
        this.traceback = traceback;
    }
}

/**
 * A script exceeded its instruction or time limit (see the `limits` option).
 * `limit` is 'instructions', 'time' or 'memory'.
 */
class LimitError extends LuaError {
    constructor(limit, message, traceback) {
        super(message, traceback);
        this.name = 'LimitError';
        this.limit = limit;
    }
}

/**
 * Reference to a Lua value that has no JavaScript equivalent
 * (function or thread), anchored in the Lua registry.
 */
class LuaRef {
    constructor(vm, id, type) {
        this.vm = vm;
        this.id = id;
        this.type = type;
        vm.refRegistry?.register(this, { state: vm.state, id }, this);
    }

    /** For a full userdata: its host-side content (undefined for the other types). */
    get value() {
        if (this.type !== 'userdata' || this.id === null) return undefined;
        const { lua, state } = this.vm;
        lua.lua_rawgeti(state, lua.LUA_REGISTRYINDEX, this.id);
        const value = lua.lua_touserdata(state, -1);
        lua.lua_pop(state, 1);
        return value;
    }

    /** Calls the referenced function; returns its first return value. */
    call(...args) {
        return this.vm.callRef(this, ...args);
    }

    /** Releases the reference (automatic when the object is collected). */
    release() {
        if (this.id === null) return;
        this.vm.refRegistry?.unregister(this);
        this.vm.lauxlib.luaL_unref(this.vm.state, this.vm.lua.LUA_REGISTRYINDEX, this.id);
        this.id = null;
    }
}

/**
 * Lua coroutine driven from the host (created by FengariVm#coroutine).
 */
class Coroutine {
    constructor(vm, thread) {
        this.vm = vm;
        this.thread = thread;
        this.active = false;
    }

    /** 'suspended' | 'running' | 'dead' */
    get status() {
        const { lua } = this.vm;
        if (this.active) return 'running';
        const status = lua.lua_status(this.thread);
        if (status === lua.LUA_YIELD) return 'suspended';
        if (status === lua.LUA_OK && lua.lua_gettop(this.thread) > 0) return 'suspended'; /* not started yet */
        return 'dead';
    }

    /**
     * Starts or resumes the coroutine with `args`.
     * @returns {{done: boolean, values: Array}} `done` is true when the coroutine
     *   body finished (`values` = its returns), false if it yielded (`values` = yielded values).
     * @throws {LuaError} if the coroutine fails; it is then dead (see `close`).
     */
    resume(...args) {
        const vm = this.vm;
        const { lua, lauxlib } = vm;
        const T = this.thread;
        const status = this.status;
        if (status !== 'suspended') throw new LuaError(`cannot resume ${status} coroutine`, `cannot resume ${status} coroutine`);
        lua.lua_checkstack(T, args.length + 1);
        for (const arg of args) vm.push(arg, T);
        this.active = true;
        let result;
        try {
            result = vm.guarded(() => lua.lua_resume(T, vm.thread ?? vm.state, args.length));
        } finally {
            this.active = false;
        }
        if (result === lua.LUA_OK || result === lua.LUA_YIELD) {
            vm.failIfLimitHit(T, 0);
            const values = [];
            const count = lua.lua_gettop(T);
            for (let index = 1; index <= count; index++) values.push(vm.read(index, 0, T));
            lua.lua_settop(T, 0);
            return { done: result === lua.LUA_OK, values };
        }
        const message = vm.errorMessage(T, -1);
        lauxlib.luaL_traceback(vm.state, T, to_luastring(message), 0);
        const trace = to_jsstring(lua.lua_tostring(vm.state, -1));
        lua.lua_pop(vm.state, 1);
        lua.lua_settop(T, 0);
        throw vm.luaError(message, trace);
    }

    /**
     * Closes the coroutine (runs the pending `<close>` variables); it becomes dead.
     * @throws {LuaError} if a closing fails.
     */
    close() {
        const vm = this.vm;
        if (this.active) throw new LuaError('cannot close a running coroutine', 'cannot close a running coroutine');
        const status = vm.guarded(() => vm.lua.lua_closethread(this.thread, vm.state));
        try {
            if (status !== vm.lua.LUA_OK) vm.throwLuaError(this.thread);
            vm.failIfLimitHit(this.thread, 0);
        } finally {
            vm.lua.lua_settop(this.thread, 0);
        }
    }
}

/* `sandbox` preset: libraries without access to the system, debugging or modules. */
const SANDBOX_LIBS = ['base', 'coroutine', 'table', 'string', 'utf8', 'math'];
const SANDBOX_FORBIDDEN_LIBS = ['os', 'io', 'debug', 'package'];
const SANDBOX_REMOVE = ['dofile', 'loadfile', 'string.dump'];
/* `load` must never accept bytecode (a forged binary chunk can corrupt the VM); `...` keeps the absence of `env`. */
const SANDBOX_TEXT_ONLY_LOAD = `local load = load
function _G.load(chunk, chunkname, mode, ...) return load(chunk, chunkname, 't', ...) end`;

/* Libraries selectable via the `libs` option (name → global table name). */
const LIBRARIES = {
    base: '_G', coroutine: 'coroutine', table: 'table', string: 'string', utf8: 'utf8',
    math: 'math', os: 'os', debug: 'debug', package: 'package', io: 'io', fengari: 'fengari'
};

/**
 * A persistent Lua virtual machine for Fengari.
 * Keeps state between evaluations and exposes JavaScript objects to Lua.
 */
class FengariVm {
    /**
   * Creates a new Lua virtual machine.
   * @param {Object} files - An object to read Lua files (optional).
   * @param {number} seed - A seed for the random generator (optional).
   * @param {Object} options - Options (optional).
   * @param {string[]} [options.libs] - Libraries to open among base, coroutine, table, string,
   *   utf8, math, os, debug, package, io, fengari. Default: all (luaL_openlibs).
   * @param {string[]} [options.remove] - Dotted paths of globals to remove after
   *   opening (e.g. ['load', 'dofile', 'os.execute']).
   * @param {boolean} [options.sandbox] - Preset for untrusted Lua code: only base,
   *   coroutine, table, string, utf8 and math; no os, io, debug, package nor require; dofile,
   *   loadfile and string.dump removed; load only accepts text. `libs` can restrict
   *   further but cannot add os, io, debug or package; `remove` is added on top. `__fs_read` and
   *   `__fs_list` (which serve `files`) are not defined: the script has no access to the host
   *   files. Limits neither time nor memory (see `limits`); the functions you
   *   define with `defineFunction` remain callable by the script.
   * @param {Object} [options.limits] - Budget per top-level call (run, call, callRef, Coroutine#resume),
   *   reset at every call. `instructions`: number of Lua instructions (approximate, checked at
   *   most every 1000 instructions, and 65536 pattern-matching steps count as 65536
   *   instructions); `timeMs`: real duration in ms, host JS included; `allocation`: maximum
   *   size in bytes of an internal string or buffer allocation ("not enough memory", catchable);
   *   `totalAllocation`: total of bytes allocated per call. An instruction, time
   *   or total overrun raises a LimitError and cannot be caught by the script (pcall included).
   *   Only acts on the VM created here: a script with `debug.sethook` can remove the
   *   hook, so combine with `sandbox`. See also setLimits.
   * @param {'buffer'|'native'|false} [options.print] - What `print` does. 'buffer' (default):
   *   replaced by a host function that collects the lines in `vm.output`. 'native': the print of
   *   the base library is kept (the host does not need to re-open libraries to get it). false:
   *   `print` is removed.
   * @param {boolean} [options.preserveFloats] - Read Lua floats with an integral value (5.0)
   *   as LuaFloat rather than as numbers (5). Default: false.
   */
    constructor(files = { read: () => null, list: () => null }, seed = 0x57e5a07, options = {}) {
        this.files = files;
        this.randomState = seed >>> 0;
        this.state = lauxlib.luaL_newstate();
        this.refRegistry = typeof FinalizationRegistry === 'function'
            ? new FinalizationRegistry(({ state, id }) => lauxlib.luaL_unref(state, lua.LUA_REGISTRYINDEX, id))
            : null;
        this.output = []; // Messages printed by Lua (print, wesnoth.log).
        this.thread = null; // Coroutine from which a host function is called.
        this.lua = lua;
        this.lauxlib = lauxlib;
        this.lualib = lualib;
        this.to_jsstring = to_jsstring;
        this.to_luastring = to_luastring;

        this.preserveFloats = options.preserveFloats === true;
        this.limits = null;
        this.limitDepth = 0; /* nested top-level calls in progress */
        this.limitHit = null; /* 'instructions' or 'time' once the limit is exceeded */
        this.limitedThreads = new Set(); /* threads switched to "one check per instruction" mode */
        const sandbox = options.sandbox === true;
        const libs = options.libs ?? (sandbox ? SANDBOX_LIBS : undefined);
        if (sandbox) {
            const forbidden = (libs ?? []).filter((name) => SANDBOX_FORBIDDEN_LIBS.includes(name));
            if (forbidden.length > 0) throw new Error(`Library not allowed in a sandbox: ${forbidden.join(', ')}`);
        }
        this.openLibraries(libs);
        if (sandbox && libs.includes('base')) this.run(SANDBOX_TEXT_ONLY_LOAD, '=sandbox'); /* avant les retraits : `remove` peut viser `load` */
        for (const path of [...(sandbox ? SANDBOX_REMOVE : []), ...(options.remove ?? [])]) this.removeGlobal(path);

        // Define the basic host functions
        const printMode = options.print ?? 'buffer';
        if (!['buffer', 'native', false].includes(printMode)) throw new RangeError(`options.print must be 'buffer', 'native' or false, not ${describe(printMode)}`);
        if (printMode === 'buffer') {
            this.defineFunction('print', (...args) => {
                this.output.push(args.map((value) => (typeof value === 'string' ? value : describe(value))).join('\t'));
            });
        } else if (printMode === false) {
            this.removeGlobal('print');
        }

        /* Host helpers: a sandboxed script must not see any of them as a global. */
        if (!sandbox) {
            this.defineFunction('__random', () => this.nextRandom());
            this.defineFunction('__fs_read', (path) => this.files.read(String(path)));
            this.defineFunction('__fs_list', (path) => this.files.list(String(path)));
        }

        if (options.limits) this.setLimits(options.limits);
    }

    /**
   * Installs, replaces or removes (`null`) the execution limits (see the `limits` option).
   * Existing threads keep the old hook: call before creating coroutines.
   */
    setLimits(limits) {
        const { lua } = this;
        this.limitHit = null;
        if (limits === null || limits === undefined) {
            this.limits = null;
            lua.lua_sethook(this.state, null, 0, 0);
            this.state.l_G.interrupt = null;
            lua.lua_setallocf(this.state, null, null);
            return;
        }
        for (const key of LIMIT_KEYS) {
            if (limits[key] !== undefined && !(limits[key] > 0)) throw new RangeError(`limits.${key} must be a positive number`);
        }
        if (LIMIT_KEYS.every((key) => limits[key] === undefined)) throw new RangeError(`limits needs at least one of ${LIMIT_KEYS.join(', ')}`);
        this.limits = Object.fromEntries(LIMIT_KEYS.map((key) => [key, limits[key]]));
        this.hookCount = Math.max(1, Math.min(HOOK_GRANULARITY, Math.floor(limits.instructions ?? HOOK_GRANULARITY)));
        this.limitHook = (L) => this.checkLimits(L);
        lua.lua_sethook(this.state, this.limitHook, lua.LUA_MASKCOUNT, this.hookCount);
        /* Native functions (string patterns, allocations) do not go through the counting hook. */
        this.state.l_G.interrupt = (L) => this.checkInterrupt(L);
        lua.lua_setallocf(this.state, (ud, size) => this.checkAllocation(size), null);
    }

    /**
   * Runs `fn` (a call into Lua) with a fresh budget when it is a top-level call.
   */
    guarded(fn) {
        if (this.limits === null) return fn();
        if (this.limitDepth++ === 0) this.armLimits();
        try {
            return fn();
        } finally {
            this.limitDepth--;
        }
    }

    armLimits() {
        this.remaining = this.limits.instructions ?? Infinity;
        this.allocated = 0;
        this.deadline = this.limits.timeMs === undefined ? Infinity : now() + this.limits.timeMs;
        this.limitHit = null;
        for (const thread of this.limitedThreads) this.lua.lua_sethook(thread, this.limitHook, this.lua.LUA_MASKCOUNT, this.hookCount);
        this.limitedThreads.clear();
    }

    /**
   * Counting hook: once the limit is exceeded, it raises an error at every instruction of the
   * current thread, so that a pcall (or a resume) catching it never lets the script continue.
   */
    checkLimits(L) {
        if (this.limitDepth === 0) return;
        if (this.limitHit === null) {
            this.remaining -= this.hookCount;
            if (this.remaining <= 0) this.limitHit = 'instructions';
            else if (now() > this.deadline) this.limitHit = 'time';
        }
        this.raiseIfExceeded(L);
    }

    /**
   * Called every 65536 steps of a `string` pattern match: a single Lua instruction could otherwise
   * run forever (`('a'):rep(20000):find('.-.-.-.-b')`). Each call counts as 65536 instructions.
   */
    checkInterrupt(L) {
        if (this.limitDepth === 0) return;
        if (this.limitHit === null) {
            this.remaining -= INTERRUPT_STEPS;
            if (this.remaining <= 0) this.limitHit = 'instructions';
            else if (now() > this.deadline) this.limitHit = 'time';
        }
        this.raiseIfExceeded(L);
    }

    /**
   * Called before each internal string or buffer allocation (`lua_setallocf`). Throwing refuses
   * the allocation: "not enough memory", which the script can catch. Exceeding the per-call total
   * additionally triggers the 'memory' limit, which is not catchable.
   */
    checkAllocation(size) {
        if (this.limitDepth === 0) return;
        this.allocated += size;
        const overTotal = this.allocated > (this.limits.totalAllocation ?? Infinity);
        if (overTotal) this.limitHit ??= 'memory';
        if (overTotal || size > (this.limits.allocation ?? Infinity)) throw new RangeError('allocation limit exceeded');
    }

    raiseIfExceeded(L) {
        if (this.limitHit === null) return;
        if (L.basehookcount !== 1) {
            this.lua.lua_sethook(L, this.limitHook, this.lua.LUA_MASKCOUNT, 1);
            this.limitedThreads.add(L);
        }
        /* Hooks are cut during a hook: otherwise the message handler of an xpcall
           would run without control and could loop indefinitely. */
        L.allowhook = 1;
        this.lauxlib.luaL_error(L, this.to_luastring(`${this.limitHit} limit exceeded`));
    }

    /**
   * Builds the JavaScript error for a Lua failure: LimitError if a limit was exceeded.
   */
    luaError(message, traceback) {
        return this.limitHit === null ? new LuaError(message, traceback) : new LimitError(this.limitHit, message, traceback);
    }

    /**
   * Throws the Lua error value at `index` of stack `L` as a LuaError (a LimitError if a limit
   * was exceeded), with the message as traceback. The stack is left untouched.
   * @returns {never}
   */
    throwLuaError(L, index = -1) {
        const message = this.errorMessage(L, index);
        throw this.luaError(message, message);
    }

    /**
   * Fails the host operation that just returned if a limit was exceeded while it ran. A script
   * can catch the failure of a coroutine or pcall that hit the limit (and go on, or return a
   * normal-looking result); the overrun must still be reported. Restores `L` to `base` first.
   * @returns {void}
   */
    failIfLimitHit(L, base) {
        if (this.limitHit === null) return;
        this.lua.lua_settop(L, base);
        const message = `${this.limitHit} limit exceeded`;
        throw this.luaError(message, message);
    }

    /**
   * Runs the host callback `fn(L)` inside a Lua protected call, so that Lua errors raised
   * while it uses the C API (an `__index` metamethod that fails, `luaL_error`, a limit
   * overrun...) are reported as a LuaError (a LimitError after an overrun) instead of
   * unwinding through the host code with the Lua stack in an undefined state. Returns what
   * `fn` returns; the stack is restored in every case. A JavaScript error thrown by `fn`
   * itself is rethrown unchanged. Like the other entry points, it gets a fresh limits budget
   * when it is not called from Lua.
   * @template T
   * @param {function(*): T} fn - Receives the Lua state (or coroutine) it runs on.
   * @returns {T}
   */
    protect(fn) {
        const L = this.thread ?? this.state;
        const base = this.lua.lua_gettop(L);
        let result;
        let hostError = null;
        this.lua.lua_pushcfunction(L, (state) => {
            try {
                result = fn(state);
            } catch (error) {
                if (error === state.errorJmp) throw error; /* a Lua error: let the protected call catch it */
                hostError = { error };
                this.lua.lua_pushstring(state, this.to_luastring('host error'));
                return this.lua.lua_error(state);
            }
            return 0;
        });
        const status = this.guarded(() => this.lua.lua_pcall(L, 0, 0, 0));
        try {
            if (hostError !== null) throw hostError.error;
            if (status !== this.lua.LUA_OK) this.throwLuaError(L);
            this.failIfLimitHit(L, base);
            return result;
        } finally {
            this.lua.lua_settop(L, base);
        }
    }

    /**
   * Opens the requested libraries (all if `libs` is absent).
   */
    openLibraries(libs) {
        const L = this.state;
        if (libs === undefined || libs === null) {
            this.lualib.luaL_openlibs(L);
            return;
        }
        for (const name of libs) {
            const open = this.lualib[`luaopen_${name}`];
            if (!Object.hasOwn(LIBRARIES, name) || !open) throw new Error(`Unknown or unavailable Lua library: ${name}`);
            this.lauxlib.luaL_requiref(L, this.to_luastring(LIBRARIES[name]), open, 1);
            this.lua.lua_pop(L, 1);
        }
    }

    /**
   * Sets to nil a global designated by a dotted path (e.g. 'os.execute'). Removing a top-level
   * global also removes it from package.loaded and package.preload.
   */
    removeGlobal(path) {
        const L = this.state;
        const parts = path.split('.');
        const last = parts.pop();
        if (parts.length === 0) {
            this.lua.lua_pushnil(L);
            this.lua.lua_setglobal(L, this.to_luastring(last));
            /* otherwise require('os') or package.loaded.os would grant access again */
            for (const registry of ['package.loaded', 'package.preload']) this.removeGlobal(`${registry}.${last}`);
            return;
        }
        this.pushPath(L, parts.join('.'));
        if (this.lua.lua_istable(L, -1)) {
            this.lua.lua_pushnil(L);
            this.lua.lua_setfield(L, -2, this.to_luastring(last));
        }
        this.lua.lua_pop(L, 1);
    }

    /**
   * Produces a random number (mulberry32, a float in [0, 1)).
   */
    nextRandom() {
        this.randomState = (this.randomState + 0x6d2b79f5) >>> 0;
        let t = this.randomState;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
   * Pushes a JavaScript value onto the Lua stack (that of `L`, the current thread by default).
   * Also accepts LuaFloat, BigInt (64-bit integer), Userdata, JS functions (converted into host
   * functions), LuaRef and Coroutine.
   */
    push(value, L = this.thread ?? this.state, depth = 0) {
        if (depth > MAX_DEPTH) throw new RangeError('Value too deeply nested (cyclic?) to convert to Lua');
        this.lua.lua_checkstack(L, 8);
        if (value === null || value === undefined) {
            this.lua.lua_pushnil(L);
        } else if (typeof value === 'boolean') {
            this.lua.lua_pushboolean(L, value);
        } else if (typeof value === 'number') {
            if (Number.isSafeInteger(value)) this.lua.lua_pushinteger(L, value);
            else this.lua.lua_pushnumber(L, value);
        } else if (typeof value === 'bigint') {
            this.lua.lua_pushinteger(L, BigInt.asIntN(64, value));
        } else if (value instanceof Userdata) {
            this.lua.lua_pushlightuserdata(L, value.value);
        } else if (value instanceof LuaFloat) {
            this.lua.lua_pushnumber(L, value.value);
        } else if (typeof value === 'string') {
            this.lua.lua_pushstring(L, this.to_luastring(value));
        } else if (value instanceof Uint8Array) {
            this.lua.lua_pushstring(L, new Uint8Array(value));
        } else if (typeof value === 'function') {
            this.lua.lua_pushcfunction(L, this.wrap(value));
        } else if (value instanceof LuaRef) {
            if (value.vm !== this) throw new Error('Lua reference belongs to another FengariVm');
            if (value.id === null) throw new Error('Lua reference was released');
            this.lua.lua_rawgeti(L, this.lua.LUA_REGISTRYINDEX, value.id);
        } else if (value instanceof Coroutine) {
            if (value.vm !== this) throw new Error('Coroutine belongs to another FengariVm');
            this.lua.lua_pushthread(value.thread);
            this.lua.lua_xmove(value.thread, L, 1);
        } else if (value instanceof Map) {
            this.lua.lua_createtable(L, 0, value.size);
            for (const [key, entry] of value) {
                if (key === null || key === undefined || Number.isNaN(key)) throw new TypeError('Lua table keys cannot be nil or NaN');
                this.push(key, L, depth + 1);
                this.push(entry, L, depth + 1);
                this.lua.lua_settable(L, -3);
            }
        } else if (Array.isArray(value)) {
            this.lua.lua_createtable(L, value.length, 0);
            value.forEach((entry, index) => {
                this.push(entry, L, depth + 1);
                this.lua.lua_seti(L, -2, index + 1);
            });
        } else {
            this.lua.lua_createtable(L, 0, Object.keys(value).length);
            for (const [key, entry] of Object.entries(value)) {
                this.push(entry, L, depth + 1);
                if (INTEGER_KEY.test(key)) this.lua.lua_seti(L, -2, Number(key));
                else this.lua.lua_setfield(L, -2, this.to_luastring(key));
            }
        }
    }

    /**
   * Reads a Lua value from the stack (that of `L`, the current thread by default) and
   * converts it to JavaScript. Strings → string, or Uint8Array if it is not valid UTF-8.
   * Tables → array (keys 1..n), object (string/integer keys) or Map (boolean, float,
   * table, function, binary string keys, or collision between the string "1" and the integer 1).
   * Functions, threads and userdata → LuaRef (light userdata → Userdata); integers outside ±2^53 → BigInt.
   * Circular references are preserved.
   */
    read(index, depth = 0, L = this.thread ?? this.state, seen = new Map()) {
        if (depth > MAX_DEPTH) throw new RangeError('Lua value too deeply nested to convert to JavaScript');
        const type = this.lua.lua_type(L, index);
        if (type === this.lua.LUA_TBOOLEAN) return this.lua.lua_toboolean(L, index);
        if (type === this.lua.LUA_TNUMBER) {
            if (this.lua.lua_isinteger(L, index)) {
                const integer = this.lua.lua_tointeger(L, index); /* BigInt in the 64-bit build */
                if (typeof integer !== 'bigint') return integer;
                return integer >= MIN_SAFE && integer <= MAX_SAFE ? Number(integer) : integer;
            }
            const number = this.lua.lua_tonumber(L, index);
            if (this.preserveFloats && Number.isInteger(number) && !this.lua.lua_isinteger(L, index)) return new LuaFloat(number);
            return number;
        }
        if (type === this.lua.LUA_TSTRING) return this.readString(L, index);
        if (type === this.lua.LUA_TLIGHTUSERDATA) return new Userdata(this.lua.lua_touserdata(L, index));
        const refTypes = {
            [this.lua.LUA_TFUNCTION]: 'function', [this.lua.LUA_TTHREAD]: 'thread', [this.lua.LUA_TUSERDATA]: 'userdata'
        };
        if (refTypes[type]) {
            this.lua.lua_pushvalue(L, index);
            return new LuaRef(this, this.lauxlib.luaL_ref(L, this.lua.LUA_REGISTRYINDEX), refTypes[type]);
        }
        if (type !== this.lua.LUA_TTABLE) return null;
        this.lua.lua_checkstack(L, 8);
        const pointer = this.lua.lua_topointer(L, index);
        if (seen.has(pointer)) return seen.get(pointer);
        const table = index < 0 ? this.lua.lua_gettop(L) + index + 1 : index;
        const kind = this.classifyKeys(L, table);
        const result = kind === 'array' ? [] : kind === 'map' ? new Map() : {};
        seen.set(pointer, result);
        this.lua.lua_pushnil(L);
        while (this.lua.lua_next(L, table) !== 0) {
            if (kind === 'map') {
                result.set(this.read(-2, depth + 1, L, seen), this.read(-1, depth + 1, L, seen));
            } else if (kind === 'array') {
                result[Number(this.lua.lua_tointeger(L, -2)) - 1] = this.read(-1, depth + 1, L, seen);
            } else {
                const key = this.lua.lua_type(L, -2) === this.lua.LUA_TSTRING
                    ? this.readString(L, -2) : String(this.lua.lua_tointeger(L, -2));
                const entry = this.read(-1, depth + 1, L, seen);
                /* "__proto__" must stay an ordinary key, not change the prototype of the object */
                if (key === '__proto__') Object.defineProperty(result, key, { value: entry, enumerable: true, writable: true, configurable: true });
                else result[key] = entry;
            }
            this.lua.lua_pop(L, 1);
        }
        return result;
    }

    /**
   * Reads a Lua string: a JavaScript string if it is valid UTF-8, otherwise a Uint8Array.
   */
    readString(L, index) {
        const bytes = this.lua.lua_tostring(L, index);
        try {
            return this.to_jsstring(bytes);
        } catch {
            return Uint8Array.from(bytes); /* invalid UTF-8: keep the bytes */
        }
    }

    /**
   * Chooses the JavaScript representation of the table at `table`: 'array' (integer keys 1..n),
   * 'object' (UTF-8 string and integer keys) or 'map' (any other key, or "1" / 1 collision).
   */
    classifyKeys(L, table) {
        const { lua } = this;
        let count = 0;
        let allIntegers = true;
        let min = Infinity;
        let max = -Infinity;
        const integerKeys = new Set();
        const numericStrings = new Set();
        let kind = null;
        lua.lua_pushnil(L);
        while (lua.lua_next(L, table) !== 0) {
            count++;
            const keyType = lua.lua_type(L, -2);
            if (keyType === lua.LUA_TNUMBER && lua.lua_isinteger(L, -2)) {
                const key = lua.lua_tointeger(L, -2);
                integerKeys.add(String(key));
                const asNumber = Number(key);
                min = Math.min(min, asNumber);
                max = Math.max(max, asNumber);
            } else {
                allIntegers = false;
                if (keyType === lua.LUA_TSTRING) {
                    const key = this.readString(L, -2);
                    if (typeof key !== 'string') kind = 'map';
                    else if (INTEGER_KEY.test(key)) numericStrings.add(key);
                } else {
                    kind = 'map';
                }
            }
            lua.lua_pop(L, 1);
        }
        if (kind === 'map') return 'map';
        for (const key of numericStrings) if (integerKeys.has(key)) return 'map';
        return count > 0 && allIntegers && min >= 1 && max === count ? 'array' : 'object';
    }

    /**
   * Message of a Lua error value at the given index.
   */
    errorMessage(L, index) {
        const raw = this.lua.lua_type(L, index) === this.lua.LUA_TSTRING || this.lua.lua_type(L, index) === this.lua.LUA_TNUMBER
            ? this.lua.lua_tostring(L, index) : null;
        if (raw) return this.to_jsstring(raw);
        if (this.lua.lua_istable(L, index)) return `error table ${describe(this.read(index, 0, L))}`;
        return `error object of type ${this.to_jsstring(this.lua.lua_typename(L, this.lua.lua_type(L, index)))}`;
    }

    /**
   * Registers a JavaScript function under a given name (dotted path) in the Lua globals.
   * The function may return `new Yield([...])` to suspend the calling coroutine.
   */
    defineFunction(name, fn) {
        const L = this.state;
        const parts = name.split('.');
        const last = parts.pop();
        if (parts.length === 0) {
            this.lua.lua_pushcfunction(L, this.wrap(fn));
            this.lua.lua_setglobal(L, this.to_luastring(last));
            return;
        }
        this.lua.lua_getglobal(L, this.to_luastring(parts[0]));
        if (this.lua.lua_isnil(L, -1)) {
            this.lua.lua_pop(L, 1);
            this.lua.lua_newtable(L);
            this.lua.lua_pushvalue(L, -1);
            this.lua.lua_setglobal(L, this.to_luastring(parts[0]));
        }
        for (const part of parts.slice(1)) {
            this.lua.lua_getfield(L, -1, this.to_luastring(part));
            if (this.lua.lua_isnil(L, -1)) {
                this.lua.lua_pop(L, 1);
                this.lua.lua_newtable(L);
                this.lua.lua_pushvalue(L, -1);
                this.lua.lua_setfield(L, -3, this.to_luastring(part));
            }
            this.lua.lua_remove(L, -2);
        }
        this.lua.lua_pushcfunction(L, this.wrap(fn));
        this.lua.lua_setfield(L, -2, this.to_luastring(last));
        this.lua.lua_pop(L, 1);
    }

    /**
   * Wraps a JavaScript function so it can be called from Lua.
   */
    wrap(fn) {
        return (L) => {
            const previous = this.thread;
            this.thread = L;
            try {
                const count = this.lua.lua_gettop(L);
                const args = [];
                for (let index = 1; index <= count; index++) args.push(this.read(index));
                let pushed;
                let yielded = false;
                try {
                    const results = fn(...args);
                    if (results === undefined) {
                        pushed = 0;
                    } else if (results instanceof Multi) {
                        for (const value of results.values) this.push(value);
                        pushed = results.values.length;
                        yielded = results instanceof Yield;
                    } else {
                        this.push(results);
                        pushed = 1;
                    }
                } catch (error) {
                    this.lua.lua_settop(L, count);
                    this.lua.lua_pushstring(L, this.to_luastring(error instanceof Error ? error.message : String(error)));
                    return this.lua.lua_error(L);
                }
                return yielded ? this.lua.lua_yield(L, pushed) : pushed;
            } finally {
                this.thread = previous;
            }
        };
    }

    /**
   * Pushes onto `L` the Lua value designated by a dotted path of globals (nil if absent).
   */
    pushPath(L, path) {
        const parts = path.split('.');
        this.lua.lua_getglobal(L, this.to_luastring(parts[0]));
        for (const part of parts.slice(1)) {
            if (!this.lua.lua_istable(L, -1)) {
                this.lua.lua_pop(L, 1);
                this.lua.lua_pushnil(L);
                return;
            }
            this.lua.lua_getfield(L, -1, this.to_luastring(part));
            this.lua.lua_remove(L, -2);
        }
    }

    /**
   * Like `pushPath`, for a path coming from a host call: runs it in a protected call under the
   * limits, because looking up a global can run Lua code (an `__index` metamethod on `_G` or on
   * a library table) that must be neither unbounded nor able to raise outside a protected call.
   * Leaves the value on the stack; on failure restores the stack and throws.
   */
    resolvePath(L, path) {
        const base = this.lua.lua_gettop(L);
        this.lua.lua_pushcfunction(L, (state) => {
            this.pushPath(state, path);
            return 1;
        });
        const status = this.guarded(() => this.lua.lua_pcall(L, 0, 1, 0));
        try {
            if (status !== this.lua.LUA_OK) this.throwLuaError(L);
            this.failIfLimitHit(L, base);
        } catch (error) {
            this.lua.lua_settop(L, base);
            throw error;
        }
    }

    /**
   * Runs Lua code and returns its first return value.
   */
    run(source, chunkName = '=chunk') {
        return this.execute(source, chunkName, false);
    }

    /**
   * Runs Lua code and returns all its return values in an array.
   */
    runMulti(source, chunkName = '=chunk') {
        return this.execute(source, chunkName, true);
    }

    execute(source, chunkName, all) {
        const L = this.state;
        const base = this.lua.lua_gettop(L);
        const handler = this.pushTracebackHandler();
        const bytes = this.to_luastring(source);
        const loaded = this.lauxlib.luaL_loadbuffer(L, bytes, bytes.length, this.to_luastring(chunkName));
        if (loaded !== this.lua.LUA_OK) {
            const message = this.to_jsstring(this.lua.lua_tostring(L, -1));
            this.lua.lua_settop(L, base);
            throw new LuaError(message, message);
        }
        return this.protectedCall(0, base, handler, all);
    }

    /**
   * Calls a global Lua function by its dotted path with JSON arguments.
   */
    call(path, ...args) {
        return this.invoke(path, args, false);
    }

    /**
   * Like `call`, but returns all return values in an array.
   */
    callMulti(path, ...args) {
        return this.invoke(path, args, true);
    }

    /**
     * Offline migration helper: translates Lua source to readable JavaScript
     * without running it. Returns `{ code, warnings, exports, freeGlobals }`;
     * see ltranspile.js for what is translated and what is flagged.
     */
    static toJs(source, options) {
        return transpile(source, options);
    }

    /**
     * Compiles a pure numeric Lua function to JavaScript where supported.
     * The returned callable captures the current function and returns its first
     * result, like callRef. Unsupported code/inputs transparently use the VM.
     * `compiled`, `source` and `reason` describe compilation eligibility.
     */
    compile(target) {
        const L = this.state;
        const base = this.lua.lua_gettop(L);
        let ref, compiled;
        try {
            if (typeof target === 'string') this.resolvePath(L, target);
            else this.push(target, L);
            if (!this.lua.lua_isfunction(L, -1)) throw new TypeError('compile expects a Lua function or its global path');
            const object = L.stack[L.top - 1];
            compiled = object.ttisLclosure() ? compileNumeric(object.value.p)
                : { fn: null, source: null, reason: 'Target is a host function' };
            this.lua.lua_pushvalue(L, -1);
            ref = new LuaRef(this, this.lauxlib.luaL_ref(L, this.lua.LUA_REGISTRYINDEX), 'function');
        } finally {
            this.lua.lua_settop(L, base);
        }
        const callable = (...args) => {
            if (ref.id === null) throw new Error('Compiled function was released');
            if (compiled.fn && !this.limits && !L.hookmask && args.every(arg => typeof arg === 'number' || arg instanceof LuaFloat)) {
                const values = [], types = [];
                for (const arg of args) {
                    values.push(arg instanceof LuaFloat ? arg.value : arg);
                    types.push(!(arg instanceof LuaFloat) && Number.isSafeInteger(arg));
                }
                try {
                    for (let index = 0; index < values.length; index++) {
                        if (types[index] && (values[index] < NUMERIC_MIN || values[index] > NUMERIC_MAX)) throw FALLBACK;
                        if (types[index] && values[index] === 0) values[index] = 0;
                    }
                    const [value, isInteger] = compiled.fn(values, types);
                    if (this.preserveFloats && !isInteger && typeof value === 'number' && Number.isInteger(value)) return new LuaFloat(value);
                    return value === undefined ? null : value;
                } catch (error) {
                    if (error !== FALLBACK) throw error;
                }
            }
            return this.callRef(ref, ...args);
        };
        callable.compiled = compiled.fn !== null;
        callable.source = compiled.source;
        callable.reason = compiled.reason;
        callable.release = () => ref.release();
        return callable;
    }

    invoke(path, args, all) {
        const L = this.state;
        const base = this.lua.lua_gettop(L);
        return this.guarded(() => {
            const handler = this.pushTracebackHandler();
            try {
                this.resolvePath(L, path);
            } catch (error) {
                this.lua.lua_settop(L, base);
                throw error;
            }
            for (const arg of args) this.push(arg, L);
            return this.protectedCall(args.length, base, handler, all);
        });
    }

    /**
   * Calls a Lua function referenced by a LuaRef.
   */
    callRef(ref, ...args) {
        const L = this.state;
        const base = this.lua.lua_gettop(L);
        const handler = this.pushTracebackHandler();
        this.push(ref, L);
        for (const arg of args) this.push(arg, L);
        return this.protectedCall(args.length, base, handler);
    }

    /**
   * Creates a host-driven coroutine (not started).
   * @param {string|LuaRef} target - Dotted path of a global function, or a function LuaRef.
   * @returns {Coroutine}
   */
    coroutine(target) {
        const T = this.lua.lua_newthread(this.state);
        this.lua.lua_pop(this.state, 1); /* the JS Coroutine holds the thread */
        if (typeof target === 'string') this.resolvePath(this.state, target);
        else this.push(target, this.state);
        if (!this.lua.lua_isfunction(this.state, -1)) {
            this.lua.lua_pop(this.state, 1);
            throw new TypeError(`Coroutine target is not a Lua function: ${String(target)}`);
        }
        this.lua.lua_xmove(this.state, T, 1);
        return new Coroutine(this, T);
    }

    /**
   * Creates a coroutine whose body is the Lua chunk `source` (not started).
   * @returns {Coroutine}
   */
    coroutineFromSource(source, chunkName = '=chunk') {
        const T = this.lua.lua_newthread(this.state);
        this.lua.lua_pop(this.state, 1);
        const bytes = this.to_luastring(source);
        if (this.lauxlib.luaL_loadbuffer(T, bytes, bytes.length, this.to_luastring(chunkName)) !== this.lua.LUA_OK) {
            const message = this.to_jsstring(this.lua.lua_tostring(T, -1));
            throw new LuaError(message, message);
        }
        return new Coroutine(this, T);
    }

    /**
   * Calls a Lua function in protected mode.
   */
    protectedCall(argCount, base, handler, all = false) {
        const L = this.state;
        const status = this.guarded(() => this.lua.lua_pcall(L, argCount, all ? this.lua.LUA_MULTRET : 1, handler));
        if (status !== this.lua.LUA_OK) {
            const trace = this.errorMessage(L, -1);
            this.lua.lua_settop(L, base);
            throw this.luaError(trace.split('\n')[0], trace);
        }
        this.failIfLimitHit(L, base);
        let value;
        if (all) {
            value = [];
            for (let index = handler + 1; index <= this.lua.lua_gettop(L); index++) value.push(this.read(index, 0, L));
        } else {
            value = this.read(-1, 0, L);
        }
        this.lua.lua_settop(L, base);
        return value;
    }

    /**
   * Pushes a traceback handler for Lua errors.
   */
    pushTracebackHandler() {
        const L = this.state;
        this.lua.lua_pushcfunction(L, (state) => {
            let message = this.lua.lua_tostring(state, 1);
            if (!message && this.lua.lua_istable(state, 1)) message = this.to_luastring(`error table ${describe(this.read(1, 0, state))}`);
            this.lauxlib.luaL_traceback(state, state, message, 1);
            return 1;
        });
        return this.lua.lua_gettop(L);
    }


}

module.exports = { FengariVm, LuaError, LimitError, Multi, Yield, LuaRef, LuaFloat, Userdata, Coroutine };
