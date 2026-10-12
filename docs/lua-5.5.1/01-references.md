# References and provenance

## Normative reference

The target is the manual **shipped in the 5.5.1 distribution**, kept locally.
The [online manual](https://www.lua.org/manual/5.5/manual.html) may receive
corrections; a change of reference must be dated and explained.

| Official source | Local copy | Role |
| --- | --- | --- |
| [5.5.1 distribution](https://www.lua.org/ftp/lua-5.5.1.tar.gz) | [Archive](reference/lua-5.5.1.tar.gz) | Exact source of the port, manual and headers |
| [5.5 manual](https://www.lua.org/manual/5.5/manual.html) | [Frozen manual](reference/lua-5.5.1/doc/manual.html) | Syntax, semantics, libraries and API contracts |
| [5.5 notes](https://www.lua.org/manual/5.5/readme.html) | [Frozen notes](reference/lua-5.5.1/doc/readme.html) | New features and build instructions |
| [5.5.1 tests](https://www.lua.org/tests/lua-5.5.1-tests.tar.gz) | [Test archive](reference/lua-5.5.1-tests.tar.gz) | Tests of the exact version |
| [Test instructions](https://www.lua.org/tests/) | Protocol summarized in [Validation](06-validation.md) | Portable, complete and internal modes |
| [Downloads](https://www.lua.org/download.html) | Checksums in [manifest.json](reference/manifest.json) | Published version and provenance verification |
| [Bug history](https://www.lua.org/bugs.html) | No frozen copy | Check known bugs, without silently changing the target |

The two archives were downloaded on October 10, 2026. Their SHA-256 was
compared against the values published on the official pages:

```text
lua-5.5.1.tar.gz
1c4b4068d67061f2a2231ad2b5422e77acea1487ea9890f6320af614f4373dce

lua-5.5.1-tests.tar.gz
da07b543872dc0bb2ff12aabd0c248578d78df3eb6b67efdc537a46d455c7f31
```

## Reading the reference code

The files below are under `lua-5.5.1/src/` in the official archive.

| Area | C sources to compare |
| --- | --- |
| Lexer, scopes, declarations, code emission | `llex.c`, `lparser.c`, `lcode.c`, `lopcodes.h`, `lopcodes.c` |
| Instructions, operators and calls | `lvm.c`, `ldo.c`, `ltm.c` |
| Values, functions, states | `lobject.h`, `lobject.c`, `lfunc.c`, `lstate.h`, `lstate.c` |
| Tables, strings and memory | `ltable.c`, `lstring.c`, `lgc.c`, `lmem.c` |
| API and diagnostics | `lapi.c`, `lua.h`, `ldebug.c`, `ldebug.h` |
| Binary chunks | `ldump.c`, `lundump.c`, `lundump.h` |
| Auxiliary library | `lauxlib.c`, `lauxlib.h` |
| Standard libraries | `lbaselib.c`, `lcorolib.c`, `ldblib.c`, `liolib.c`, `lmathlib.c`, `loadlib.c`, `loslib.c`, `lstrlib.c`, `ltablib.c`, `lutf8lib.c`, `linit.c`, `lualib.h` |
| Standalone interpreter and compiler | `lua.c`, `luac.c`, `Makefile`, `luaconf.h` |

The port must start from these **5.5.1** files, not from the 5.3 or 5.4 source
pages nor from an unfrozen Git branch. The repository’s historical tests remain
regression tests; they do not replace the 5.5.1 suite.

## License and integrity

Lua is distributed under a permissive MIT-style license. The full license text
is kept in [lua.h](reference/lua-5.5.1/src/lua.h) and in
[readme.html](reference/lua-5.5.1/doc/readme.html). The original notices are
not removed. The official archives are kept unmodified.

The manifest records the size, checksum and origin of the archives, as well as
the checksum of every extracted file. Do not edit the reference copies to make
the manual match the behavior of the JS port: adaptations and deviations are
documented in the working files.
