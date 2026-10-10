# Changements dans Fengari

## Version 0.4.0

### Nouvelles fonctionnalités (`FengariVm`)
- **Export** : `require('@datamoc/fengari')` expose désormais `FengariVm`, `LuaError`, `LimitError`, `Multi`, `Yield`, `LuaRef`, `LuaFloat`, `Userdata` et `Coroutine`.
- **Coroutines pilotées par l'hôte** : `vm.coroutine(chemin | LuaRef)` et `vm.coroutineFromSource(source)` retournent une `Coroutine` (`status`, `resume(...args)` → `{done, values}`, `close()`). Une fonction hôte qui retourne `new Yield([...])` suspend la coroutine appelante ; les arguments de `resume` deviennent ses valeurs de retour.
- **Choix des bibliothèques** : option `libs` (base, coroutine, table, string, utf8, math, os, debug, package, io, fengari) et option `remove` (globals à retirer ; retirer un global de premier niveau le retire aussi de `package.loaded` et `package.preload`).
- **Préréglage `sandbox: true`** pour du code Lua non fiable : seulement base, coroutine, table, string, utf8 et math ; ni `os`, `io`, `debug`, `package` ni `require` ; `dofile`, `loadfile` et `string.dump` retirés ; `load` n'accepte que du texte.
- **Limites d'exécution** : option `limits: { instructions, timeMs }` et `setLimits()`, par appel de haut niveau (`run`, `call`, `callMulti`, `callRef`, `Coroutine#resume`), via un hook de comptage. Un dépassement lève une `LimitError` (sous-classe de `LuaError`, `limit` = `'instructions'` ou `'time'`) que le script ne peut pas rattraper (`pcall` et coroutines inclus). Sans `sandbox`, `debug.sethook` permet de retirer le hook.
- **Appels** : `runMulti` et `callMulti` retournent toutes les valeurs de retour ; `callRef` et `LuaRef#call` appellent une fonction Lua obtenue par `read`.
- **Conversions** : fonctions, threads et userdata sont lus comme `LuaRef` ; `new Userdata(valeur)` pousse une valeur hôte opaque (light userdata) ; `new LuaFloat(5)` pousse un flottant et l'option `preserveFloats` lit `5.0` comme `LuaFloat` ; les entiers hors de ±2^53 sont des `BigInt` (et un `BigInt` est poussé comme entier 64 bits) ; une chaîne qui n'est pas de l'UTF-8 valide est lue comme `Uint8Array` (et un `Uint8Array` est poussé comme chaîne d'octets) ; une table dont les clés ne sont pas toutes des chaînes ou des entiers (booléens, flottants, tables, fonctions, chaînes binaires, collision `"1"`/`1`) est lue comme `Map`, et une `Map` est poussée avec ses clés exactes. Les références circulaires sont préservées.
- **Page de benchmark** : `docs/benchmark/index.html` compare Lua dans Fengari et JavaScript dans le navigateur du visiteur ; `npm run bench:build` régénère `docs/benchmark/fengari.bundle.js`.

### Changements de comportement
- Une table Lua dont les clés sont 1..n est lue comme **tableau JavaScript** (et non plus comme objet `{"1": …}`).
- `read` ne retourne plus `null` pour une fonction ou un userdata, et lève une `RangeError` au-delà de 128 niveaux d'imbrication au lieu de tronquer à 24.

### Corrections
- Une clé Lua `__proto__` ne modifie plus le prototype de l'objet lu.
- Une `LuaRef` ou une `Coroutine` d'une autre `FengariVm` est refusée au lieu de désigner une valeur sans rapport.
- `protectedCall` lisait sur le thread courant au lieu de l'état principal quand `call` était appelé depuis une fonction hôte exécutée dans une coroutine.
- Une erreur de conversion d'une valeur retournée par une fonction hôte devient une erreur Lua au lieu d'une exception JavaScript brute ; `print` et les messages d'erreur ne plantent plus sur un `BigInt`, une fonction ou une référence circulaire.
- Pousser un nombre JavaScript hors de l'intervalle des entiers sûrs (`1e300`) ne lève plus « invalid argument » : il est poussé comme flottant.
- **Tests** : `test/fengari-vm.test.js`, `test/fengari-vm-limits.test.js`.

## Version 0.3.0

