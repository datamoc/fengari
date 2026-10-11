# Conformance tracking

This file is maintained by hand. The tools regenerate the observations and the
inventories, **not this table**. Do not add evidence only to generated files:
it would be lost at the next capture.

## Statuses

- **To audit**: code exists, but the target contract is not fully verified.
- **To implement**: at least one gap is confirmed; the rest of the domain stays
  to audit.
- **In progress**: task and diff identified, validation still incomplete.
- **Validated**: all requirements of the row have current tests and results,
  with the profile and host adaptations specified.

The absence of evidence is not a validation. The observations below are work
indicators, not complete conformance tests. The initial status is conservative;
no row is validated by this folder.

## Working matrix

| ID | Domain | Lot | Initial status | Starting point | Tests and closing evidence |
| --- | --- | --- | --- | --- | --- |
| L01 | Types and values | M1 | To audit | 32-bit integers, string representation and existing tags | To fill in |
| L02 | Scopes, `_ENV`, global | M3 | To implement | `global` probe, current parser | To fill in |
| L03 | Errors and warnings | M4 | To implement | nil-error and warnings probes | To fill in |
| L04 | Metamethods | M4 | To audit | `ltm`, VM and `__call` limits | To fill in |
| L05 | GC, finalization, weak/ephemeron | M5 | To implement | collectgarbage probe and lua_gc stub | To fill in |
| L06 | Coroutines | M4 | To implement | coroutine-close probe, resume contracts | To fill in |
| L07 | Lexer | M3 | To implement | Global and official attributes absent/incomplete | To fill in |
| L08 | Language constructs | M3 | To implement | Attributes, readonly loops and global | To fill in |
| L09 | Expressions, operators, varargs | M2, M3 | To implement | named-varargs probe; operator audit | To fill in |
| L10 | Captures and visibility | M3 | To audit | Upvalues, closures, debug and scopes | To fill in |
| A01 | General API contract | M6 | To audit | JS API derived from 5.3; adaptations to specify | To fill in |
| A02 | All API entries | M6 | To implement | Inventory, signatures and missing exports | To fill in |
| A03 | Auxiliary library | M6 | To implement | luaL inventory and new contracts | To fill in |
| B01 | Selective library opening | M6 | To implement | luaL_openselectedlibs and missing masks | To fill in |
| B02 | Base library | M7 | To implement | warn, GC and error changes | To fill in |
| B03 | Coroutine library | M7 | To implement | close missing; rest to audit | To fill in |
| B04 | Package library | M7 | To audit | JS loaders, paths and native API to distinguish | To fill in |
| B05 | String library | M2, M7 | To implement | 5.3 dump format; patterns/pack/format audit | To fill in |
| B06 | utf8 library | M7 | To implement | utf8-offset-results probe; lenient mode audit | To fill in |
| B07 | table library | M7 | To implement | table-create probe; rest to audit | To fill in |
| B08 | math library | M7 | To audit | Numeric profile and random generation | To fill in |
| B09 | io library and files | M7 | To implement | NYI functions and method fixtures | To fill in |
| B10 | os library | M7 | To audit | Host services and platform variants | To fill in |
| B11 | debug library | M7 | To implement | Indexed uservalues and named varargs | To fill in |
| D01 | Standalone interpreter | M8 | To audit | External CLI component to identify | To fill in |
| D02 | 5.4→5.5 incompatibilities | M3–M8 | To implement | Manual §8, all differences to cover | To fill in |
| D03 | Complete grammar | M3 | To implement | Compilation probes; corpus to create | To fill in |
| V01 | Instructions and prototypes | M2 | To implement | Current 5.3 lopcodes | To fill in |
| V02 | Chunk reading | M2 | To implement | Current 0x53 format | To fill in |
| V03 | Chunk writing | M2 | To implement | Format and writer protocol to port | To fill in |
| P01 | Acyclic graph and integration | All | To audit | Existing dependency gate, to maintain at every lot | To fill in |

Normative references and details: [Requirements](03-exigences.md).

## Contract progress

The UTF-8, `table.create`, selective opening and nil error normalization
contracts have received a port and tests. Evidence and limits appear in
[Verified progress](09-avancement.md). Domains L03, L07, B01, B06 and B07 are
**in progress**; their initial status in the table above remains a historical
marker. No whole domain is declared validated yet.

## Evidence per API or library entry

Add one record per contract or group of contracts, citing the exact symbols of
the [inventory](inventaire-api.md). Evidence of presence is not enough to close
the group. C types, build macros and environment variables must receive an
explicit classification and their applicable contract.

```text
Requirement / symbols:
Status:
Lot and task:
Implementation (files/commit):
Official reference:
Tests (files/cases):
Oracle 5.5.1 result / profile / date:
Fengari result / profile / date:
Normalizations and host adaptations:
Skipped tests and equivalent coverage:
Remaining gaps:
```

## Delivery audit

Check every row, then every inventoried entry. Note any requirement without
evidence, any unreplaced skipped test and any unpublished adaptation. The
overall status stays incomplete while one of these belongs to the announced
scope. The detailed gates G0–G8 appear in [Validation](06-validation.md).
