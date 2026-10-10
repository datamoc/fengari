# Inventaire des API Lua 5.5.1

Capture : 2026-10-10T10:23:54.446Z.

Généré depuis les en-têtes et ancres du manuel livré avec 5.5.1, rapprochés du worktree actuel.
**La présence d'un export ne valide pas son contrat.** Les macros de configuration/build et types C demandent une classification explicite, pas forcément un export JS.

Les méthodes de fichiers exigent une fixture de fichier. Les autres entrées de bibliothèques sont sondées sous Node uniquement : leur type ne valide pas leur comportement ni leur disponibilité navigateur.

Données détaillées : [inventaire-api.json](inventaire-api.json). Actualisation : `node docs/lua-5.5.1/tools/capture-baseline.cjs`.

## API, types et macros (341 entrées)

| Symbole | Module JS | Nature | Type observé | Statut | Référence |
| --- | --- | --- | --- | --- | --- |
| `LUA_ERRFILE` | lauxlib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRFILE) |
| `LUA_FILEHANDLE` | lauxlib | constant-or-build-macro | object | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `LUA_GNAME` | lauxlib | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `LUA_LOADED_TABLE` | lauxlib | constant-or-build-macro | object | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_LOADED_TABLE) |
| `LUA_NOREF` | lauxlib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_NOREF) |
| `LUA_PRELOAD_TABLE` | lauxlib | constant-or-build-macro | object | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_PRELOAD_TABLE) |
| `LUA_REFNIL` | lauxlib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_REFNIL) |
| `luaL_addchar` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_addchar) |
| `luaL_addgsub` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_addgsub) |
| `luaL_addlstring` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_addlstring) |
| `luaL_addsize` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_addsize) |
| `luaL_addstring` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_addstring) |
| `luaL_addvalue` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_addvalue) |
| `luaL_alloc` | lauxlib | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_alloc) |
| `luaL_argcheck` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_argcheck) |
| `luaL_argerror` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_argerror) |
| `luaL_argexpected` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_argexpected) |
| `luaL_buffaddr` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_buffaddr) |
| `luaL_Buffer` | lauxlib | type | function | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_Buffer) |
| `luaL_buffinit` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_buffinit) |
| `luaL_buffinitsize` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_buffinitsize) |
| `luaL_bufflen` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_bufflen) |
| `luaL_buffsub` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_buffsub) |
| `luaL_callmeta` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_callmeta) |
| `luaL_checkany` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checkany) |
| `luaL_checkint` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `luaL_checkinteger` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checkinteger) |
| `luaL_checklong` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `luaL_checklstring` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checklstring) |
| `luaL_checknumber` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checknumber) |
| `luaL_checkoption` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checkoption) |
| `luaL_checkstack` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checkstack) |
| `luaL_checkstring` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checkstring) |
| `luaL_checktype` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checktype) |
| `luaL_checkudata` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checkudata) |
| `luaL_checkunsigned` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `luaL_checkversion` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_checkversion) |
| `luaL_checkversion_` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `luaL_dofile` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_dofile) |
| `luaL_dostring` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_dostring) |
| `luaL_error` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_error) |
| `luaL_execresult` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_execresult) |
| `luaL_fileresult` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_fileresult) |
| `luaL_getmetafield` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_getmetafield) |
| `luaL_getmetatable` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_getmetatable) |
| `luaL_getsubtable` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_getsubtable) |
| `luaL_gsub` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_gsub) |
| `luaL_intop` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `luaL_len` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_len) |
| `luaL_loadbuffer` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_loadbuffer) |
| `luaL_loadbufferx` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_loadbufferx) |
| `luaL_loadfile` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_loadfile) |
| `luaL_loadfilex` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_loadfilex) |
| `luaL_loadstring` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_loadstring) |
| `luaL_makeseed` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_makeseed) |
| `luaL_newlib` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_newlib) |
| `luaL_newlibtable` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_newlibtable) |
| `luaL_newmetatable` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_newmetatable) |
| `luaL_newstate` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_newstate) |
| `LUAL_NUMSIZES` | lauxlib | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `luaL_opt` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_opt) |
| `luaL_optint` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `luaL_optinteger` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_optinteger) |
| `luaL_optlong` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `luaL_optlstring` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_optlstring) |
| `luaL_optnumber` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_optnumber) |
| `luaL_optstring` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_optstring) |
| `luaL_optunsigned` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lauxlib.h) |
| `luaL_prepbuffer` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_prepbuffer) |
| `luaL_prepbuffsize` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_prepbuffsize) |
| `luaL_pushfail` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_pushfail) |
| `luaL_pushresult` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_pushresult) |
| `luaL_pushresultsize` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_pushresultsize) |
| `luaL_ref` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_ref) |
| `luaL_Reg` | lauxlib | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_Reg) |
| `luaL_requiref` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_requiref) |
| `luaL_setfuncs` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_setfuncs) |
| `luaL_setmetatable` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_setmetatable) |
| `luaL_Stream` | lauxlib | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_Stream) |
| `luaL_testudata` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_testudata) |
| `luaL_tolstring` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_tolstring) |
| `luaL_traceback` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_traceback) |
| `luaL_typeerror` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_typeerror) |
| `luaL_typename` | lauxlib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_typename) |
| `luaL_unref` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_unref) |
| `luaL_where` | lauxlib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_where) |
| `lua_absindex` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_absindex) |
| `lua_Alloc` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_Alloc) |
| `lua_arith` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_arith) |
| `lua_atpanic` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_atpanic) |
| `LUA_AUTHORS` | lua | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `lua_call` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_call) |
| `lua_callk` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_callk) |
| `lua_CFunction` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_CFunction) |
| `lua_checkstack` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_checkstack) |
| `lua_close` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_close) |
| `lua_closeslot` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_closeslot) |
| `lua_closethread` | lua | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_closethread) |
| `lua_compare` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_compare) |
| `lua_concat` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_concat) |
| `lua_copy` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_copy) |
| `LUA_COPYRIGHT` | lua | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `lua_createtable` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_createtable) |
| `lua_Debug` | lua | type | function | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_Debug) |
| `lua_dump` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_dump) |
| `LUA_ERRERR` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRERR) |
| `LUA_ERRMEM` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRMEM) |
| `lua_error` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_error) |
| `LUA_ERRRUN` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRRUN) |
| `LUA_ERRSYNTAX` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRSYNTAX) |
| `lua_gc` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_gc) |
| `LUA_GCCOLLECT` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCCOLLECT) |
| `LUA_GCCOUNT` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCCOUNT) |
| `LUA_GCCOUNTB` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCCOUNTB) |
| `LUA_GCGEN` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCGEN) |
| `LUA_GCINC` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCINC) |
| `LUA_GCISRUNNING` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCISRUNNING) |
| `LUA_GCPARAM` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPARAM) |
| `LUA_GCPMAJORMINOR` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPMAJORMINOR) |
| `LUA_GCPMINORMAJOR` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPMINORMAJOR) |
| `LUA_GCPMINORMUL` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPMINORMUL) |
| `LUA_GCPN` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_GCPPAUSE` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPPAUSE) |
| `LUA_GCPSTEPMUL` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPSTEPMUL) |
| `LUA_GCPSTEPSIZE` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPSTEPSIZE) |
| `LUA_GCRESTART` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCRESTART) |
| `LUA_GCSTEP` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCSTEP) |
| `LUA_GCSTOP` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCSTOP) |
| `lua_getallocf` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getallocf) |
| `lua_getextraspace` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getextraspace) |
| `lua_getfield` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getfield) |
| `lua_getglobal` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getglobal) |
| `lua_gethook` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_gethook) |
| `lua_gethookcount` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_gethookcount) |
| `lua_gethookmask` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_gethookmask) |
| `lua_geti` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_geti) |
| `lua_getinfo` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getinfo) |
| `lua_getiuservalue` | lua | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getiuservalue) |
| `lua_getlocal` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getlocal) |
| `lua_getmetatable` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getmetatable) |
| `lua_getstack` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getstack) |
| `lua_gettable` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_gettable) |
| `lua_gettop` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_gettop) |
| `lua_getupvalue` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_getupvalue) |
| `lua_getuservalue` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `lua_Hook` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_Hook) |
| `LUA_HOOKCALL` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKCALL) |
| `LUA_HOOKCOUNT` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKCOUNT) |
| `LUA_HOOKLINE` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKLINE) |
| `LUA_HOOKRET` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKRET) |
| `LUA_HOOKTAILCALL` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKTAILCALL) |
| `lua_insert` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_insert) |
| `lua_Integer` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_Integer) |
| `lua_isboolean` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isboolean) |
| `lua_iscfunction` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_iscfunction) |
| `lua_isfunction` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isfunction) |
| `lua_isinteger` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isinteger) |
| `lua_islightuserdata` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_islightuserdata) |
| `lua_isnil` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isnil) |
| `lua_isnone` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isnone) |
| `lua_isnoneornil` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isnoneornil) |
| `lua_isnumber` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isnumber) |
| `lua_isstring` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isstring) |
| `lua_istable` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_istable) |
| `lua_isthread` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isthread) |
| `lua_isuserdata` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isuserdata) |
| `lua_isyieldable` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_isyieldable) |
| `lua_KContext` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_KContext) |
| `lua_KFunction` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_KFunction) |
| `lua_len` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_len) |
| `lua_load` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_load) |
| `LUA_MASKCALL` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MASKCALL) |
| `LUA_MASKCOUNT` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MASKCOUNT) |
| `LUA_MASKLINE` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MASKLINE) |
| `LUA_MASKRET` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MASKRET) |
| `LUA_MINSTACK` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MINSTACK) |
| `LUA_MULTRET` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MULTRET) |
| `LUA_N2SBUFFSZ` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_N2SBUFFSZ) |
| `lua_newstate` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_newstate) |
| `lua_newtable` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_newtable) |
| `lua_newthread` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_newthread) |
| `lua_newuserdata` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `lua_newuserdatauv` | lua | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_newuserdatauv) |
| `lua_next` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_next) |
| `lua_Number` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_Number) |
| `lua_numbertocstring` | lua | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_numbertocstring) |
| `lua_numbertointeger` | lua | documented-api | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_numbertointeger) |
| `LUA_NUMTYPES` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_OK` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OK) |
| `LUA_OPADD` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPADD) |
| `LUA_OPBAND` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPBAND) |
| `LUA_OPBNOT` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPBNOT) |
| `LUA_OPBOR` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPBOR) |
| `LUA_OPBXOR` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPBXOR) |
| `LUA_OPDIV` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPDIV) |
| `LUA_OPEQ` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPEQ) |
| `LUA_OPIDIV` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPIDIV) |
| `LUA_OPLE` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPLE) |
| `LUA_OPLT` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPLT) |
| `LUA_OPMOD` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPMOD) |
| `LUA_OPMUL` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPMUL) |
| `LUA_OPPOW` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPPOW) |
| `LUA_OPSHL` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPSHL) |
| `LUA_OPSHR` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPSHR) |
| `LUA_OPSUB` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPSUB) |
| `LUA_OPUNM` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPUNM) |
| `lua_pcall` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pcall) |
| `lua_pcallk` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pcallk) |
| `lua_pop` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pop) |
| `lua_pushboolean` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushboolean) |
| `lua_pushcclosure` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushcclosure) |
| `lua_pushcfunction` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushcfunction) |
| `lua_pushexternalstring` | lua | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushexternalstring) |
| `lua_pushfstring` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushfstring) |
| `lua_pushglobaltable` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushglobaltable) |
| `lua_pushinteger` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushinteger) |
| `lua_pushlightuserdata` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushlightuserdata) |
| `lua_pushliteral` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushliteral) |
| `lua_pushlstring` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushlstring) |
| `lua_pushnil` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushnil) |
| `lua_pushnumber` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushnumber) |
| `lua_pushstring` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushstring) |
| `lua_pushthread` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushthread) |
| `lua_pushvalue` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushvalue) |
| `lua_pushvfstring` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_pushvfstring) |
| `lua_rawequal` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_rawequal) |
| `lua_rawget` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_rawget) |
| `lua_rawgeti` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_rawgeti) |
| `lua_rawgetp` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_rawgetp) |
| `lua_rawlen` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_rawlen) |
| `lua_rawset` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_rawset) |
| `lua_rawseti` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_rawseti) |
| `lua_rawsetp` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_rawsetp) |
| `lua_Reader` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_Reader) |
| `lua_register` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_register) |
| `LUA_REGISTRYINDEX` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_REGISTRYINDEX) |
| `LUA_RELEASE` | lua | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `lua_remove` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_remove) |
| `lua_replace` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_replace) |
| `lua_resetthread` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `lua_resume` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_resume) |
| `LUA_RIDX_GLOBALS` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_RIDX_GLOBALS) |
| `LUA_RIDX_LAST` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_RIDX_MAINTHREAD` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_RIDX_MAINTHREAD) |
| `lua_rotate` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_rotate) |
| `lua_setallocf` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_setallocf) |
| `lua_setfield` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_setfield) |
| `lua_setglobal` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_setglobal) |
| `lua_sethook` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_sethook) |
| `lua_seti` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_seti) |
| `lua_setiuservalue` | lua | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_setiuservalue) |
| `lua_setlocal` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_setlocal) |
| `lua_setmetatable` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_setmetatable) |
| `lua_settable` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_settable) |
| `lua_settop` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_settop) |
| `lua_setupvalue` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_setupvalue) |
| `lua_setuservalue` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `lua_setwarnf` | lua | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_setwarnf) |
| `LUA_SIGNATURE` | lua | constant-or-build-macro | object | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `lua_State` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_State) |
| `lua_status` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_status) |
| `lua_stringtonumber` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_stringtonumber) |
| `LUA_TBOOLEAN` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TBOOLEAN) |
| `LUA_TFUNCTION` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TFUNCTION) |
| `LUA_TLIGHTUSERDATA` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TLIGHTUSERDATA) |
| `LUA_TNIL` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TNIL) |
| `LUA_TNONE` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TNONE) |
| `LUA_TNUMBER` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TNUMBER) |
| `lua_toboolean` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_toboolean) |
| `lua_tocfunction` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_tocfunction) |
| `lua_toclose` | lua | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_toclose) |
| `lua_tointeger` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_tointeger) |
| `lua_tointegerx` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_tointegerx) |
| `lua_tolstring` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_tolstring) |
| `lua_tonumber` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_tonumber) |
| `lua_tonumberx` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_tonumberx) |
| `lua_topointer` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_topointer) |
| `lua_tostring` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_tostring) |
| `lua_tothread` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_tothread) |
| `lua_touserdata` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_touserdata) |
| `LUA_TSTRING` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TSTRING) |
| `LUA_TTABLE` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TTABLE) |
| `LUA_TTHREAD` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TTHREAD) |
| `LUA_TUSERDATA` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TUSERDATA) |
| `lua_type` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_type) |
| `lua_typename` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_typename) |
| `lua_Unsigned` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_Unsigned) |
| `lua_upvalueid` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_upvalueid) |
| `lua_upvalueindex` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_upvalueindex) |
| `lua_upvaluejoin` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_upvaluejoin) |
| `lua_version` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_version) |
| `LUA_VERSION` | lua | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_VERSION_MAJOR` | lua | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_VERSION_MAJOR_N` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_VERSION_MINOR` | lua | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_VERSION_MINOR_N` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_VERSION_NUM` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_VERSION_RELEASE` | lua | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_VERSION_RELEASE_N` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_VERSION_RELEASE_NUM` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lua.h) |
| `lua_WarnFunction` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_WarnFunction) |
| `lua_warning` | lua | function | absent | export-absent | [officiel](reference/lua-5.5.1/doc/manual.html#lua_warning) |
| `lua_Writer` | lua | type | absent | contrat-type-a-definir | [officiel](reference/lua-5.5.1/doc/manual.html#lua_Writer) |
| `lua_xmove` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_xmove) |
| `lua_yield` | lua | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_yield) |
| `LUA_YIELD` | lua | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_YIELD) |
| `lua_yieldk` | lua | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#lua_yieldk) |
| `LUAI_TOSTR` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUAI_TOSTRAUX` | lua | constant-or-build-macro | absent | export-ou-adaptation-a-auditer | [officiel](reference/lua-5.5.1/src/lua.h) |
| `LUA_COLIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_COLIBK) |
| `LUA_COLIBNAME` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `LUA_DBLIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_DBLIBK) |
| `LUA_DBLIBNAME` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `LUA_GLIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GLIBK) |
| `LUA_IOLIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_IOLIBK) |
| `LUA_IOLIBNAME` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `LUA_LOADLIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_LOADLIBK) |
| `LUA_LOADLIBNAME` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `LUA_MATHLIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MATHLIBK) |
| `LUA_MATHLIBNAME` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `LUA_OSLIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OSLIBK) |
| `LUA_OSLIBNAME` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `LUA_STRLIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_STRLIBK) |
| `LUA_STRLIBNAME` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `LUA_TABLIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TABLIBK) |
| `LUA_TABLIBNAME` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `LUA_UTF8LIBK` | lualib | constant-or-build-macro | number | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_UTF8LIBK) |
| `LUA_UTF8LIBNAME` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `LUA_VERSUFFIX` | lualib | constant-or-build-macro | string | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaL_openlibs` | lualib | macro-function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_openlibs) |
| `luaL_openselectedlibs` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#luaL_openselectedlibs) |
| `luaopen_base` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaopen_coroutine` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaopen_debug` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaopen_io` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaopen_math` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaopen_os` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaopen_package` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaopen_string` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaopen_table` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |
| `luaopen_utf8` | lualib | function | function | present-contrat-non-verifie | [officiel](reference/lua-5.5.1/src/lualib.h) |

