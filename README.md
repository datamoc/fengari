# @datamoc/fengari

A **Lua 5.4** VM written in JavaScript ES6, targeting both **Node.js** and **browser** environments. This package implements Lua 5.4.6, including extended auxiliary library (`lauxlib`) functionality and comprehensive test coverage. Alignment with Lua 5.5.1 is in progress and tracked in [docs/lua-5.5.1](docs/lua-5.5.1); none of its milestone lots is complete yet, so the VM reports `Lua 5.4.6` through `lua.lua_version` and `_VERSION`.

## Features

- **Lua 5.4.6 compliance**: implements the Lua 5.4 language and standard libraries, plus an extended auxiliary library (`lauxlib`).
- **Cross-Platform**: Runs in Node.js and modern browsers.
- **Extensible**: Easy to integrate with existing JavaScript projects.
- **Comprehensive Testing**: Includes tests for all core and extended functionality.
- **Lua 5.5.1 alignment in progress**: the migration plan, differential oracle and conformance tracking live in [docs/lua-5.5.1](docs/lua-5.5.1).

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