### Nouvelles fonctionnalités
- **`<const>` et `<close>` (Lua 5.4)** : la grammaire `local x <const> = v` / `local x <close> = v` est analysée pour de bon (la version 0.2.0 annonçait ce support sans qu'aucun de ces programmes ne se compile). La forme préfixe `local <const> x, y = 1, 2` de la spécification 5.5 du fork est aussi acceptée. `const` et `close` restent des noms ordinaires.
  - **`<const>`** : une affectation à la variable, y compris depuis une fonction imbriquée (`attempt to assign to const variable 'x'`), est refusée à la compilation. Une variable `<close>` est en lecture seule de la même façon.
  - **`<close>`** : nouvel opcode `OP_TBC` (ajouté en fin de table, les opcodes existants ne bougent pas). La valeur doit être nil, `false` ou avoir une métaméthode `__close` (`variable 'x' got a non-closable value`). Les fermetures s'exécutent dans l'ordre inverse, avec `(valeur, erreur ou nil)`, à la fin du bloc, sur `break`, `goto`, `return` (valeurs de retour intactes) et sur erreur. Un `return f()` dans la portée d'une variable à fermer n'est plus un appel terminal. Une erreur dans un `__close` remplace l'erreur en cours et les fermetures restantes s'exécutent quand même.
  - **`for ... in a, b, c, d`** : la quatrième valeur est la valeur de fermeture de la boucle, fermée à la fin, sur `break`, `return` ou erreur (la disposition des registres de `OP_TFORCALL`/`OP_TFORLOOP` suit désormais Lua 5.4).
  - **`coroutine.close`**, et `coroutine.wrap` ferme sa coroutine quand elle échoue.
  - **API C** : `lua_closethread`, `lua_toclose`, et de vrais `lua_resetthread` et `lua_closeslot` (les versions de la 0.2.0 ne faisaient que vider la pile).
  - **Limite** : un `__close` ne peut pas se suspendre (`coroutine.yield` y échoue avec « attempt to yield across a JS-call boundary »).
  - **Tests** : `test/lattribs.test.js`.

## Version 0.2.0

### Nouvelles fonctionnalités
- **Intégration de `FengariVm`** : Une machine virtuelle Lua persistante pour maintenir un état entre les évaluations et exposer des objets JavaScript à Lua.
  - **`FengariVm`** : Classe pour exécuter du code Lua avec conservation d'état.
  - **Méthodes** : `run`, `call`, `defineFunction`, `push`, `read`.

- **Mise à jour vers Lua 5.4** :
  - Ajout des tokens pour `const` et `<close>` dans `llex.js`.
  - Modification de `localstat` pour gérer `local const`.
  - Modification de `new_localvar` pour gérer les variables `<close>`.

- **Nouvelles fonctions dans l'API C** :
  - **`lua_resetthread`** : Réinitialise un thread Lua.
  - **`lua_closeslot`** : Ferme un slot dans une table.
- **`lua_setallocf` / `lua_getallocf` (hook d'allocation)** :
  - **Contrat** : `allocf(ud, nsize)` est appelé de manière synchrone avant chaque allocation interne de `nsize` octets (taille complète, croissances incluses) ; lever une exception refuse l'allocation, comme un allocateur C défaillant (`LUA_ERRMEM`, « not enough memory »), et l'état reste utilisable.
  - **Portée** : `luaL_prepbuffsize` (`string.rep`, `string.gsub`, `string.format`), `luaZ_resizebuffer`, la concaténation de la VM, `read` de l'undump, et les autres sites internes porteurs d'un état ; les conversions sans état de `defs.js` ne sont pas comptées. Le point de passage unique vit dans `src/lmem.js` (analogue JS de `lmem.c`).
  - **Tests** : `test/lalloc.test.js` (aller-retour set/get, observation, refus, `pcall` Lua ne pouvant pas avaler un refus, isolation par état).

### Corrections
- **Résolution des dépendances circulaires** :
  - Extraction de `TValue` dans `tvalue.js` pour éviter les dépendances entre `llex.js` et `lobject.js`.
  - Création de `lapi-ext.js` pour éviter les dépendances entre `lapi.js` et `lstate.js`.

### Documentation
- **`FengariVm`** : Documentation des méthodes et exemples d'utilisation.
- **Nouvelles fonctionnalités Lua 5.4** : Documentation de `const` et `<close>`.
- **Nouvelles fonctions de l'API C** : Documentation de `lua_resetthread` et `lua_closeslot`.

### Tests
- **Tests des nouvelles fonctions de l'API C** : Vérification que `lua_resetthread` et `lua_closeslot` sont bien exportées et accessibles.
- **Tests des tokens** : Vérification que les tokens pour `const` et `<close>` sont bien définis dans `llex.js`.

## Version 0.1.6

### Ajouts
- **Bibliothèque auxiliaire étendue** : symboles `lauxlib` manquants ajoutés (dont `luaL_addgsub`, `luaL_pushfail`, `luaL_typeerror`, `luaL_buffaddr`/`luaL_bufflen`/`luaL_buffsub`, `luaL_checkint`/`luaL_optint`), avec leurs tests.

### Corrections
- **Empaquetage** : publication de `src/` seul ; suppression du champ `types` qui pointait vers un `dist/fengari.d.ts` jamais livré (des déclarations TypeScript restent à écrire).
- **Entiers 64 bits** : corrections dans les bibliothèques string, math et table ; restauration du test officiel de l'ordre de `math`.

### Documentation
- **Cohérence de version** : le README et les mots-clés npm annonçaient « Lua 5.5.1 » alors que la VM rapporte Lua 5.4.6 (`LUA_VERSION_NUM` 504 dans `defs.js`). Ils décrivent désormais Lua 5.4.6 ; l'alignement 5.5.1 reste un chantier en cours suivi dans `docs/lua-5.5.1` (aucun lot M0-M9 terminé à ce jour).

## Exemples d'utilisation

### Utilisation de `FengariVm`
```javascript
const { FengariVm } = require('fengari');

// Créer une instance de FengariVm
const vm = new FengariVm();

// Exécuter du code Lua
const result = vm.run("return 42 + 8");
console.log(result); // Affiche 50

// Exposer une fonction JavaScript à Lua
vm.defineFunction('add', (a, b) => a + b);
const addResult = vm.run("return add(10, 20)");
console.log(addResult); // Affiche 30
```

### Utilisation de `const` et `<close>`
```lua
-- Déclaration d'une variable constante
local x <const> = 10
-- x = 20 -- erreur de compilation : x est constante

-- Déclaration d'une variable à fermer automatiquement
local file <close> = io.open("data.txt", "r")
-- file est automatiquement fermé à la fin de la portée
```

### Utilisation des nouvelles fonctions de l'API C
```javascript
const { lua_resetthread, lua_closeslot } = require('fengari/lapi-ext');

// Réinitialiser un thread Lua
lua_resetthread(L);

// Fermer un slot dans une table
lua_closeslot(L, idx);
```