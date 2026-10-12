# State of the repository

Initial state established on October 10, 2026 on a worktree containing
uncommitted changes. The starting commit, the list of modified files, the source
checksums and the probes are kept in [observations.json](observations.json).
This state must be refreshed before starting a lot: other sessions may modify
the repository.

## Observed technical base

| Observation | Local evidence | Consequence |
| --- | --- | --- |
| The README claims a Lua 5.3 semantics | [README](../../README.md) | Historical starting point, not a 5.5 certification |
| The definitions announce 5.4 / 504 | [defs.js](../../src/defs.js) | Announced number incompatible with the actual coverage |
| The binary chunk is explicitly 0x53 | [lbytecode.js](../../src/lbytecode.js) | No 5.5 binary interoperability |
| Instructions and encoding from the 5.3 generation | [lopcodes.js](../../src/lopcodes.js) | Compiler, VM, dump and undump must migrate together |
| Signed 32-bit integers and double floats | [luaconf.js](../../src/luaconf.js) | Numeric profile to settle; 32 bits can be a configured Lua profile, but not the default 64-bit oracle profile |
| GC handed over to JavaScript; `lua_gc` is empty | [lapi](../../src/runtime/lapi.js), [base library](../../src/lbaselib.js) | Lua collector observable, weak tables and finalization to design |
| Official `<const>` and `<close>` fail the probes | [Observations](observations.json), [parser](../../src/runtime/lparser.js) | Earlier additions insufficient for Lua 5.4 or 5.5 |
| `lua_closeslot` erases a value without closing it | [lapi](../../src/runtime/lapi.js) | `__close` contract missing despite the export |
| State and libraries composed without import cycle | [runtime.js](../../src/runtime.js), [library-runtime.js](../../src/library-runtime.js) | Keep this property during the migration |

`CHANGES.md` describes intentions and partial additions. It must not be used as
proof of conformance. The `local const x` syntax that may currently be accepted
is not the attribute syntax of the target manual.

## Current organization to preserve

- `src/runtime/*.js` holds the core factories; `src/runtime.js` provides their
  collaborators and then assembles their exports.
- Legacy paths such as `src/lapi.js` and `src/lparser.js` are compatibility
  facades. Changing only these facades does not change their implementation.
- `src/library-runtime.js` composes the libraries and the public API; library
  names live in `src/lualib-constants.js`.
- `src/luaconf-base.js` shares the configuration without a cycle with `defs.js`.
- `src/pyroeis-vm.js` provides a JS integration extension. Its methods are not
  part of the Lua specification and must have their own regressions.

## Currently unknown coverage

The presence of existing exports validates neither their arguments, nor their
effect on the stack, nor error and yield handling. The [inventory](inventaire-api.md)
separates "present, contract unverified", "absent" and "type adaptation to
design". It covers the base, package, coroutine, table, io, os, string, utf8,
math and debug libraries, as well as the file methods that require a fixture.

A functional audit is still required for behaviors already present: arithmetic,
coercions, comparisons, limits, iteration, patterns, binary strings, debug,
coroutines, environment and host calls. Do not consider the 5.3 base fully
conformant: the README already reports several omissions.

## Test baseline

At the end of the previous work, the full suite passed with 41 suites, 621
passing tests and 21 skipped. This result is a regression history, not a 5.5.1
conformance result nor an up-to-date proof for every file. The probes of this
folder are run when it is generated; they must not be mistaken for a run of the
official suite.

The overall lint has pre-existing issues, notably CRLF line endings. Record the
lint of the migrated code and the overall lint separately, and do not hide a
semantic error under a formatting exemption.
