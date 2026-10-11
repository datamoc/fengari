# Validation and conformance criteria

The current suite protects against regressions. Validating Lua 5.5.1 must in
addition compare the contracts of the manual against an oracle of the exact
version.

## Reproducible oracle

Use the [official archive](reference/lua-5.5.1.tar.gz) whose checksum is
verified. Extract it into a separate working directory, compile it with the
platform toolchain and record: version, archive hash, compiler, options,
integer and float widths, endianness and compatibility options.

The build commands depend on the system; they are in the
[official readme](reference/lua-5.5.1/doc/readme.html). POSIX example, after
extraction: `make linux` then `src/lua -v`. On Windows, use an adapted toolchain
and record its configuration; do not assume `make linux` applies.

The build is now reproducible with `node tools/lua55/build-oracle.cjs` from the
root. It produces two executables under `.lua55-build/`: 64-bit integers/doubles
(the official default distribution) and 32-bit integers/doubles (comparison with
the current engine). Each build keeps its manifest and its compilation log. On
Windows, the script uses MSVC; under POSIX, `CC` or `cc`. Copies of the code and
the executables stay out of the repository.

A suite compiled against the internal C API does not automatically run in the
JS engine. Building the oracle is not enough to close M0 or the following gates.

## Official 5.5.1 suite

Extract [lua-5.5.1-tests.tar.gz](reference/lua-5.5.1-tests.tar.gz) without
modifying its originals. The [official page](https://www.lua.org/tests/)
distinguishes:

| Mode | Command for the oracle, from the extracted suite | Scope |
| --- | --- | --- |
| Portable | `path/to/lua -e"_U=true" all.lua` | Skips some heavy/non-portable tests; does not certify the whole specification |
| Complete | `path/to/lua all.lua` | Requires building the test libraries in `libs/` and `libs/P1/` |
| Internal | Oracle built with `ltests.c`, `ltests.h` and the official configuration | Access to internal structures and C tests; adaptation/harness needed for JS |

On Windows, adapt the shell syntax and the builds, keeping the same
intentions. Keep logs, exit codes and the final message. The oracle must also
pass the retained cases, otherwise distinguish platform defect from port defect.

For Fengari, create a dedicated runner for the suite scripts and port the
required host test functions. Keep the original test, the adaptation patch and
its reason separate. Any test without an equivalent stays uncovered; it is not
"passing".

## Differential comparison

The runner runs the same sources with the oracle and Fengari. It compares:

- acceptance/rejection at compilation and diagnostic category;
- type, count and value of results, including intermediate nils;
- string bytes, integer/float subtype and large integers without a destructive
  JSON/Number round-trip;
- errors, warnings, coroutine states and callback sequence;
- stack, registry and userdata effects on the API side;
- host files and outputs when the profile exposes these services.

Normalize only the elements the specification does not prescribe: absolute
paths, addresses, timings and host-dependent diagnostic details. Document every
rule. Do not normalize types, closing order, the presence of a nil argument, the
number of results or precision differences to make the tests pass.

## Corpus and commands

The [current corpus](../../test/lua55/cases.json) and the runner are runnable:

```powershell
node tools/lua55/differential.cjs
node tools/lua55/differential.cjs --int64
node tools/lua55/check-official-utf8.cjs
```

The differential commands write a report then fail if a difference remains.
`--report-only` keeps the differences in the report without a failing exit code;
this mode serves tracking, not engine certification. The reports record the
checksums of the JS sources, the fixtures and the reference executable. Scalar
values are compared with types and cardinality: string bytes, exact decimal
integers and binary floats. Error texts are kept, but only the phase and the
type are compared by default; a fixture can require the exact text with
`compareDiagnostics`. Non-scalar objects, stdout outputs, native API effects and
host services remain to be covered.

The UTF-8 runner executes the official `utf8.lua` unmodified in both oracles.
In Fengari, only its `global <const> *` declaration is replaced by a comment;
all assertions are kept. This adaptation validates neither global declarations
nor readonly. The report keeps both sources and their checksums:
[official-utf8.json](official-utf8.json).

The following table describes the coverage to reach; the current corpus does not
fill it entirely. Dated evidence appears in [Progress](09-avancement.md).

| Group | Mandatory cases |
| --- | --- |
| Attributes | Prefix/suffix, readonly direct/captured, close forbidden on global, unknown attribute, list with several close |
| Global | Declaration without erasing, non-nil initialization rejected, wildcard, readonly wildcard, scopes, `_ENV`, global function |
| Varargs | Readonly named table, mutable table, modified n/entries influencing `...`, nil, zero argument, captures, returned table, debug |
| Loops | Readonly numeric/generic control, shadowing, closures, bounds and overflow |
| Close | Reverse order; normal exit, return, break, goto, error; error inside close; absence of the second argument without error; suspended/errored coroutine; close API and reentrancy |
| Operators | Every metamethod, call chain at 15 and beyond, comparisons/coercions and multi-result functions |
| Errors/warnings | `error(nil)`, recursive handlers, fragmented warnings, absent/present callback and host errors |
| Numeric | min/max, mixed conversions, modulo/division, shifts, round-trip precision, NaN/infinities, signed zero, `string.pack` |
| Libraries | Every inventoried entry; table.create; two returns of utf8.offset; indexed userdata in debug; selected libs/preload; randomseed |
| GC | Host roots, cycles, weak k/v/kv, ephemerons, finalization, resurrection, parameters, external strings and state closing |
| Binary | Text JS→chunk→oracle and back, strip/no-strip, chunked readers, end of writer, incompatible versions/profiles, truncations and limits |
| API | Stack effect, invalid indices, 250/251 results, continuations, close slots/threads, allocator/seed, signatures and callbacks |
| Distribution | Cold start, browser/workers, public API, CLI/init/options/env/REPL depending on the retained component |

Valid fixture examples for the target:

```lua
local <const> a, b = 1, 2
return a + b
```

```lua
local f = function(...args)
  args[1] = 9
  args.n = 1
  return ...
end
return f(1, 2) -- must produce only 9
```

```lua
global X
X = 1
global X = 2 -- must fail at run time: X is already non-nil
```

```lua
local log = {}
do
  local a <close> = setmetatable({}, {
    __close = function(self, ...)
      log[#log + 1] = select('#', ...)
    end
  })
end
return log[1] -- 0: no second argument on a normal exit
```

## Scope per environment

Test the portable language and libraries under Node and in a browser context
without `process`. For IO, OS and native modules, identify the required host
services. An unavailable service is a profile limitation, not a conformance
pass. Native C cases require a verifiable JS equivalent or a native/Wasm
component; record the difference between API semantics and ABI.

## Validation gates

| Gate | Required evidence |
| --- | --- |
| G0 References | Official checksums, license and oracle profile recorded |
| G1 Regressions | `npm test -- --runInBand`, current result and skip list; baseline compared |
| G2 Imports | `npx jest test/dependencies.test.js --runInBand`; no cycle, cold start and browser |
| G3 Code | Lint of the changed code; overall lint and baseline differences reported separately |
| G4 Contracts | All inventory entries and requirements linked to a behavioral test |
| G5 Differentials | Identical oracle/JS results after declared normalizations |
| G6 Official suite | Portable and complete in their profile; adapted internal coverage and identified exclusions |
| G7 Hosts/memory | Resources, cycles, closing, callbacks and limits tested per profile |
| G8 Delivery | Version, docs, API, profiles, binary format and limitations coherent |

A number of passing tests is not a percentage of specification covered. A claim
of "Lua 5.5.1 fully implemented" requires all the evidence of the announced
scope, no unknown gap and no omission hidden by skips.
