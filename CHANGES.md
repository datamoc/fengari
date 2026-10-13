# Changes in Pyroeis

## Unreleased

### Performance
- **String buffers and copies**: `luaL_addchar` no longer builds a view per character, and `luastring_from` copies typed arrays with `new Uint8Array` (3-4x faster than `Uint8Array.from` on short strings).
- **Real-world check, World Conquest II** (the campaign's own Lua from Wesnoth 1.19, run by the `mwg-wesnoth` port, map-generation scenario, same seed, same output). Measured in one session: Fengari 0.1.5 4.7 s, Pyroeis 0.5.5 5.0 s, then 2.2 s with the integer, `for`-loop and buffer work. Timings drift with machine load: measured side by side, this change alone is 5 to 10% faster than 0.8.0 on that run (about 2.4 s against 2.5 to 2.7 s). The five `mwg-wesnoth` Lua tests that can run without generated data pass on all three.

### Security (limits)
- **`limits.coroutines`**: a script could create a million coroutines (about 1.7 GiB of heap, in 3.5 s) under a generous instruction budget, because `allocation` and `totalAllocation` only see strings and buffers. The new limit caps the coroutines created per top-level call (`coroutine.create`, `coroutine.wrap`, and host coroutines made during the call); the next one raises a `LimitError` (`limit: "coroutines"`) that `pcall` cannot catch. It counts creations, not live coroutines, since the garbage collector is not observable, so a persistent VM can still keep 10,000 new ones per call. 10,000 costs about 17 MiB. Opt-in: without it nothing is counted.
- **Not covered**: tables and closures cost as much (3 million empty tables: about 2.2 GiB); only the instruction and time budgets bound them.
- **Tests**: `test/pyroeis-vm-limits.test.js`.

### Documentation
- **Security page**: the demonstration uses `coroutines: 10000`, with a new case (`coroutines`) comparing it with upstream Fengari under the same instruction budget.

## Version 0.7.0

### Security (binary chunks)
- **A forged section size could still cost gigabytes**: the loader allocated every string (and every header literal) at the size the chunk declared, before reading a single byte, so 30 bytes of input asking for a 2 GB string forced the allocation first and refused it after. `read` now doubles its buffer as the bytes arrive, charging each real allocation to the allocator hook; a declared size the input cannot back is refused as `truncated`, with a peak of a few kilobytes instead of the declared size. Section counts were already bounded by the input itself (every item consumes at least one byte) and still are.
- **Tests**: `test/lverify.test.js` loads a chunk whose long-string constant declares 2 GB and checks both the refusal (`truncated precompiled chunk`) and, through `lua_setallocf`, that nothing bigger than the bytes really present was allocated.

### Documentation
- **Security page: a test matrix checked against reality**: the nine attack cases sketched in our working notes (corrupted chunks, infinite loop, malicious metatable, string concatenation, giant table, `js.global` escape, prototype injection, constant mentioning `eval`, and a checksum that Lua chunks do not have) now appear as a static table with the behaviour both engines really have and a way to verify each row. Three rows were corrected rather than copied: the chunk format carries no checksum, `t.__proto__` written from Lua is an ordinary key, and `js.global` exists only with fengari-interop; the constant filter was set aside. Case links such as `#allocation` select their reproduction, so every comparison stays runnable on the page.

### Contributors
- **The README licence line names the people**: « MIT © Michel Weinachter (Datamoc), Benoit Giannangeli, Daurnimator, and contributors. », each name linked to the GitHub profile that commits the repository history (44 commits for datamoc, 505 for giann, 804 for daurnimator). `LICENSE` itself keeps the plain MIT text.

## Version 0.6.0

### Breaking: the last Fengari names are gone
- **`PYROEISCONF`** replaces `FENGARICONF` as the environment variable that configures the VM (`{"LUAI_MAXSTACK":100000}`...). `FENGARICONF` is no longer read. The CI and release workflows use the new name. The upstream Fengari 0.1.5 bundle on the demo pages keeps its own `FENGARICONF`.
- **The Lua library `fengari` is now `pyroeis`** (`pyroeis.VERSION`, `RELEASE`, `COPYRIGHT`, `AUTHORS`...). The global `fengari` no longer exists; `libs: ['pyroeis']` selects it, and `sandbox: true` still leaves it out.
- **`FENGARI_*` constants are `PYROEIS_*`** (`PYROEIS_VERSION`, `PYROEIS_RELEASE`, `PYROEIS_COPYRIGHT`...), and they describe Pyroeis (`Pyroeis 0.6.0`) instead of Fengari 0.1.5. The copyright keeps the Fengari and Lua attributions. `luaopen_fengari` is `luaopen_pyroeis` and `LUA_FENGARILIBNAME` is `LUA_PYROEISLIBNAME`.
- **The browser bundle no longer exposes the `Fengari` alias**; use `Pyroeis`.
- **Tests**: `test/pyroeis-version.test.js` keeps the constants in step with `package.json`; `test/dependencies.test.js` checks that `FENGARICONF` is ignored.

## Version 0.5.5

### Security (binary chunks and the translator)
- **A corrupted binary chunk could stall the VM**: the loader trusted every operand, so a chunk whose `CONCAT` named registers far beyond the frame made the VM spin inside that one instruction, where no count hook can interrupt it. `src/lverify.js` now checks each loaded function (registers, constants, upvalues, prototypes, jump targets, the test-then-jump pairs, a closing `RETURN`) and the upvalue descriptors of its children; a chunk that fails is refused with `malformed (...)`. The loader also refuses a negative string size, a line table that does not match the code, more upvalue names than upvalues, and a closure whose upvalue count differs from its prototype. A JavaScript `Error` raised while reading a chunk becomes `malformed (corrupted data)` instead of a status `-1` with no message. 60,000 corrupted chunks no longer stall or leak an exception. A few still reach `lua_pcall` as status `-1`: structurally valid code that the VM then runs with the wrong types. A binary chunk remains trusted input; `sandbox: true` still refuses them all (`load` is text-only).
- **`lua2js` warnings can be `unsafe`**: a warning now carries `unsafe: true` when the translation reaches the JavaScript environment (free globals `eval`, `Function`, `globalThis`, `window`, `document`, `process`, `require`, `fetch`...) or a prototype (`t.__proto__`, `t.constructor`, including as a method name or function field). Translated code is plain JavaScript, not a sandbox. A `__proto__` key in a table constructor is now emitted as the computed key `["__proto__"]`, an own property, instead of setting the prototype. The Lua ↔ JavaScript page refuses to run a translation with an unsafe warning.
- **Tests**: `test/lverify.test.js`, `test/ltranspile.test.js`.

### Documentation
- **Security page**: why games with untrusted Lua cannot use `fengari-interop` (it hands `js.global` to the script) and how the exchange mode differs; a demonstration that replays 1,500 corrupted binary chunks on upstream Fengari 0.1.5 (72 JavaScript exceptions cross `pcall`) and on the Pyroeis sandbox (none).

## Version 0.5.4

### Security (execution limits)
- **A limit overrun could be hidden by the script**: a coroutine created by Lua that exceeded the instruction (or time, or total memory) budget made `coroutine.resume` / `pcall` return normally, so `vm.run()` returned its value (`limitHit` was set but nothing failed). Every host entry point (`run`, `call`, `callRef`, `Coroutine#resume`, `protect`) now fails with a `LimitError` whenever a limit was hit during the call, even if Lua caught the failure. `setLimits` resets the flag, so a removed limit leaves nothing stale.
- **Looking up a global ran outside the budget**: `call`, `callMulti`, `compile` and `coroutine` resolved their path before the budgeted call, so an `__index` metamethod on `_G` (or on a library table of the path) could loop forever, or raise outside a protected call. The lookup now runs in a protected call under the same budget (`vm.resolvePath`).
- **`Coroutine#close()` ran without a budget**: pending `__close` handlers executed unbounded (a 10,000-iteration handler ran under a 1,000-instruction limit). `close()` now gets a fresh budget like the other top-level calls and fails with a `LimitError` if it is exceeded.

### Documentation
- **`compile` under `limits`**: the README now documents that `compile` is intentionally disabled while execution limits are active (generated JavaScript would need its own budget enforcement, a second mechanism to get right), and how to combine fast trusted code with limited untrusted code.

### `FengariVm` options and types
- **`sandbox` leaked `__random`**: the host helper was a readable global (`type(__random) == 'function'`). Like `__fs_read` / `__fs_list`, it is no longer defined with `sandbox: true`. Nothing in Fengari calls it (`math.random` has its own generator); `vm.nextRandom()` remains available to the host.
- **`print` option** (`'buffer'` default, `'native'`, `false`): `'native'` keeps the base library’s `print` and `false` removes it, so a host that wants Lua's own `print` no longer has to build the VM with `libs: []` and re-open libraries (which restored `string.dump` after the sandbox removed it).
- **Types**: `LuaRef.type` is `'function' | 'thread' | 'userdata'` (new `LuaRefType`; a table is never a reference), `FengariVmOptions.print`.

### Fixes (`lua2js`)
- **`a or b` changed Lua truth semantics silently**: it was translated to `a ?? b`, which returns `false` where Lua returns `b`. It is now `truthy(a) ? a : b` (or an `or()` helper for a complex `a`), `a || b` when `a` is a boolean, and `a ?? b` only when `a` is known never to be `false`. The new `nullishOr` option (`--nullish-or`) restores the always-`??` form for readability.
- **Tests**: `test/fengari-vm-limits.test.js`, `test/ltranspile.test.js`.

## Version 0.5.3

### Fixes
- **Browser bundles**: `luaconf.js` called `require('os').platform()` whenever `process` existed, so a bundler that defines a `process` shim (or that cannot resolve `os`) broke the bundle and forced consumers to write a local shim. Node detection now goes through one module, `src/isnode.js` (`process.versions.node`, which a shim does not have), instead of `typeof process` in 13 places, and `os.platform()` became `process.platform`. A shimmed `process` also used to crash `ldblib.js` at load (`readlineSync.setDefaultOptions is not a function`, since the `readline-sync` stub is empty).
- **`package.json` `browser` field** maps `fs`, `os`, `path`, `tmp`, `child_process` and `readline-sync` to empty modules, so webpack, esbuild, Vite and Browserify bundle the package for the browser without shims or `resolve.fallback`. Verified with `esbuild --platform=browser`, with and without a `process` shim.
- **Tests**: `test/browser-compat.test.js` fails if the library requires a Node-only module on the browser path.

## Version 0.5.2

### TypeScript
- **Host-facing internals declared**: `src/fengari.d.ts` now types `limitHit`, `pushPath(L, path)`, `classifyKeys(L, table)` and `nextRandom()` on `FengariVm`, which hosts use alongside `read`/`push`. Tests in `test/types.test.js` cover their behavior.

## Version 0.5.1

### Security
- **`lua2js` comments could run as code**: a Lua line comment containing a bare CR, U+2028 or U+2029 ended the generated `//` comment early, so the rest of the comment became executable JavaScript. These characters are now replaced by spaces. If you translated untrusted Lua with 0.5.0, review the comments of the output.

### New features
- **TypeScript declarations**: `src/fengari.d.ts` (`"types"` in `package.json`) types `FengariVm`, `LuaRef`, `LuaError`, `LimitError`, `Coroutine`, `Userdata`, `LuaFloat`, `Multi`, `Yield`, `LuaValue`, the options (`FengariVmOptions`, `VmLimits`, `LuaToJsOptions`) and the translation result (`LuaToJsResult`). The C-API namespaces (`lua`, `lauxlib`, `lualib`, `luaconf`) and string helpers are typed as `any` for now. `test/types.test.js` checks that the declarations and the runtime exports stay in sync.
- **`vm.protect(fn)`**: runs a host callback `fn(L)` inside a Lua protected call, so Lua errors raised while it uses the C API (failing `__index` metamethod, `luaL_error`, limit overrun) become a `LuaError` / `LimitError` instead of unwinding through host code; the stack is restored and a JavaScript error thrown by `fn` is rethrown unchanged.
- **`vm.throwLuaError(L, index = -1)`**: throws the Lua error value at `index` as a `LuaError` (a `LimitError` after a limit overrun), with the message as traceback. Replaces the `errorMessage` + `luaError(message, message)` pair; `Coroutine#close` now uses it (and so reports a `LimitError` after an overrun).

## Version 0.5.0

### New features
- **Optional numeric compilation** (`vm.compile(target)`, `src/lnumeric.js`): pure numeric Lua functions and numeric `for` loops are compiled to JavaScript with guards that fall back to the interpreter; `docs/benchmark/` compares interpreted Lua, compiled Lua and JavaScript (`tools/benchmark-numeric.js`, `test/numeric-compiler.test.js`).
- **Offline Lua to JavaScript translation**: `src/ltranspile.js` (`transpile(source, { format })`) and the `lua2js` command (`lua2js file.lua -o file.js --format esm|cjs|none`) turn Lua source into readable JavaScript for developers who want to migrate to JavaScript. It parses Lua 5.5 (including `global` declarations, `<const>`/`<close>` and named varargs) and prints `const`/`let`, arrow functions, template literals, arrays or objects for tables (inferred from use), arrays for multiple returns, and mappings for the common `math`/`string`/`table`/`os`/`io` functions. Literal Lua patterns in `find`/`match`/`gmatch`/`gsub` become `RegExp` calls. Constructs it cannot translate faithfully (metatables, coroutines, patterns with `%b`/`%f` or a non-literal pattern, general `goto`, 64-bit bitwise operators) get a `TODO(lua2js)` comment and a `warnings` entry. Also available as `FengariVm.toJs(source, options)`. Independent of `FengariVm.compile`, which remains the runtime numeric compiler.
- **Demo page**: `docs/lua2js/index.html` translates pasted Lua live and benchmarks the Lua (Fengari interpreter) against the translated JavaScript, with the Sieve of Eratosthenes (the most expensive example of the benchmark page) preloaded.
- **Tests**: `test/ltranspile.test.js` runs each sample in the Lua VM and in the translated JavaScript and compares the results; all 34 files of the official Lua 5.5 test suite also translate to syntactically valid JavaScript.

## Version 0.4.2

### Fixes
- **Limits bypassed by two other native functions**: `table.move({}, 1, 2^40, 2)` loops forever in a single instruction, and plain text search (`string.find(s, p, 1, true)`) is quadratic in the worst case (6.6 s for 200,000 characters). Both now call the interrupt point (`l_G.interrupt`) every 65,536 elements moved or compared, and `limits` stops them (`LimitError`). Without limits, their behavior is unchanged.
- **Known limitation**: other native functions whose cost depends only on the size of their arguments (sorting a large table with the default comparator, `table.concat`, `string.format`, etc.) are not interrupted; bounding `allocation`/`totalAllocation` bounds the size of the strings they can produce.
- **Tests**: `test/fengari-vm-limits.test.js`.

## Version 0.4.1

Security fixes for the execution limits and the `sandbox` preset of 0.4.0 (no longer use it for untrusted code).

### Fixes
- **Limits bypassed by `xpcall`**: the message handler of an `xpcall` ran during the counting hook, hence without control, and could loop indefinitely; hooks are now re-enabled before reporting the overrun.
- **Endless native instruction**: a pattern search (`('a'):rep(20000):find('.-.-.-.-.-b')`) never went through the counting hook. `string.find`, `match`, `gmatch` and `gsub` now call an interrupt point every 65,536 steps (`lua_State.l_G.interrupt`, used by `limits`), each call counting as 65,536 instructions.
- **Memory**: new `limits.allocation` limit (maximum size of an internal string or buffer allocation: `string.rep('x', 2^27)` or a doubled concatenation yields "not enough memory", catchable) and `limits.totalAllocation` (per-call total: overrun not catchable, `LimitError` with `limit === 'memory'`), hooked into `lua_setallocf`.
- **`sandbox`**: `__fs_read` and `__fs_list` are no longer defined, the script has no access anymore to the files served by `files`; `sandbox: true` accepts a `libs` list without `base` instead of raising an error.
- **Tests**: `test/fengari-vm-limits.test.js`, `test/fengari-vm.test.js`.

## Version 0.4.0

### New features (`FengariVm`)
- **Export**: `require('@datamoc/fengari')` now exposes `FengariVm`, `LuaError`, `LimitError`, `Multi`, `Yield`, `LuaRef`, `LuaFloat`, `Userdata` and `Coroutine`.
- **Host-driven coroutines**: `vm.coroutine(path | LuaRef)` and `vm.coroutineFromSource(source)` return a `Coroutine` (`status`, `resume(...args)` → `{done, values}`, `close()`). A host function returning `new Yield([...])` suspends the calling coroutine; the `resume` arguments become its return values.
- **Library selection**: `libs` option (base, coroutine, table, string, utf8, math, os, debug, package, io, fengari) and `remove` option (globals to remove; removing a top-level global also removes it from `package.loaded` and `package.preload`).
- **`sandbox: true` preset** for untrusted Lua code: only base, coroutine, table, string, utf8 and math; neither `os`, `io`, `debug`, `package` nor `require`; `dofile`, `loadfile` and `string.dump` removed; `load` only accepts text.
- **Execution limits**: `limits: { instructions, timeMs }` option and `setLimits()`, per top-level call (`run`, `call`, `callMulti`, `callRef`, `Coroutine#resume`), via a counting hook. An overrun raises a `LimitError` (subclass of `LuaError`, `limit` = `'instructions'` or `'time'`) that the script cannot catch (`pcall` and coroutines included). Without `sandbox`, `debug.sethook` allows removing the hook.
- **Calls**: `runMulti` and `callMulti` return all return values; `callRef` and `LuaRef#call` call a Lua function obtained through `read`.
- **Conversions**: functions, threads and userdata are read as `LuaRef`; `new Userdata(value)` pushes an opaque host value (light userdata); `new LuaFloat(5)` pushes a float and the `preserveFloats` option reads `5.0` as `LuaFloat`; integers outside ±2^53 are `BigInt` (and a `BigInt` is pushed as a 64-bit integer); a string that is not valid UTF-8 is read as `Uint8Array` (and a `Uint8Array` is pushed as a byte string); a table whose keys are not all strings or integers (booleans, floats, tables, functions, binary strings, `"1"`/`1` collision) is read as `Map`, and a `Map` is pushed with its exact keys. Circular references are preserved.
- **Benchmark page**: `docs/benchmark/index.html` compares Lua in Fengari and JavaScript in the visitor’s browser; `npm run bench:build` regenerates `docs/benchmark/fengari.bundle.js`.

### Behavior changes
- A Lua table whose keys are 1..n is read as a **JavaScript array** (no longer as a `{"1": …}` object).
- `read` no longer returns `null` for a function or a userdata, and raises a `RangeError` beyond 128 nesting levels instead of truncating at 24.

### Fixes
- A Lua `__proto__` key no longer modifies the prototype of the read object.
- A `LuaRef` or a `Coroutine` from another `FengariVm` is refused instead of designating an unrelated value.
- `protectedCall` read from the current thread instead of the main state when `call` was called from a host function executed in a coroutine.
- A conversion error of a value returned by a host function becomes a Lua error instead of a raw JavaScript exception; `print` and error messages no longer crash on a `BigInt`, a function or a circular reference.
- Pushing a JavaScript number outside the safe integer range (`1e300`) no longer raises "invalid argument": it is pushed as a float.
- **Tests**: `test/fengari-vm.test.js`, `test/fengari-vm-limits.test.js`.

## Version 0.3.0

### New features
- **`<const>` and `<close>` (Lua 5.4)**: the `local x <const> = v` / `local x <close> = v` grammar is actually parsed (version 0.2.0 advertised this support without any of these programs compiling). The prefix form `local <const> x, y = 1, 2` of the fork’s 5.5 specification is also accepted. `const` and `close` remain ordinary names.
  - **`<const>`**: an assignment to the variable, including from a nested function (`attempt to assign to const variable 'x'`), is refused at compilation. A `<close>` variable is read-only in the same way.
  - **`<close>`**: new `OP_TBC` opcode (appended at the end of the table, existing opcodes do not move). The value must be nil, `false` or have a `__close` metamethod (`variable 'x' got a non-closable value`). Closings run in reverse order, with `(value, error or nil)`, at the end of the block, on `break`, `goto`, `return` (return values intact) and on error. A `return f()` in the scope of a to-be-closed variable is no longer a tail call. An error in a `__close` replaces the ongoing error and the remaining closings still run.
  - **`for ... in a, b, c, d`**: the fourth value is the loop closing value, closed at the end, on `break`, `return` or error (the register layout of `OP_TFORCALL`/`OP_TFORLOOP` now follows Lua 5.4).
  - **`coroutine.close`**, and `coroutine.wrap` closes its coroutine when it fails.
  - **C API**: `lua_closethread`, `lua_toclose`, and real `lua_resetthread` and `lua_closeslot` (the 0.2.0 versions only emptied the stack).
  - **Limitation**: a `__close` cannot yield (`coroutine.yield` fails there with "attempt to yield across a JS-call boundary").
  - **Tests**: `test/lattribs.test.js`.

## Version 0.2.0

### New features
- **`FengariVm` integration**: a persistent Lua virtual machine to maintain state between evaluations and expose JavaScript objects to Lua.
  - **`FengariVm`**: class to run Lua code with state preservation.
  - **Methods**: `run`, `call`, `defineFunction`, `push`, `read`.

- **Update to Lua 5.4**:
  - Added tokens for `const` and `<close>` in `llex.js`.
  - Modified `localstat` to handle `local const`.
  - Modified `new_localvar` to handle `<close>` variables.

- **New functions in the C API**:
  - **`lua_resetthread`**: resets a Lua thread.
  - **`lua_closeslot`**: closes a slot in a table.
- **`lua_setallocf` / `lua_getallocf` (allocation hook)**:
  - **Contract**: `allocf(ud, nsize)` is called synchronously before each internal allocation of `nsize` bytes (full size, growth reallocations included); throwing an exception refuses the allocation, like a failing C allocator (`LUA_ERRMEM`, "not enough memory"), and the state stays usable.
  - **Scope**: `luaL_prepbuffsize` (`string.rep`, `string.gsub`, `string.format`), `luaZ_resizebuffer`, VM concatenation, the undump `read`, and the other internal sites carrying a state; the stateless conversions of `defs.js` are not counted. The single passing point lives in `src/lmem.js` (JS analogue of `lmem.c`).
  - **Tests**: `test/lalloc.test.js` (set/get round-trip, observation, refusal, Lua `pcall` unable to swallow a refusal, per-state isolation).

### Fixes
- **Circular dependency resolution**:
  - Extracted `TValue` into `tvalue.js` to avoid dependencies between `llex.js` and `lobject.js`.
  - Created `lapi-ext.js` to avoid dependencies between `lapi.js` and `lstate.js`.

### Documentation
- **`FengariVm`**: documentation of the methods and usage examples.
- **New Lua 5.4 features**: documentation of `const` and `<close>`.
- **New C API functions**: documentation of `lua_resetthread` and `lua_closeslot`.

### Tests
- **Tests for the new C API functions**: verifying that `lua_resetthread` and `lua_closeslot` are properly exported and accessible.
- **Token tests**: verifying that the tokens for `const` and `<close>` are properly defined in `llex.js`.

## Version 0.1.6

### Additions
- **Extended auxiliary library**: missing `lauxlib` symbols added (including `luaL_addgsub`, `luaL_pushfail`, `luaL_typeerror`, `luaL_buffaddr`/`luaL_bufflen`/`luaL_buffsub`, `luaL_checkint`/`luaL_optint`), with their tests.

### Fixes
- **Packaging**: only `src/` is published; removed the `types` field which pointed to a `dist/fengari.d.ts` never shipped (TypeScript declarations still need to be written).
- **64-bit integers**: fixes in the string, math and table libraries; restored the official `math` ordering test.

### Documentation
- **Version consistency**: the README and the npm keywords advertised "Lua 5.5.1" while the VM reports Lua 5.4.6 (`LUA_VERSION_NUM` 504 in `defs.js`). They now describe Lua 5.4.6; the 5.5.1 alignment remains work in progress tracked in `docs/lua-5.5.1` (no M0-M9 lot completed to this day).

## Usage examples

### Using `FengariVm`
```javascript
const { FengariVm } = require('fengari');

// Create a FengariVm instance
const vm = new FengariVm();

// Run Lua code
const result = vm.run("return 42 + 8");
console.log(result); // Prints 50

// Expose a JavaScript function to Lua
vm.defineFunction('add', (a, b) => a + b);
const addResult = vm.run("return add(10, 20)");
console.log(addResult); // Prints 30
```

### Using `const` and `<close>`
```lua
-- Declare a constant variable
local x <const> = 10
-- x = 20 -- compilation error: x is constant

-- Declare a variable to close automatically
local file <close> = io.open("data.txt", "r")
-- file is automatically closed at the end of the scope
```

### Using the new C API functions
```javascript
const { lua_resetthread, lua_closeslot } = require('fengari/lapi-ext');

// Reset a Lua thread
lua_resetthread(L);

// Close a slot in a table
lua_closeslot(L, idx);
```
