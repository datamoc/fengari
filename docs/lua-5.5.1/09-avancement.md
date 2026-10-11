# Verified progress

State as of October 10, 2026. The goal remains the whole of Lua 5.5.1 described
in this folder. None of the major lots M0–M9 is declared fully complete.

## Oracle and comparison

`tools/lua55/build-oracle.cjs` verifies the official archive and compiles the
int64/double and int32/double profiles. The second only changes the default
integer type; it does not select `LUA_32BITS`, which would also change the
floats. Both executables report Lua 5.5.1; their manifests record the
checksums, the compiler and the numeric sizes.

The differential corpus covers scalar results, their types and count,
compilation rejections and run-time errors. Traces of effects must be returned
explicitly. See the [int32](differential-int32.json) and [int64](differential-int64.json)
reports, with the source of each case and the results of both engines. The int64
comparison remains useful for the target, but the current numeric profile of
Fengari is int32/double.

Current result: **60 cases**, of which **46 matches / 14 differences** with the
int32 profile and **38 matches / 22 differences** with the int64 profile. The
eight profile cases — large values, wrap, mixed comparisons, table keys, shifts,
pack and division/modulo — match in int32 and all expose a difference in int64.
This corpus serves as a starting point for M1; it is not a measure of overall
coverage.

The first run of the full official portable suite on the Windows oracle
(`lua -e '_U=true' all.lua`) failed in `files.lua:467` when opening `/dev/null`.
The following block also uses `/dev/full`. This is a dependency on POSIX
devices, not a pass of the portable suite. The local log is
`.lua55-build/tests/oracle-portable.log`. A run on a POSIX host or a separate
adaptation of the device tests remains necessary.

## Contracts ported

| Contract | Change | Evidence | Remaining limits |
| --- | --- | --- | --- |
| UTF-8 | Strict/lenient decoding, surrogates rejected in strict, encoding up to `0x7fffffff`, iterators, charpattern and two offset results | Official `utf8.lua` suite compared on both profiles; fixtures and JS tests | Global declaration removed on the JS side only; numeric profile and other environments to validate |
| UTF-8 escapes | Lexer and encoder share the 31-bit limit; overflow checked before the shift | Official UTF-8 suite, overflow fixtures and literals tests | Rest of the lexer and grammar not ported |
| table.create | Fresh empty table; integer parameters and capacities between 0 and INT_MAX | Nominal fixtures, defaults, coercion and errors; JS tests | Capacities used as hints by the existing JS API; whole table library to audit |
| Selected libraries | Official masks, load takes precedence over preload, official order, stack preserved and registration in preload | API tests for stack, globals, registry and require | IO unavailable without Node services; C API and browser comparison to complete |
| nil error object | Replaced by `<no error object>` after the handler; other objects preserved | Differential fixtures, xpcall, assert, identity and host lua_error call | Closing, continuations and other error contracts remain to port |

`luaL_openlibs` keeps loading the Fengari extension after the standard
libraries. `luaL_openselectedlibs` selects only the standard libraries. The
version number and the binary format were not changed to make the VM look
already migrated.

## Validation commands

From the root, after compiling the oracles:

```powershell
node tools/lua55/differential.cjs --report-only
node tools/lua55/differential.cjs --int64 --report-only
node tools/lua55/check-official-utf8.cjs
npm test -- --runInBand --silent
node docs/lua-5.5.1/tools/capture-baseline.cjs
node docs/lua-5.5.1/tools/check-docs.cjs
```

Historical tests whose expectations were specific to Lua 5.3 were updated for
5.5.1: UTF-8 limit, boundary diagnostics and nil error objects. The error
checks are kept. The lint of the changed code passes with `no-undef` enabled and
the line-ending rule disabled for the CRLF of the worktree.

Last full run: **43 suites passed, 635 tests passed, 21 skipped, 656 total**,
no failure. The official UTF-8 suite keeps all its assertions and passes on
Fengari with the declared adaptation as well as on both oracles without
adaptation. The import graph test passes in the full suite.

## Remaining work

M1 must port the 64-bit numeric profile and its host conversions; M2 must port
instructions, prototypes, emission and binary chunks together. Global
declarations, attributes, named varargs and readonly loops remain off target.
Resource and coroutine closing, logical GC, the new APIs and the rest of the
libraries must then receive their implementations and evidence. The successes
above do not close these requirements.
