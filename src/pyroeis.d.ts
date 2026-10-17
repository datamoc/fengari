/**
 * Type declarations for @datamoc/pyroeis.
 *
 * The high-level API (PyroeisVm and its helpers) is fully typed. The C-API
 * namespaces (`lua`, `lauxlib`, `lualib`, `luaconf`) and the string helpers are
 * typed loosely as `any` for now.
 */

/** A Lua value as read by the host (nil is `null`; integers beyond 2^53 are `bigint`). */
export type LuaValue =
    | null
    | undefined
    | boolean
    | number
    | bigint
    | string
    | Uint8Array
    | LuaFloat
    | Userdata
    | LuaRef
    | Map<LuaValue, LuaValue>
    | LuaValue[]
    | { [key: string]: LuaValue };

/** Multiple return values from a host function. */
export class Multi {
    constructor(values: unknown[]);
    values: unknown[];
}

/**
 * Returned by a host function: suspends the calling coroutine and hands it `values`.
 * On resumption, the `resume` arguments become the return values of the host function.
 */
export class Yield extends Multi {}

/** Number pushed as a Lua float (JavaScript does not tell 5 from 5.0). */
export class LuaFloat {
    constructor(value: number | string);
    value: number;
    valueOf(): number;
}

/** Opaque host value, pushed as Lua light userdata. */
export class Userdata {
    constructor(value: unknown);
    value: unknown;
}

/** A Lua error, with the traceback produced by the VM. */
export class LuaError extends Error {
    constructor(message: string, traceback?: string);
    traceback: string | undefined;
}

/** A script exceeded one of the `limits` of the VM. */
export class LimitError extends LuaError {
    constructor(limit: LimitName, message: string, traceback?: string);
    limit: LimitName;
}

export type LimitName = 'instructions' | 'time' | 'memory' | 'coroutines' | 'tables' | 'closures';

/** The Lua types a LuaRef can designate (tables are always converted to JavaScript values). */
export type LuaRefType = 'function' | 'thread' | 'userdata';

/** Reference to a Lua value with no JavaScript equivalent (function, thread, userdata). */
export class LuaRef {
    constructor(vm: PyroeisVm, id: number | null, type: LuaRefType);
    vm: PyroeisVm;
    id: number | null;
    type: LuaRefType;
    /** For a full userdata: its host-side content. */
    readonly value: unknown;
    /** Calls the referenced function; returns its first return value. */
    call(...args: unknown[]): LuaValue;
    /** Releases the reference (automatic when the object is collected). */
    release(): void;
}

export interface CoroutineResult {
    /** True when the coroutine body finished (`values` are its returns), false if it yielded. */
    done: boolean;
    values: LuaValue[];
}

/** Lua coroutine driven from the host (created by `PyroeisVm#coroutine`). */
export class Coroutine {
    constructor(vm: PyroeisVm, thread: unknown);
    vm: PyroeisVm;
    thread: any;
    active: boolean;
    readonly status: 'suspended' | 'running' | 'dead';
    /** Starts or resumes the coroutine. Throws LuaError if it fails. */
    resume(...args: unknown[]): CoroutineResult;
    /** Closes the coroutine (runs pending `<close>` variables). */
    close(): void;
}

/** Host file access for `__fs_read` / `__fs_list` (unavailable with `sandbox`). */
export interface FileProvider {
    read(path: string): string | Uint8Array | null | undefined;
    list(path: string): string[] | null | undefined;
}

export interface VmLimits {
    /** Lua instructions per top-level call (approximate). */
    instructions?: number;
    /** Real duration in milliseconds, host JavaScript included. */
    timeMs?: number;
    /** Maximum size in bytes of one internal allocation (catchable "not enough memory"). */
    allocation?: number;
    /** Total bytes allocated per top-level call. */
    totalAllocation?: number;
    /** Coroutines created per top-level call (`coroutine.create`, `coroutine.wrap`), not live ones. Uncatchable once exceeded. */
    coroutines?: number;
    /** Tables created per top-level call (not live ones; about 0.7 KiB each when empty). Uncatchable once exceeded. */
    tables?: number;
    /** Lua closures created per top-level call (not live ones). Uncatchable once exceeded. */
    closures?: number;
}

