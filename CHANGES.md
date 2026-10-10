# Changements dans Fengari

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
local const x = 10
-- x = 20 -- Erreur : x est constante

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