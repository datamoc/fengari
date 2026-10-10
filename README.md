# @datamoc/fengari

A **Lua 5.5.1** VM written in JavaScript ES6, targeting both **Node.js** and **browser** environments. This package provides full compliance with Lua 5.5.1, including extended auxiliary library (`lauxlib`) functionality and comprehensive test coverage.

## Features

- **Full Lua 5.5.1 Compliance**: Implements the Lua 5.5.1 language specification, including all standard libraries and auxiliary functions.
- **Cross-Platform**: Runs in Node.js and modern browsers.
- **Extensible**: Easy to integrate with existing JavaScript projects.
- **Comprehensive Testing**: Includes tests for all core and extended functionality.

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
lauxlib.luaL_dostring(L, lua.to_luastring("print('Hello from Lua 5.5.1!')"));

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

Run the test suite to verify compliance with Lua 5.5.1:

```bash
npm test
```

For extended tests (e.g., auxiliary library functions):

```bash
npm run test:extended
```

## Documentation

- [Lua 5.5.1 Reference Manual](https://www.lua.org/manual/5.5/)
- [Fengari Lua 5.5.1 Compliance Docs](https://github.com/datamoc/fengari/tree/master/docs/lua-5.5.1)

## License

MIT © [Benoit Giannangeli](https://github.com/fengari-lua/fengari), [Daurnimator](https://github.com/daurnimator), and contributors.