## Bibliothèques standard (161 entrées documentées)

| Entrée | Type observé / état | Référence |
| --- | --- | --- |
| `_G` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-_G) |
| `_PROMPT` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-_PROMPT) |
| `_PROMPT2` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-_PROMPT2) |
| `_VERSION` | string — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-_VERSION) |
| `assert` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-assert) |
| `collectgarbage` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-collectgarbage) |
| `coroutine` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-coroutine) |
| `coroutine.close` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-coroutine.close) |
| `coroutine.create` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-coroutine.create) |
| `coroutine.isyieldable` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-coroutine.isyieldable) |
| `coroutine.resume` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-coroutine.resume) |
| `coroutine.running` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-coroutine.running) |
| `coroutine.status` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-coroutine.status) |
| `coroutine.wrap` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-coroutine.wrap) |
| `coroutine.yield` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-coroutine.yield) |
| `debug` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug) |
| `debug.debug` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.debug) |
| `debug.gethook` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.gethook) |
| `debug.getinfo` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.getinfo) |
| `debug.getlocal` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.getlocal) |
| `debug.getmetatable` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.getmetatable) |
| `debug.getregistry` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.getregistry) |
| `debug.getupvalue` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.getupvalue) |
| `debug.getuservalue` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.getuservalue) |
| `debug.sethook` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.sethook) |
| `debug.setlocal` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.setlocal) |
| `debug.setmetatable` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.setmetatable) |
| `debug.setupvalue` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.setupvalue) |
| `debug.setuservalue` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.setuservalue) |
| `debug.traceback` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.traceback) |
| `debug.upvalueid` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.upvalueid) |
| `debug.upvaluejoin` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-debug.upvaluejoin) |
| `dofile` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-dofile) |
| `error` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-error) |
| `file:close` | fixture-fichier-requise — fixture-fichier-requise | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-file:close) |
| `file:flush` | fixture-fichier-requise — fixture-fichier-requise | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-file:flush) |
| `file:lines` | fixture-fichier-requise — fixture-fichier-requise | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-file:lines) |
| `file:read` | fixture-fichier-requise — fixture-fichier-requise | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-file:read) |
| `file:seek` | fixture-fichier-requise — fixture-fichier-requise | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-file:seek) |
| `file:setvbuf` | fixture-fichier-requise — fixture-fichier-requise | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-file:setvbuf) |
| `file:write` | fixture-fichier-requise — fixture-fichier-requise | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-file:write) |
| `getmetatable` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-getmetatable) |
| `io` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io) |
| `io.close` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.close) |
| `io.flush` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.flush) |
| `io.input` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.input) |
| `io.lines` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.lines) |
| `io.open` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.open) |
| `io.output` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.output) |
| `io.popen` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.popen) |
| `io.read` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.read) |
| `io.stderr` | userdata — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.stderr) |
| `io.stdin` | userdata — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.stdin) |
| `io.stdout` | userdata — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.stdout) |
| `io.tmpfile` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.tmpfile) |
| `io.type` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.type) |
| `io.write` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-io.write) |
| `ipairs` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-ipairs) |
| `load` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-load) |
| `loadfile` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-loadfile) |
| `math` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math) |
| `math.abs` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.abs) |
| `math.acos` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.acos) |
| `math.asin` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.asin) |
| `math.atan` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.atan) |
| `math.ceil` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.ceil) |
| `math.cos` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.cos) |
| `math.deg` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.deg) |
| `math.exp` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.exp) |
| `math.floor` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.floor) |
| `math.fmod` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.fmod) |
| `math.frexp` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.frexp) |
| `math.huge` | number — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.huge) |
| `math.ldexp` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.ldexp) |
| `math.log` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.log) |
| `math.max` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.max) |
| `math.maxinteger` | number — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.maxinteger) |
| `math.min` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.min) |
| `math.mininteger` | number — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.mininteger) |
| `math.modf` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.modf) |
| `math.pi` | number — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.pi) |
| `math.rad` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.rad) |
| `math.random` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.random) |
| `math.randomseed` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.randomseed) |
| `math.sin` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.sin) |
| `math.sqrt` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.sqrt) |
| `math.tan` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.tan) |
| `math.tointeger` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.tointeger) |
| `math.type` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.type) |
| `math.ult` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-math.ult) |
| `next` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-next) |
| `os` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os) |
| `os.clock` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.clock) |
| `os.date` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.date) |
| `os.difftime` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.difftime) |
| `os.execute` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.execute) |
| `os.exit` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.exit) |
| `os.getenv` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.getenv) |
| `os.remove` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.remove) |
| `os.rename` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.rename) |
| `os.setlocale` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.setlocale) |
| `os.time` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.time) |
| `os.tmpname` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-os.tmpname) |
| `package` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-package) |
| `package.config` | string — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-package.config) |
| `package.cpath` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-package.cpath) |
| `package.loaded` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-package.loaded) |
| `package.loadlib` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-package.loadlib) |
| `package.path` | string — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-package.path) |
| `package.preload` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-package.preload) |
| `package.searchers` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-package.searchers) |
| `package.searchpath` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-package.searchpath) |
| `pairs` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-pairs) |
| `pcall` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-pcall) |
| `print` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-print) |
| `rawequal` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-rawequal) |
| `rawget` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-rawget) |
| `rawlen` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-rawlen) |
| `rawset` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-rawset) |
| `require` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-require) |
| `select` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-select) |
| `setmetatable` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-setmetatable) |
| `string` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string) |
| `string.byte` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.byte) |
| `string.char` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.char) |
| `string.dump` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.dump) |
| `string.find` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.find) |
| `string.format` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.format) |
| `string.gmatch` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.gmatch) |
| `string.gsub` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.gsub) |
| `string.len` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.len) |
| `string.lower` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.lower) |
| `string.match` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.match) |
| `string.pack` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.pack) |
| `string.packsize` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.packsize) |
| `string.rep` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.rep) |
| `string.reverse` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.reverse) |
| `string.sub` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.sub) |
| `string.unpack` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.unpack) |
| `string.upper` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-string.upper) |
| `table` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-table) |
| `table.concat` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-table.concat) |
| `table.create` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-table.create) |
| `table.insert` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-table.insert) |
| `table.move` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-table.move) |
| `table.pack` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-table.pack) |
| `table.remove` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-table.remove) |
| `table.sort` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-table.sort) |
| `table.unpack` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-table.unpack) |
| `tonumber` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-tonumber) |
| `tostring` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-tostring) |
| `type` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-type) |
| `utf8` | table — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-utf8) |
| `utf8.char` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-utf8.char) |
| `utf8.charpattern` | string — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-utf8.charpattern) |
| `utf8.codepoint` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-utf8.codepoint) |
| `utf8.codes` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-utf8.codes) |
| `utf8.len` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-utf8.len) |
| `utf8.offset` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-utf8.offset) |
| `warn` | nil — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-warn) |
| `xpcall` | function — contrat-non-verifie | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-xpcall) |

