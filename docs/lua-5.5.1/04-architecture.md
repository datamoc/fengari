# Porting architecture

This document describes a proposed architecture. Choices not yet validated are
tracked in [Decisions](07-decisions.md). The semantic target remains the one of
the [requirements](03-exigences.md), whatever the internal representation chosen.

## Module boundaries

Keep the core factories under `src/runtime/` and their composition in
`src/runtime.js`. Existing facades keep their compatibility role. A factory
receives the collaborators it needs; it must not import another core facade to
retrieve them.

The expected execution path is:

```text
Lua text → lexer → parser and lexical resolution → 5.5.1 code generator
         → 5.5.1 prototype → VM → calls, closings, GC, libraries

5.5.1 binary chunk → validating reader → 5.5.1 prototype → same VM
5.5.1 prototype → 5.5.1 writer → binary chunk compatible with its profile
```

Both paths must share the prototype, value, instruction and debug-info
structures. Changing a version number in `src/lbytecode.js` performs none of
these transformations.

## Map of the code to change

| Subsystem | Repository files | Porting work |
| --- | --- | --- |
| Definitions and configuration | `src/defs.js`, `src/luaconf-base.js`, `src/luaconf.js`, `src/llimits.js` | Constants, profiles, limits, formats and published version |
| Lexer | `src/runtime/llex.js`, `src/ljstype.js`, `src/lzio.js` | Global keyword, attributes handled in the parser, exact number/string reading |
| Resolution and grammar | `src/runtime/lparser.js` | Global/local, readonly, close, varargs, scopes and diagnostics |
| Code and instructions | `src/runtime/lcode.js`, `src/lopcodes.js` | New encoding, operations and metadata; check the whole upstream header |
| Values and functions | `src/runtime/lobject.js`, `src/runtime/lfunc.js`, `src/tvalue.js` | Numeric representation, userdata, prototypes, varargs, captures and roots |
| Execution | `src/runtime/lvm.js`, `src/runtime/ldo.js`, `src/runtime/ltm.js` | 5.5 instructions, coercions, calls/yields, closings, metamethods and errors |
| State and stack | `src/runtime/lstate.js`, `src/runtime/lapi.js` | Resources to close, coroutine state, registry, callbacks and host API |
| Debug | `src/runtime/ldebug.js`, `src/ldblib.js` | Lines, optimized locals/constants, named varargs and indexed user values |
| Tables and strings | `src/runtime/ltable.js`, `src/lstring.js` | Seeded hashing, storage, equality and links with the GC |
| Memory | Proposed new component `src/runtime/lgc.js` | Lua tracing, live objects, weak tables, finalization and GC modes |
| Binary | `src/ldump.js`, `src/runtime/lundump.js`, `src/lbytecode.js` | Real 5.5.1 format, validation, serialization and writer protocol |
| Public API | `src/lua.js`, `src/lauxlib.js`, `src/lapi-ext.js` | New signatures, constants, aliases and JS adapters |
| Libraries | `src/l*lib.js`, `src/loadlib.js`, `src/runtime/loadlib.js` | Audit of every symbol, not only the new functions |
| Composition | `src/runtime.js`, `src/library-runtime.js`, `src/lualib-constants.js` | New components without cycles, masks and selective loading |
| JS integration | `src/fengari-vm.js`, `src/fengaricore.js`, `src/fengari.js` | Safe conversions, references, resources and errors |

Paths to future files are proposals, not existing files.

## Numeric profile

The current configuration uses 32-bit integers. Lua allows configured numeric
profiles: this fact alone does not prove a language non-conformance. It
nevertheless prevents comparing without adaptation against a distribution
configured with 64-bit integers, and it affects `string.pack`, bounds,
operations and chunks.

Proposal to reach the usual profile: signed 64-bit integers via `BigInt`,
floats via `Number`, a distinct tag in `TValue`, explicit normalization modulo
2^64 and signed conversion. Audit the whole set of JS bitwise operations, `| 0`,
hashing, table keys, constants and mixed conversions.

Do not silently convert a large-magnitude integer to `Number` in the host API.
Define `BigInt` returns, explicit conversions and precision-loss errors. Also
test NaN, infinities, signed zero, integer division, modulo, bounds, text
conversion and the decimal representation of floats.

If a 32-bit profile is kept, name it and compile a Lua 5.5.1 oracle with the
same profile. It does not replace a decision on the target distribution profile.

## Deterministic closing

Add to states and frames the information needed to find the slots marked to
close. Compiler-generated block exits and stack reductions through the API must
use a shared mechanism.

Audit together return, tailcall, goto, break, error unwinding, `lua_settop`,
`lua_closeslot`, `lua_closethread`, `lua_close` and explicit coroutine closing.
Do not run a `__close` twice after an error or a reentrancy. Keep the correct
error object and close the remaining resources if a handler fails.

## Memory and finalization

The JavaScript GC can handle the physical memory of the port, but it does not by
itself provide the observable contracts of `collectgarbage`, weak tables,
ephemerons or `__gc`. `WeakRef` and `FinalizationRegistry` are not proof of
conformance of these mechanisms.

Proposal: a logical Lua heap tracked by the engine. Define the roots (stacks,
registry, threads, closures, userdata, prototypes, libraries, host references),
marking, resurrection and finalization lists. JS references that must keep a Lua
object alive have an explicit retain/release contract. Lua cycles and ephemerons
require dedicated handling.

GC modes and parameters are not dummy values. Exact thresholds and step costs
may vary per implementation; the behaviors prescribed by the manual must be
testable. Array compactness optimization comes after the lifetime and release
guarantees.

## Host and API

The JS API must specify how it represents out-parameters, pointers, allocators,
userdata, external strings, continuation contexts and C functions. Each
adaptation is linked to an official entry. A native C ABI requires a native or
WebAssembly component; a JS object bearing the same name does not provide it.

For Node, file/process/locale services are provided by tested adapters. For the
browser, define host capabilities and a file system strategy; do not consider an
absent library as implemented. Browser profile limitations stay explicit in the
conformance matrix.

## Bytecode migration

Port from the 5.5.1 archive the instructions, field sizes, flags, mode tables
and prototype structures. Update emission, execution, reading and writing as one
coherent unit. Check the new closing, varargs and global declaration
instructions in `lopcodes.h`.

The reader explicitly rejects incompatible versions and profiles; it must not
requalify 5.3 data as 5.5. Previously saved data requires recompilation from
text or a separate conversion tool.