export interface PyroeisVmOptions {
    /** Libraries to open among base, coroutine, table, string, utf8, math, os, debug, package, io, pyroeis. Default: all. */
    libs?: string[];
    /** Dotted paths of globals to remove after opening (e.g. `['load', 'os.execute']`). */
    remove?: string[];
    /** Preset for untrusted code: no os, io, debug, package or require; text-only `load`. */
    sandbox?: boolean;
    /** Budget per top-level call, reset at every call. */
    limits?: VmLimits;
    /**
     * What `print` does. `'buffer'` (default) collects the lines in `vm.output`; `'native'` keeps
     * the print of the base library; `false` removes it.
     */
    print?: 'buffer' | 'native' | false;
    /** Read Lua floats with an integral value as `LuaFloat` instead of numbers. */
    preserveFloats?: boolean;
}

/** Options of `PyroeisVm.toJs` / `lua2js`. */
export interface LuaToJsOptions {
    /** `esm` adds an `export { ... }`, `cjs` a `module.exports = { ... }`. Default: `none`. */
    format?: 'none' | 'esm' | 'cjs';
    /** Prepend the "Translated from Lua" header comment. Default: true. */
    header?: boolean;
    /**
     * Translate `a or b` to `a ?? b` even when `a` may be `false` (shorter, but `false or b`
     * yields `false` instead of `b`). Default: false, which keeps Lua's truth semantics exactly.
     */
    nullishOr?: boolean;
}

export interface LuaToJsWarning {
    line: number;
    message: string;
    /**
     * Set when the construct reaches the JavaScript environment or its prototypes (`eval`, `Function`,
     * `globalThis`, `t.__proto__`, `t.constructor`...). Do not run the translation of untrusted Lua.
     */
    unsafe?: boolean;
}

export interface LuaToJsResult {
    code: string;
    /** Constructs that need a human review; each is also marked `TODO(lua2js)` in `code`. */
    warnings: LuaToJsWarning[];
    /** Names exported by the translated code (global functions and variables). */
    exports: string[];
    /** Globals the translated code reads but does not define: the host must provide them. */
    freeGlobals: string[];
}

/** Callable returned by `PyroeisVm#compile`. */
export interface CompiledFunction {
    (...args: unknown[]): LuaValue;
    /** True when the function was compiled to JavaScript (otherwise the interpreter is used). */
    readonly compiled: boolean;
    /** The generated JavaScript, or null. */
    readonly source: string | null;
    /** Why the function was not compiled, or null. */
    readonly reason: string | null;
    release(): void;
}

export class PyroeisVm {
    constructor(files?: FileProvider, seed?: number, options?: PyroeisVmOptions);

    /** Lines printed by Lua's `print`. */
    output: string[];
    state: any;
    lua: any;
    lauxlib: any;
    lualib: any;
    to_jsstring: (value: any) => string;
    to_luastring: (value: string) => any;
    /** The limit that stopped the current call ('instructions', 'time', 'memory', 'coroutines', 'tables', 'closures'), or null. */
    limitHit: LimitName | null;

    /** Pushes a strictly JSON value (numbers are Lua floats); anything else is a TypeError, nesting beyond `maxDepth` (default 20) a RangeError. */
    pushJson(value: unknown, L?: any, maxDepth?: number): void;
    /** Reads the Lua value at `index` as strictly JSON (tables become plain objects, or arrays with `arrays`); anything else is an Error and no Lua reference is created. */
    readJson(index: number, options?: { L?: any; maxDepth?: number; arrays?: boolean }): unknown;

    /** Installs, replaces or removes (`null`) the execution limits. */
    setLimits(limits: VmLimits | null | undefined): void;
    /** Registers a JavaScript function under a (dotted) global name. */
    defineFunction(name: string, fn: (...args: any[]) => unknown): void;

    /** Runs Lua code and returns its first return value. */
    run(source: string, chunkName?: string): LuaValue;
    /** Runs Lua code and returns all its return values. */
    runMulti(source: string, chunkName?: string): LuaValue[];
    /** Calls a global Lua function by its dotted path. */
    call(path: string, ...args: unknown[]): LuaValue;
    callMulti(path: string, ...args: unknown[]): LuaValue[];
    /** Calls a Lua function held by a LuaRef. */
    callRef(ref: LuaRef, ...args: unknown[]): LuaValue;

