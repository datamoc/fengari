# Implementing Lua 5.5.1 in Fengari

Documentation state as of October 10, 2026. Frozen target: **Lua 5.5.1**, released on
July 24, 2026. This folder prepares the implementation; it does not claim the migration is done.

## Reading path

| Document | Purpose |
| --- | --- |
| [References](01-references.md) | Manual, sources, tests, versions, checksums and licenses |
| [State of the repository](02-etat-des-lieux.md) | Observed gaps and limits of the current evidence |
| [Requirements](03-exigences.md) | Coverage of the language, the VM, the libraries and the API |
| [Architecture](04-architecture.md) | Components to change and JavaScript-specific constraints |
| [Implementation plan](05-plan-implementation.md) | Ordered lots, dependencies and exit criteria |
| [Validation](06-validation.md) | Official oracle, differential tests and definition of done |
| [Decisions](07-decisions.md) | Technical choices to make without lowering the conformance target |
| [Conformance tracking](08-suivi-conformite.md) | Manual matrix of requirements, tasks and validation evidence |
| [Verified progress](09-avancement.md) | Engine changes, reproducible commands and remaining gaps |
| [API inventory](inventaire-api.md) | Official symbols matched against current exports and libraries |
| [Observations](observations.json) | Reproducible results of probes run on this worktree |

## Offline references

- [Manual shipped with Lua 5.5.1](reference/lua-5.5.1/doc/manual.html).
- [Manual index](reference/lua-5.5.1/doc/contents.html).
- [Distribution and license information](reference/lua-5.5.1/doc/readme.html).
- [Official full sources, archived](reference/lua-5.5.1.tar.gz).
- [Official 5.5.1 test suite, archived](reference/lua-5.5.1-tests.tar.gz).
- [Reference manifest and checksums](reference/manifest.json).

The public headers and `lopcodes.h` are also extracted under
`reference/lua-5.5.1/src/`. The full C sources stay in the archive: they serve as
a porting reference, without becoming a dependency of the JS engine.

## Refreshing and checking

From the repository root, with dependencies installed:

```powershell
node docs/lua-5.5.1/tools/capture-baseline.cjs
node docs/lua-5.5.1/tools/check-docs.cjs
```

The first command refreshes the observations and the inventories; the second
checks local links, local anchors and the integrity of the references. Neither
of these tools certifies the conformance of the engine. The certification
protocol is described in [Validation](06-validation.md).

## Tracking rule

An exported symbol or a recognized syntax is not enough to validate its contract.
A requirement moves from "to implement / to audit" to "validated" only with
referenced behavioral tests, a dated result and the execution profile. JavaScript
adaptations stay visible; they must not be presented as conformance to the native
C ABI.
