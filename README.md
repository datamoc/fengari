# @datamoc/fengari

A **Lua 5.4** VM written in JavaScript ES6, targeting both **Node.js** and **browser** environments. This package implements Lua 5.4.6, including extended auxiliary library (`lauxlib`) functionality and comprehensive test coverage. Alignment with Lua 5.5.1 is in progress and tracked in [docs/lua-5.5.1](docs/lua-5.5.1); none of its milestone lots is complete yet, so the VM reports `Lua 5.4.6` through `lua.lua_version` and `_VERSION`.

## Features

- **Lua 5.4.6 compliance**: implements the Lua 5.4 language and standard libraries, plus an extended auxiliary library (`lauxlib`).
- **Cross-Platform**: Runs in Node.js and modern browsers.
- **Extensible**: Easy to integrate with existing JavaScript projects.
- **Comprehensive Testing**: Includes tests for all core and extended functionality.
- **Lua 5.5.1 alignment in progress**: the migration plan, differential oracle and conformance tracking live in [docs/lua-5.5.1](docs/lua-5.5.1).
- **Memory accounting hook**: `lua_setallocf` lets an embedder observe, bound or refuse the VM's internal string and buffer allocations; a refusal behaves like a failing C allocator (`LUA_ERRMEM`).

## Performance

Fengari interprets Lua in JavaScript, so it is much slower than native JavaScript on tight numeric loops. [`docs/benchmark`](docs/benchmark/index.html) is a self-contained page that runs the same algorithms in Lua (Fengari) and in plain JavaScript in your own browser and reports the measured slowdown. Serve the `docs/` folder with GitHub Pages to publish it, and run `npm run bench:build` to regenerate `docs/benchmark/fengari.bundle.js` after changing `src/`.

## Optional numeric compilation

`FengariVm.compile(pathOrLuaRef)` captures a Lua function and returns a reusable
JavaScript callable. Eligible pure numeric functions execute as generated
JavaScript, including complete nested numeric `for` loops:

```javascript
const { FengariVm } = require('@datamoc/fengari/src/fengari-vm.js');
const vm = new FengariVm();
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

## Offline Lua to JavaScript translation

To leave Lua behind, `lua2js` turns Lua source into JavaScript a developer can read and keep editing. It is separate from the runtime numeric compiler above: it never runs Lua, it prints idiomatic JavaScript from the source and marks what it cannot translate.

```sh
npx lua2js game.lua -o game.js --format esm   # none (default) | esm | cjs
```

```js
const { transpile } = require('@datamoc/fengari/src/ltranspile.js');
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
- Every construct that cannot be translated faithfully gets a `// TODO(lua2js): ...` comment and an entry in `warnings`. This covers metatables, coroutines, Lua patterns that have no `RegExp` equivalent (`%b`, `%f`, position captures) or are not string literals, `goto` other than `continue`, bitwise operators (JavaScript uses 32 bits) and iterators that do not return arrays. `freeGlobals` lists the globals the host must provide.
- Lua arrays are 1-based and JavaScript arrays are 0-based: indexes are shifted (`t[i]` becomes `t[i - 1]`) when the table or the index is known to be numeric; otherwise the index is left alone and flagged.
- `nil` is `undefined`. `if x` becomes `truthy(x)` (Lua treats `0` and `""` as true) unless `x` is known to be a boolean. `a or b` keeps Lua's meaning (`truthy(a) ? a : b`, or `a ?? b` when `a` is known never to be `false`); the `nullishOr` option (`--nullish-or`) always emits the shorter `a ?? b`, which differs from Lua only when `a` is `false`.
- Integers and floats are both JavaScript numbers: `2^53` and beyond, `1.0` printing as `1`, and string-to-number coercion (`"10" + 1`) are not preserved.
- Small helpers (`truthy`, `mod`, `format`, ...) are emitted at the top of the output only when used.

## Installation

```bash
npm install @datamoc/fengari
```

## Usage

### Basic Example

```javascript
const { lua, lauxlib, lualib } = require('@datamoc/fengari');

// Create a new Lua state
const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);  // Load standard libraries

// Execute Lua code
lauxlib.luaL_dostring(L, lua.to_luastring("print('Hello from Lua 5.4!')"));

// Close the Lua state
lua.lua_close(L);
```

### TypeScript

The package ships its declarations (`src/fengari.d.ts`): `import { FengariVm, LuaToJsOptions } from '@datamoc/fengari'` is typed without `@ts-expect-error`. The C-API namespaces (`lua`, `lauxlib`, `lualib`) are typed as `any`.

### Extended Auxiliary Library (`lauxlib`)

```javascript
const { lauxlib } = require('@datamoc/fengari');

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
const { lua, lauxlib, lualib } = require('@datamoc/fengari');

const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);

let budget = 1024;
lua.lua_setallocf(L, (ud, nsize) => {
    if (nsize > ud.budget) throw new Error('over budget');
}, { budget });

lauxlib.luaL_dostring(L, lua.to_luastring('return ("x"):rep(10)'));
console.log(lua.lua_tojsstring(L, -1)); // xxxxxxxxxx
```

This is the JavaScript shape of C Lua's `lua_Alloc` extension point: it is
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
- [Lua 5.5.1 alignment plan and conformance tracking](https://github.com/datamoc/fengari/tree/master/docs/lua-5.5.1)

## License

MIT © [Benoit Giannangeli](https://github.com/fengari-lua/fengari), [Daurnimator](https://github.com/daurnimator), and contributors.