Chaque ligne doit ensuite recevoir ses tests de contrat, le résultat oracle/JS et son profil, selon [Validation](06-validation.md).

## Constantes, environnement et configuration documentés (90 entrées)

Les constantes peuvent également apparaître dans l'inventaire des en-têtes. Les variables d'environnement et options de compilation ne sont pas des fonctions de bibliothèque.

| Entrée | Statut | Référence |
| --- | --- | --- |
| `lua.h` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-lua.h) |
| `LUA_USE_APICHECK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_USE_APICHECK) |
| `LUA_MINSTACK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MINSTACK) |
| `LUA_TNONE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TNONE) |
| `LUA_REGISTRYINDEX` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_REGISTRYINDEX) |
| `LUA_RIDX_MAINTHREAD` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_RIDX_MAINTHREAD) |
| `LUA_RIDX_GLOBALS` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_RIDX_GLOBALS) |
| `LUA_OK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OK) |
| `LUA_ERRRUN` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRRUN) |
| `LUA_ERRMEM` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRMEM) |
| `LUA_ERRERR` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRERR) |
| `LUA_ERRSYNTAX` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRSYNTAX) |
| `LUA_YIELD` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_YIELD) |
| `LUA_ERRFILE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_ERRFILE) |
| `LUA_OPADD` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPADD) |
| `LUA_OPSUB` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPSUB) |
| `LUA_OPMUL` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPMUL) |
| `LUA_OPDIV` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPDIV) |
| `LUA_OPIDIV` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPIDIV) |
| `LUA_OPMOD` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPMOD) |
| `LUA_OPPOW` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPPOW) |
| `LUA_OPUNM` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPUNM) |
| `LUA_OPBNOT` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPBNOT) |
| `LUA_OPBAND` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPBAND) |
| `LUA_OPBOR` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPBOR) |
| `LUA_OPBXOR` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPBXOR) |
| `LUA_OPSHL` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPSHL) |
| `LUA_OPSHR` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPSHR) |
| `LUA_MULTRET` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MULTRET) |
| `LUA_OPEQ` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPEQ) |
| `LUA_OPLT` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPLT) |
| `LUA_OPLE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OPLE) |
| `LUA_GCCOLLECT` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCCOLLECT) |
| `LUA_GCSTOP` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCSTOP) |
| `LUA_GCRESTART` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCRESTART) |
| `LUA_GCCOUNT` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCCOUNT) |
| `LUA_GCCOUNTB` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCCOUNTB) |
| `LUA_GCSTEP` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCSTEP) |
| `LUA_GCISRUNNING` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCISRUNNING) |
| `LUA_GCINC` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCINC) |
| `LUA_GCGEN` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCGEN) |
| `LUA_GCPARAM` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPARAM) |
| `LUA_GCPMINORMUL` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPMINORMUL) |
| `LUA_GCPMAJORMINOR` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPMAJORMINOR) |
| `LUA_GCPMINORMAJOR` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPMINORMAJOR) |
| `LUA_GCPPAUSE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPPAUSE) |
| `LUA_GCPSTEPMUL` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPSTEPMUL) |
| `LUA_GCPSTEPSIZE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GCPSTEPSIZE) |
| `LUA_MININTEGER` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MININTEGER) |
| `LUA_MAXINTEGER` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MAXINTEGER) |
| `LUA_N2SBUFFSZ` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_N2SBUFFSZ) |
| `LUA_TNIL` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TNIL) |
| `LUA_TNUMBER` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TNUMBER) |
| `LUA_TBOOLEAN` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TBOOLEAN) |
| `LUA_TSTRING` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TSTRING) |
| `LUA_TTABLE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TTABLE) |
| `LUA_TFUNCTION` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TFUNCTION) |
| `LUA_TUSERDATA` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TUSERDATA) |
| `LUA_TTHREAD` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TTHREAD) |
| `LUA_TLIGHTUSERDATA` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TLIGHTUSERDATA) |
| `LUA_HOOKCALL` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKCALL) |
| `LUA_HOOKRET` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKRET) |
| `LUA_HOOKTAILCALL` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKTAILCALL) |
| `LUA_HOOKLINE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKLINE) |
| `LUA_HOOKCOUNT` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_HOOKCOUNT) |
| `LUA_MASKCALL` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MASKCALL) |
| `LUA_MASKRET` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MASKRET) |
| `LUA_MASKLINE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MASKLINE) |
| `LUA_MASKCOUNT` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MASKCOUNT) |
| `LUAL_BUFFERSIZE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUAL_BUFFERSIZE) |
| `LUA_REFNIL` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_REFNIL) |
| `LUA_NOREF` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_NOREF) |
| `LUA_GLIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_GLIBK) |
| `LUA_LOADLIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_LOADLIBK) |
| `LUA_COLIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_COLIBK) |
| `LUA_STRLIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_STRLIBK) |
| `LUA_UTF8LIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_UTF8LIBK) |
| `LUA_TABLIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_TABLIBK) |
| `LUA_MATHLIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_MATHLIBK) |
| `LUA_IOLIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_IOLIBK) |
| `LUA_OSLIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_OSLIBK) |
| `LUA_DBLIBK` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_DBLIBK) |
| `LUA_CPATH_5_5` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_CPATH_5_5) |
| `LUA_CPATH` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_CPATH) |
| `LUA_LOADED_TABLE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_LOADED_TABLE) |
| `LUA_PATH_5_5` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_PATH_5_5) |
| `LUA_PATH` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_PATH) |
| `LUA_PRELOAD_TABLE` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_PRELOAD_TABLE) |
| `LUA_INIT_5_5` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_INIT_5_5) |
| `LUA_INIT` | configuration-environnement-ou-constante-a-auditer | [officiel](reference/lua-5.5.1/doc/manual.html#pdf-LUA_INIT) |
