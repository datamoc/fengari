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