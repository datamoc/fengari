# Lua 5.5.1 conformance requirements

The identifiers below link implementation, tests and decisions. All of them are
**to implement or to audit** at the start. The frozen manual is authoritative;
these requirements are a working guide, not a replacement specification. The
[inventories](inventaire-api.md) complement the rows that group many APIs.

## Cover the whole specification

| ID | Local manual reference | Requirement and expected evidence |
| --- | --- | --- |
| L01 | [§2.1](reference/lua-5.5.1/doc/manual.html#2.1) | Eight types, object identity, nil/false, integers/floats, byte strings; value and conversion tests |
| L02 | [§2.2](reference/lua-5.5.1/doc/manual.html#2.2) | Lexical scopes, upvalues, `_ENV`, global environment and declarations; capture and shadowing tests |
| L03 | [§2.3](reference/lua-5.5.1/doc/manual.html#2.3) | Protected errors, handlers, panic and warnings; nested tests and host errors |
| L04 | [§2.4](reference/lua-5.5.1/doc/manual.html#2.4) | Set of metamethods, lookup order, raw access, `__call` chains; a test per event |
| L05 | [§2.5](reference/lua-5.5.1/doc/manual.html#2.5) | GC modes, parameters, roots, finalization, resurrection, weak tables and ephemerons; cycle and resource tests |
| L06 | [§2.6](reference/lua-5.5.1/doc/manual.html#2.6) | Coroutine states, transfers, yields, closing and errors; transition and continuation tests |
| L07 | [§3.1](reference/lua-5.5.1/doc/manual.html#3.1) | Full lexer: keywords, comments, literals, escapes and syntax errors |
| L08 | [§3.2–3.3](reference/lua-5.5.1/doc/manual.html#3.2) | Variables, blocks, assignments, control, labels/goto, loops and declarations; scope and boundary tests |
| L09 | [§3.4](reference/lua-5.5.1/doc/manual.html#3.4) | All operators, precedences, coercions, constructors, calls, varargs and multi-result adjustment |
| L10 | [§2.2](reference/lua-5.5.1/doc/manual.html#2.2) | Variable visibility and closures, including reentrancy and scopes created in loops |
| A01 | [§4](reference/lua-5.5.1/doc/manual.html#4) | API contract: stack, pseudo-indices, registry, callbacks, errors, yields, allocators and pointer stability; explicit JS contract |
| A02 | [§4.6](reference/lua-5.5.1/doc/manual.html#4.6) | Every documented function/type/constant: signature, results, stack effect, errors and yields; test identified by inventory entry |
| A03 | [§5](reference/lua-5.5.1/doc/manual.html#5) | Every auxiliary library function/type, buffers, refs, loaders and diagnostics |
| B01 | [§6.1](reference/lua-5.5.1/doc/manual.html#6.1) | Selective loading and preloading of libraries; `LUA_*LIBK` masks and `luaL_openselectedlibs` |
| B02 | [§6.2](reference/lua-5.5.1/doc/manual.html#6.2) | Complete base library, including `warn`, collectgarbage, loaders, errors and environment |
| B03 | [§6.3](reference/lua-5.5.1/doc/manual.html#6.3) | Coroutine: create/resume/yield/wrap/running/status/isyieldable/close, optional arguments and errors |
| B04 | [§6.4](reference/lua-5.5.1/doc/manual.html#6.4) | Package: require, searchers, searchpath, paths, loaded/preload, loader data and loadlib |
| B05 | [§6.5](reference/lua-5.5.1/doc/manual.html#6.5) | String: all functions, patterns, formats, pack/unpack/packsize, dump and binary strings |
| B06 | [§6.6](reference/lua-5.5.1/doc/manual.html#6.6) | UTF-8: validation, lenient mode, indices, iteration and the double result of offset |
| B07 | [§6.7](reference/lua-5.5.1/doc/manual.html#6.7) | Table: complete operations, applicable metamethods, sequences and `table.create` |
| B08 | [§6.8](reference/lua-5.5.1/doc/manual.html#6.8) | Math: numeric profile, rounding, random/randomseed, limits and conversions |
| B09 | [§6.9](reference/lua-5.5.1/doc/manual.html#6.9) | IO: functions and file methods, formats, iterators, closing, modes and system errors |
| B10 | [§6.10](reference/lua-5.5.1/doc/manual.html#6.10) | OS: dates, locales, environment, files, commands and portable/non-portable results |
| B11 | [§6.11](reference/lua-5.5.1/doc/manual.html#6.11) | Debug: hooks, information, locals, upvalues, indexed user values and named varargs |
| D01 | [§7](reference/lua-5.5.1/doc/manual.html#7) | Standalone interpreter: options, init, arg, stdin/REPL, warnings and closing; a component to identify, not an implicit omission |
| D02 | [§8](reference/lua-5.5.1/doc/manual.html#8) | All 5.4→5.5 incompatibilities covered by migration tests; no silent compatibility options |
| D03 | [§9](reference/lua-5.5.1/doc/manual.html#9) | Complete grammar: acceptance/rejection corpus and precedence tests |
| V01 | [Source: lopcodes.h](reference/lua-5.5.1/src/lopcodes.h) | Full 5.5.1 instruction set, encoding, registers, constants and flags; emission/execution coupled |
| V02 | [§4.6 lua_load](reference/lua-5.5.1/doc/manual.html#lua_load) | Text/binary chunks, modes, chunked readers, truncated data and format incompatibilities |
| V03 | [§4.6 lua_dump](reference/lua-5.5.1/doc/manual.html#lua_dump) | Valid 5.5.1 chunks, writer protocol, debug stripping and compatibility with the oracle profile |
| P01 | [Architecture](04-architecture.md) | No reintroduced import cycle; cold start, browser and JS integration preserved |

## Language changes to implement explicitly

### Attributes and closing inherited from Lua 5.4, specified by 5.5

The parser must recognize the attributes according to
[§3.3.7](reference/lua-5.5.1/doc/manual.html#3.3.7) and their scope. In 5.5, an
attribute may also precede the name list. `const` and `close` are attribute
names, not extra keywords to invent.

- A read-only variable rejects assignments, including through a closure.
- `<close>` is reserved for local variables; a list contains at most one such
  variable.
- The value to close must be nil, false or provide `__close`.
- Close in reverse order on normal exit, break, goto, return and errors.
- On error, pass the error object to `__close`; without error, respect the
  absence of a second argument from the 5.5.1 manual, checked notably with
  `select('#', ...)`.
- An error in one closing does not exempt from running the other closings.
- A suspended coroutine keeps its resources; explicit closing releases them
  according to the contract. Do not confuse deterministic `__close` and `__gc`.

### 5.5 global declarations

`global` becomes a keyword. Implement name declarations, attributes,
`global *`, `global<const> *` and `global function`, with the appropriate
lexical state. A global declaration with an initialization fails at run time if
the existing value is not nil; a declaration without initialization does not
erase it. Declarations control syntactic accesses; they do not make `_G`
physically immutable. Test accesses through `_ENV`, blocks and closures.

### Named varargs and loops

`function(...args)` binds a read-only local to a table holding the arguments and
their count in `args.n`. The table stays mutable: modifying its entries or `n`
can modify the values produced by `...`. Do not replace this contract with a
plain copy detached from the stack. Test capture, returning the table, nil
values, zero arguments, modifications and optimized forms, with
[§3.4.11](reference/lua-5.5.1/doc/manual.html#3.4.11).

The control variables of numeric and generic for loops are read-only. Test
direct and captured assignment, as well as shadowing by a local.

### Other incompatibilities

Apply the 15-object limit in a `__call` chain, the replacement of a nil error
object by a message, and the decimal conversion of floats allowing lossless
round-tripping. The internal 5.5 optimizations (array size, string sharing,
optimized varargs) may be ported after the semantics, but the observable
contracts must not be delayed along with them.

## High-risk API points

Read the full contracts in the manual and the signatures in the frozen headers:

- `lua_newstate` receives a hash seed; `luaL_makeseed` must have a host contract.
- `lua_resume` and continuation handling change compared to the 5.3 base;
  define how the number of results is carried in the JS API.
- `lua_closethread`, `lua_toclose`, `lua_closeslot`, `lua_settop` and `lua_close`
  must take part in closing resources. `lua_resetthread` is deprecated in 5.5.
- Userdata: `lua_newuserdatauv`, indexed user values and associated functions.
- Warnings: `lua_setwarnf`, `lua_warning`, fragments and host callback.
- External strings: `lua_pushexternalstring`, byte stability and release callback.
- `lua_call` and related functions: at most 250 explicitly requested results;
  `LUA_MULTRET` keeps its distinct contract.
- `lua_dump`: stack and last call to the writer per the 5.5.1 contract.
- `lua_pushvfstring` reports its errors per the new contract; do not
  automatically keep the behavior that raised an error.
- GC: `LUA_GCPARAM` and the six header parameters; distinction of modes and settings.
- `luaL_openselectedlibs` loads/preloads according to the masks; `luaL_openlibs`
  keeps the derived behavior defined by `lualib.h`.

This set is not an exhaustive list of APIs: every entry of the
[inventory](inventaire-api.md) must be handled, even if its name existed in 5.3.
