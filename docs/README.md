# Project documentation

Technical documentation is kept in this directory, in Markdown format.

## Migration to Lua 5.5.1

The [Lua 5.5.1 folder](lua-5.5.1/README.md) contains the frozen official
references, the state of the repository, the conformance requirements, the
proposed architecture, the implementation plan and the validation strategy.

The current implementation is not conformant to Lua 5.5.1 as a whole. The
documents separate observations, requirements and decisions still open.

## Lua to JavaScript translation

`lua2js` (`src/lua2js.js`, `FengariVm.toJs`) translates Lua source to readable
JavaScript for projects leaving Lua. Usage, the mapping choices and the known
differences are described in the "Offline Lua to JavaScript translation"
section of the [main README](../README.md).
