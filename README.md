# Pyroeis

🔴 Pyroeis (Ancient Greek: Πυρόεις) in Greek mythology is the god of the wandering star Areios, identified with the planet Mars.

🔴 Pyroeis (en grec ancien Πυρόεις) est, dans la mythologie grecque, le dieu de l’étoile errante Areios, la planète Mars.

<img src="logo.svg" alt="Pyroeis logo" width="240">

Pyroeis is an independent project derived from [Fengari](https://github.com/fengari-lua/fengari), maintained by datamoc. Install it as `@datamoc/pyroeis`.

A **Lua 5.4** VM written in JavaScript ES6, targeting both **Node.js** and **browser** environments. This package implements Lua 5.4.6, including extended auxiliary library (`lauxlib`) functionality and comprehensive test coverage. Alignment with Lua 5.5.1 is in progress and tracked in [docs/lua-5.5.1](docs/lua-5.5.1); none of its milestone lots is complete yet, so the VM reports `Lua 5.4.6` through `lua.lua_version` and `_VERSION`.

## Features

- **Lua 5.4.6 compliance**: implements the Lua 5.4 language and standard libraries, plus an extended auxiliary library (`lauxlib`).
- **Cross-Platform**: Runs in Node.js and modern browsers.
- **Extensible**: Easy to integrate with existing JavaScript projects.
- **Comprehensive Testing**: Includes tests for all core and extended functionality.
- **Lua 5.5.1 alignment in progress**: the migration plan, differential oracle and conformance tracking live in [docs/lua-5.5.1](docs/lua-5.5.1).
- **Memory accounting hook**: `lua_setallocf` lets an embedder observe, bound or refuse the VM’s internal string and buffer allocations; a refusal behaves like a failing C allocator (`LUA_ERRMEM`).

## Performance

Pyroeis interprets Lua in JavaScript, so it is much slower than native JavaScript on tight numeric loops. [`docs/benchmark`](docs/benchmark/index.html) is a self-contained page that runs the same algorithms in Lua (Pyroeis) and in plain JavaScript in your own browser and reports the measured slowdown. Serve the `docs/` folder with GitHub Pages to publish it, and run `npm run bench:build` to regenerate `docs/benchmark/pyroeis.bundle.js` after changing `src/`.

## Optional numeric compilation

`PyroeisVm.compile(pathOrLuaRef)` captures a Lua function and returns a reusable
JavaScript callable. Eligible pure numeric functions execute as generated
JavaScript, including complete nested numeric `for` loops:

```javascript
const { PyroeisVm } = require('@datamoc/pyroeis/src/pyroeis-vm.js');
const vm = new PyroeisVm();
vm.run(`
    function sum(n)
        local s = 0
        for i = 1, n do s = s + i end
        return s
    end
`);
const sum = vm.compile('sum');
console.log(sum.compiled, sum(100000)); // true, 5000050000
sum.release(); // optional: release the captured Lua function immediately
```

This opt-in compiler supports numeric constants, parameters, locals, assignments,
`+`, `-`, `*`, `/`, `^`, unary minus, returns and integer numeric `for` loops.
Calls, globals/upvalues, tables, comparisons/branches, varargs and other bytecode
use the interpreter. Unsupported input types, integer calculations outside the
safe Number range, float loop controls, debug hooks and active execution limits
also use the interpreter. Lua integer overflow and float types are preserved;
use `LuaFloat` to explicitly pass integral floats, as with the existing VM API.

The callable returns the first result and captures the function at compilation
time; redefining its global does not replace it. `compiled` reports eligibility,
`reason` explains unsupported code, and `source` exposes the generated JavaScript
body. Eligibility does not guarantee that every invocation takes the fast path.
Generated code is cached per Lua prototype. Environments that prohibit
`new Function` (for example browser CSP without `unsafe-eval`) use the interpreter.
No generated code contains Lua source text or identifier names.

Run `node tools/benchmark-numeric.js` for a checksum-verified comparison of the
interpreter, compiled Lua and native JavaScript on your machine.

### Compilation and execution limits

`compile` is deliberately disabled while `limits` are active: the callable then
always runs in the interpreter. Generated JavaScript is not interrupted by the
instruction-counting hook, the pattern-matching interrupt points or the allocation
hook, so it would have to enforce the budget on its own, and that is a second
enforcement mechanism to get right (every loop shape, one budget shared with the
interpreter, no fresh budget after a guard falls back to the VM). Skipping it keeps
the sandbox guarantees in one place. This is not a gap to work around:
- run code you do not trust through `run`/`call` with `limits` (and `sandbox`);
- if you need the speed, call `compile` only for functions you wrote or reviewed, on a
  VM without `limits`, and keep untrusted scripts on a separate, limited VM.

## Offline Lua to JavaScript translation

To leave Lua behind, `lua2js` turns Lua source into JavaScript a developer can read and keep editing. It is separate from the runtime numeric compiler above: it never runs Lua, it prints idiomatic JavaScript from the source and marks what it cannot translate.

```sh
npx lua2js game.lua -o game.js --format esm   # none (default) | esm | cjs
```

```js
const { transpile } = require('@datamoc/pyroeis/src/ltranspile.js');
const { code, warnings, exports, freeGlobals } = transpile(luaSource, { format: 'cjs' });
```

```lua
function stats(t)
  local sum = 0
  for i, v in ipairs(t) do sum = sum + v end
  return sum, sum / #t
end
```
```js
function stats(t) {
    let sum = 0;
    for (let i = 1; i <= t.length; i++) {
        const v = t[i - 1];
        sum += v;
    }
    return [sum, sum / t.length];
}
```

What is translated: locals (`const`/`let`, renamed on shadowing or JS reserved words), functions and closures (arrows when a single expression), `if`/`while`/`repeat`/numeric and generic `for`, `goto continue`, `and`/`or` ternary idioms, string concatenation (template literals), tables as arrays or objects (inferred from use), multiple returns (arrays, inferred per function), varargs, methods, Lua patterns with a literal pattern string (`find`, `match`, `gmatch`, `gsub`, converted to `RegExp`), and the common parts of `math`, `string`, `table`, `os` and `io`.

An online version lives in `docs/lua2js/index.html`: paste Lua, read the JavaScript, and benchmark both in your browser.

Things to know before trusting the output:
- Every construct that cannot be translated faithfully gets a `// TODO(lua2js): ...` comment and an entry in `warnings`. This covers metatables, coroutines, Lua patterns that have no `RegExp` equivalent (`%b`, `%f`, position captures) or are not string literals, `goto` other than `continue`, bitwise operators (JavaScript uses 32 bits) and iterators that do not return arrays. `freeGlobals` lists the globals the host must provide. A warning with `unsafe: true` marks a construct that reaches the JavaScript environment (`eval`, `Function`, `globalThis`, `process`, `fetch`...) or a prototype (`t.__proto__`, `t.constructor`): translated code is plain JavaScript, not a sandbox, so do not run the translation of untrusted Lua.
- Lua arrays are 1-based and JavaScript arrays are 0-based: indexes are shifted (`t[i]` becomes `t[i - 1]`) when the table or the index is known to be numeric; otherwise the index is left alone and flagged.
- `nil` is `undefined`. `if x` becomes `truthy(x)` (Lua treats `0` and `""` as true) unless `x` is known to be a boolean. `a or b` keeps Lua’s meaning (`truthy(a) ? a : b`, or `a ?? b` when `a` is known never to be `false`); the `nullishOr` option (`--nullish-or`) always emits the shorter `a ?? b`, which differs from Lua only when `a` is `false`.
- Integers and floats are both JavaScript numbers: `2^53` and beyond, `1.0` printing as `1`, and string-to-number coercion (`"10" + 1`) are not preserved.
- Small helpers (`truthy`, `mod`, `format`, ...) are emitted at the top of the output only when used.

## Installation

```bash
npm install @datamoc/pyroeis
```

## Usage

### Basic Example

```javascript
const { lua, lauxlib, lualib } = require('@datamoc/pyroeis');

// Create a new Lua state
const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);  // Load standard libraries

// Execute Lua code
lauxlib.luaL_dostring(L, lua.to_luastring("print('Hello from Lua 5.4!')"));

// Close the Lua state
lua.lua_close(L);
```

### TypeScript

The package ships its declarations (`src/pyroeis.d.ts`): `import { PyroeisVm, LuaToJsOptions } from '@datamoc/pyroeis'` is typed without `@ts-expect-error`. The C-API namespaces (`lua`, `lauxlib`, `lualib`) are typed as `any`.

### Why Pyroeis has its own JavaScript ↔ Lua exchange API

Pyroeis uses Lua for application rules, game strategies and scripts whose host
controls the available operations. `PyroeisVm` therefore converts ordinary
JavaScript objects, arrays and maps into Lua tables, reads Lua tables back as
JavaScript data, and exposes host operations through `defineFunction`. A copied
table does not provide a live handle to the original JavaScript object.

[`fengari-interop`](https://github.com/fengari-lua/fengari-interop) serves a
different integration model: JavaScript objects remain accessible through
userdata, Lua values can be wrapped for use from JavaScript, and its `js`
library includes access to the JavaScript global environment. That model is
useful for trusted Lua code that needs to work directly with JavaScript APIs.
Our default interface keeps scripts working with Lua data and a host-selected
set of functions instead of granting that general bridge.

This choice also keeps calls, Lua references, coroutines, error handling and
execution budgets within the same VM API. `BigInt`, binary strings,
`LuaFloat`, `Multi` and `Yield` have explicit conversions. Functions, threads
and full userdata use VM-owned `LuaRef` handles; ordinary tables are snapshots.
The MWG demo takes this approach further: it sends target descriptions into a
worker and accepts a validated target index, while the host retains the map,
pathfinder and rendering objects.

The tradeoff is conversion work and the absence of automatic shared-object
identity, prototypes or metatable behavior for copied data. JavaScript cycles
cannot currently be pushed as tables; Lua table cycles are preserved when read.
Callbacks remain trusted host code: execution budgets cannot preempt arbitrary
JavaScript or cover all its allocations. This API is not a complete isolation
mechanism, and `fengari-interop` is not inherently unsafe merely because it
offers broader access.

The upstream bridge imports `fengari` and declares it as a peer dependency;
it is not a supported drop-in bridge for `@datamoc/pyroeis`. Using or porting
it would require validating the VM and C-API compatibility as well as the
authority exposed to scripts. See the [detailed design and examples](https://datamoc.github.io/pyroeis/interop/)
and the upstream [implementation](https://github.com/fengari-lua/fengari-interop/blob/e1eec1af192898cd6786bcd108e22feb40b097e3/src/js.js)
and [package manifest](https://github.com/fengari-lua/fengari-interop/blob/e1eec1af192898cd6786bcd108e22feb40b097e3/package.json).

### Extended Auxiliary Library (`lauxlib`)

```javascript
const { lauxlib } = require('@datamoc/pyroeis');

// Example: Using luaL_addgsub for string substitution
const B = new lauxlib.luaL_Buffer();
lauxlib.luaL_buffinit(L, B);
lauxlib.luaL_addgsub(B, lua.to_luastring("hello world"), lua.to_luastring("world"), lua.to_luastring("Lua"));
lauxlib.luaL_pushresult(B);
```

### Memory Accounting Hook (`lua_setallocf`)

`lua_setallocf(L, allocf, ud)` installs a per-state hook called synchronously as
`allocf(ud, nsize)` immediately before each internal `Uint8Array` allocation of
`nsize` bytes (the full new size, growth reallocations included). Returning
normally permits the allocation; throwing refuses it, which aborts the
enclosing protected call with status `LUA_ERRMEM` and the standard
"not enough memory" error object, leaving the state usable. `lua_getallocf(L)`
returns `[allocf, ud]`.

```javascript
const { lua, lauxlib, lualib } = require('@datamoc/pyroeis');

const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);

let budget = 1024;
lua.lua_setallocf(L, (ud, nsize) => {
    if (nsize > ud.budget) throw new Error('over budget');
}, { budget });

lauxlib.luaL_dostring(L, lua.to_luastring('return ("x"):rep(10)'));
console.log(lua.lua_tojsstring(L, -1)); // xxxxxxxxxx
```

This is the JavaScript shape of C Lua’s `lua_Alloc` extension point: it is
accounting, not ownership (the JavaScript engine owns the memory, and there are
no free notifications). Not charged: the stateless `to_luastring` conversions
an embedder drives itself, zero-size allocations, and the few internal
temporaries whose site has no `lua_State` at hand. See `src/lmem.js` for the
exact contract.

## Testing

Run the test suite:

```bash
npm test
```

For extended tests (e.g., auxiliary library functions):

```bash
npm run test:extended
```

## Documentation

- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
- [Lua 5.5.1 alignment plan and conformance tracking](https://github.com/datamoc/pyroeis/tree/master/docs/lua-5.5.1)

## License

MIT © [Benoit Giannangeli](https://github.com/fengari-lua/fengari), [Daurnimator](https://github.com/daurnimator), and contributors.

## Migration from @datamoc/fengari

Install `@datamoc/pyroeis` and update your imports. Use `PyroeisVm` for the high-level VM API. The legacy `src/fengari*` entry points and the `FengariVm` alias were removed; use `src/pyroeis.js` / `src/pyroeis-vm.js` and `PyroeisVm`. The browser bundle exposes `Pyroeis` only. Version 0.6.0 removes the remaining Fengari names: the Lua library `fengari` is now `pyroeis`, the constants `FENGARI_*` are `PYROEIS_*` (and describe Pyroeis, not Fengari), `luaopen_fengari` is `luaopen_pyroeis`, `LUA_FENGARILIBNAME` is `LUA_PYROEISLIBNAME`, the `libs` option takes `'pyroeis'`, and the configuration is read from the `PYROEISCONF` environment variable (a JSON object such as `{"LUAI_MAXSTACK":100000}`) instead of `FENGARICONF`.

## Interactive demos

The [Pyroeis website](https://datamoc.github.io/pyroeis/) includes [execution-limit reproductions](https://datamoc.github.io/pyroeis/security/), [four-mode benchmarks](https://datamoc.github.io/pyroeis/benchmark/), the [Lua-to-JavaScript translator](https://datamoc.github.io/pyroeis/lua2js/) and a [Lua-controlled MWG robot](https://datamoc.github.io/pyroeis/mwg/).

Run `npm run pages:build` to generate the browser bundles and retrieve the pinned demo dependencies with SHA-512 verification, then serve `docs/` over HTTP (for example, `python -m http.server 8765 --directory docs`). The GitHub Pages workflow builds and deploys the same folder on pushes to `master`.
