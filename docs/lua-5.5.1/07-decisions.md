# Decisions to make

These decisions are open. The proposals help getting started and are not
approved choices. A decision may change an internal representation or name a
profile; it must not turn a missing requirement into a success.

| ID | Question | Initial proposal | Validation and impact |
| --- | --- | --- | --- |
| ADR-01 | Distribution numeric profile? | Signed 64-bit with BigInt, doubles with Number; named 32-bit profile if kept | Matching oracle; host API and chunks adapted; consumer migration |
| ADR-02 | How to satisfy GC, weak tables and finalization? | Logical Lua heap above the JS GC | Root model, callbacks, costs and modes; proof by tests, not mere WeakRef |
| ADR-03 | JS API conventions for out-parameters and pointers? | Contracts documented per function; explicit objects/tuples where needed | Historical compatibility, error types, stack effects, resume results |
| ADR-04 | External strings and borrowed buffers? | Host retain/release protocol with stable bytes | Lifetime, mutation, callback, GC and state closing |
| ADR-05 | IO/OS in the browser? | Injectable host services and explicit capability profile | File system, stdin/out, dates/locales and documented refusals; do not advertise full IO without services |
| ADR-06 | 5.3/5.4 binary compatibility? | New 5.5.1 reader/writer; reject old chunks; recompile from sources | Consuming tools, error messages, caches and cross-tests with the oracle |
| ADR-07 | Compatibility options and legacy additions? | 5.5 target without implicit options; isolated and announced JS extensions | Historical `local const` syntax, global keyword, deprecated aliases and breaking changes |
| ADR-08 | CLI and native C ABI? | Explicitly identify the responsible components; semantic JS API separate from the ABI | Full distribution vs runtime; possible native/Wasm need; no ABI conformance by renaming |
| ADR-09 | Porting the C and internal tests? | Original fixtures + versioned adaptation layer + exclusion log | Equivalent behavioral tests; do not modify expectations to accept the port |
| ADR-10 | Hashing and randomness? | Per-state seed and host entropy policy; 5.5.1 implementations to audit | Explicit reproducibility, collisions, randomseed and configuration-allowed differences |

## Decision record

```text
ID and title:
State: open | proposed | adopted | superseded
Date and owners:
Requirements concerned:
Context and current evidence:
Options considered:
Choice and reason:
Observable contract:
Impact Node/browser/clients:
Validation evidence:
Remaining limitations and public statement:
```

Adopted decisions must be carried over into the architecture, the plan and the
validation matrix. Before announcing full conformance, check that they do not
leave unrealized requirements behind an unnamed profile.