    /** Pushes onto `L` the value designated by a dotted path of globals (nil if absent). */
    pushPath(L: any, path: string): void;
    /**
     * Like `pushPath`, but runs the lookup in a protected call under the limits (a global lookup
     * can run an `__index` metamethod). Throws a LuaError / LimitError and restores the stack on failure.
     */
    resolvePath(L: any, path: string): void;
    /**
     * Throws a LimitError (after restoring `L` to stack height `base`) if a limit was exceeded
     * since the current budget was armed, even when the script caught the failure. Call it after
     * your own entry points into Lua; `run`, `call`, `callRef`, `resume` and `protect` already do.
     */
    failIfLimitHit(L: any, base: number): void;
    /**
     * Classifies the keys of the table at stack index `table` of `L`: `array` (keys 1..n),
     * `object` (string keys, or integer keys that are not a sequence) or `map` (keys that
     * JavaScript objects cannot hold, or a numeric string colliding with an integer key).
     * Leaves the stack unchanged.
     */
    classifyKeys(L: any, table: number): 'array' | 'object' | 'map';
    /** Next number of the VM's seeded generator, in [0, 1) (what `math.random` uses). */
    nextRandom(): number;
    /** Pushes a JavaScript value onto the Lua stack. */
    push(value: unknown, L?: any, depth?: number): void;
    /** Reads the Lua value at a stack index. */
    read(index: number, depth?: number, L?: any, seen?: Map<unknown, unknown>): LuaValue;
    /** Message of the Lua error value at a stack index. */
    errorMessage(L: any, index: number): string;
    /** Builds the JavaScript error for a Lua failure: a LimitError if a limit was exceeded. */
    luaError(message: string, traceback?: string): LuaError;
    /**
     * Throws the Lua error value at `index` of stack `L` as a LuaError (a LimitError if a limit
     * was exceeded), with the message as traceback. The stack is left untouched.
     */
    throwLuaError(L: any, index?: number): never;
    /**
     * Runs the host callback `fn(L)` inside a Lua protected call: Lua errors raised while it
     * uses the C API are thrown as a LuaError (a LimitError after a limit overrun) and the Lua
     * stack is restored. A JavaScript error thrown by `fn` is rethrown unchanged.
     */
    protect<T>(fn: (L: any) => T): T;
    /** Runs `fn` (a call into Lua) with a fresh budget when it is a top-level call. */
    guarded<T>(fn: () => T): T;

    /** Creates a host-driven coroutine from a global function path or a function reference. */
    coroutine(target: string | LuaRef): Coroutine;
    /** Creates a coroutine whose body is the chunk `source`. */
    coroutineFromSource(source: string, chunkName?: string): Coroutine;

    /** Compiles a pure numeric Lua function to JavaScript where supported. */
    compile(target: string | LuaRef): CompiledFunction;

    /**
     * Translates Lua source to readable JavaScript without running it.
     * @throws if the source has a syntax error (message starts with `line N:`).
     */
    static toJs(source: string, options?: LuaToJsOptions): LuaToJsResult;
}

/* C API namespaces and string helpers: loosely typed. */
export const lua: any;
export const lauxlib: any;
export const lualib: any;
export const luaconf: any;
export const to_luastring: (value: string) => any;
export const to_jsstring: (value: any) => string;
export const to_uristring: (value: any) => string;
export const from_userstring: (value: any) => any;
export const is_luastring: (value: any) => boolean;
export const luastring_eq: (a: any, b: any) => boolean;
export const luastring_from: (value: any) => any;
export const luastring_indexOf: (value: any, search: any, from?: number) => number;
export const luastring_of: (...values: number[]) => any;
export const PYROEIS_AUTHORS: string;
export const PYROEIS_COPYRIGHT: string;
export const PYROEIS_RELEASE: string;
export const PYROEIS_VERSION: string;
export const PYROEIS_VERSION_MAJOR: string;
export const PYROEIS_VERSION_MINOR: string;
export const PYROEIS_VERSION_NUM: number;
export const PYROEIS_VERSION_RELEASE: string;
