# Implementation plan

This plan orders the work without announcing unsupported dates. No lot is
marked complete at the creation of this folder. A task is closed with a diff,
tests, their results and the requirements covered.

Statuses and evidence are kept in the [conformance tracking](08-suivi-conformite.md),
separately from the generated inventories.

## Lots and dependencies

| Lot | Depends on | Work | Main requirements | Exit criterion |
| --- | --- | --- | --- | --- |
| M0 — Reference and oracle | — | Install/compile the 5.5.1 oracle, record its profile, import the cases and produce a differential baseline | All, P01 | Version/hash/profile recorded; JS runner and oracle comparable; exclusions visible |
| M1 — Contracts and values | M0 | Settle numeric/API profile, port tags and representations, prototypes, userdata and conversions | L01, A01 | Numeric bound, byte, identity and host conversion tests; no silent loss |
| M2 — VM and format | M1 | Port the 5.5.1 instructions and prototypes, dispatch, compatible emission, dump/undump and structural debug | V01–V03, L09, B05, B11 | Every opcode covered; chunk exchange with the oracle on the matching profile; incompatible chunks rejected |
| M3 — Grammar and resolution | M2 | Attributes, readonly, global, named varargs, readonly loops, scopes and diagnostics | L02, L07–L10, D02–D03 | Acceptance/rejection corpus; conformant varargs mutation/capture and global declarations |
| M4 — Calls and closing | M2, M3 | Call frames, continuations, yields, resources, close slots/threads/states and error handling | L03, L04, L06, A01–A02, B03 | Scope-exit, error, reentrancy and coroutine matrix fully covered |
| M5 — GC and weak tables | M1, M4 | Logical heap/roots, modes/parameters, finalization/resurrection, ephemerons, external strings | L05, A02, B02 | Controlled tests of collection, cycles, order, warnings and release callbacks; no stub declared conformant |
| M6 — API and auxiliary | M1–M5 | Every inventoried entry: signatures, stack effects, errors/yields, buffers and selective loading | A01–A03, B01 | Complete inventory with per-contract tests and documented JS adaptations |
| M7 — Libraries and hosts | M3–M6 | Base, package, string, utf8, table, math, debug, io, os and host services | B02–B11 | Every entry tested; distinct Node/browser profiles; no gaps hidden by skips |
| M8 — Distribution and CLI | M6, M7 | Version, paths, documentation, entrypoints, CLI/luac or identified components, user migration | D01–D02, P01 | Published version reflects capabilities; options and environment tested; incompatibilities announced |
| M9 — Final audit | M0–M8 | Official suite, differentials, adapted internal tests, regressions, memory and browser | All | Every requirement has current evidence; no unknown status within the announced scope |

M6 and M7 may prepare their tests before their dependencies finish. They are not
validated while the underlying mechanisms are incomplete. Avoid a long fork
where parser, VM and format refer to different generations.

## First concrete sequence

1. Regenerate `observations.json` and the inventory, then record a real run of
   `npm test -- --runInBand` on the state chosen as baseline.
2. Open the decisions of [07-decisions.md](07-decisions.md). Do not convert the
   announced number to 5.5.1 to simulate a migration.
3. Compile the official distribution and check `lua -v`, the numeric sizes and
   the compatibility options. Do not compare different numeric profiles.
4. Write the differential runner, its normalization rules and the minimal test
   cases of the [protocol](06-validation.md). The current probes serve as red cases.
5. Run M1 then M2, keeping the import graph test as an invariant.

## Task format

```text
Title: Mx / requirement / observable behavior
State: to do | in progress | to verify | validated | blocked
Reference: section/entry of the frozen manual, C 5.5.1 source
Observation: current observation, reproduction
Change: files, structure and contracts affected
Tests: nominal, boundary, error, yield/reentrancy cases where applicable
Evidence: command, version/profile, date and result
Host adaptation: none or referenced decision
Remaining: explicit gaps, without renaming the goal to exclude them
```

## Delivery conditions

The migration is not deliverable if `<close>` is only recognized syntax, if
`lua_gc` stays empty, if the bytecode keeps a 5.3 layout with a 5.5 byte, or if
new functions only carry the name of the official API.

Every library, type, function and constant of the inventory is audited. Skipped
tests are justified individually. A partial profile may be delivered as such
during development, but it does not complete the full-conformance target.
Constraints related to the native ABI and the host require an explicit decision
and an exact statement of the published capabilities.
