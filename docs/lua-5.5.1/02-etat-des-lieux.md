# État des lieux du dépôt

État initial établi le 10 octobre 2026 sur un worktree contenant des modifications
non commitées. Le commit de départ, la liste des fichiers modifiés, les empreintes
des sources et les sondes sont conservés dans [observations.json](observations.json).
Cet état doit être actualisé avant de commencer un lot : d'autres sessions peuvent
modifier le dépôt.

## Base technique constatée

| Constat | Preuve locale | Conséquence |
| --- | --- | --- |
| Le README annonce une sémantique Lua 5.3 | [README](../../README.md) | Point de départ historique, pas certification 5.5 |
| Les définitions annoncent 5.4 / 504 | [defs.js](../../src/defs.js) | Numéro annoncé incompatible avec la couverture réelle |
| Le chunk binaire est explicitement 0x53 | [lbytecode.js](../../src/lbytecode.js) | Pas d'interopérabilité binaire 5.5 |
| Instructions et encodage de la génération 5.3 | [lopcodes.js](../../src/lopcodes.js) | Migration conjointe compilateur, VM, dump et undump |
| Entiers signés 32 bits et flottants double | [luaconf.js](../../src/luaconf.js) | Profil numérique à fixer ; 32 bits peut être un profil Lua configuré, pas celui de l'oracle 64 bits par défaut |
| GC confié à JavaScript ; `lua_gc` vide | [lapi](../../src/runtime/lapi.js), [bibliothèque de base](../../src/lbaselib.js) | Collecteur Lua observable, tables faibles et finalisation à concevoir |
| `<const>` et `<close>` officiels échouent aux sondes | [Observations](observations.json), [parseur](../../src/runtime/lparser.js) | Ajouts antérieurs insuffisants pour Lua 5.4 ou 5.5 |
| `lua_closeslot` efface une valeur sans fermeture | [lapi](../../src/runtime/lapi.js) | Contrat `__close` absent malgré l'export |
| État et bibliothèques composés sans cycle d'import | [runtime.js](../../src/runtime.js), [library-runtime.js](../../src/library-runtime.js) | Conserver cette propriété pendant la migration |

`CHANGES.md` décrit des intentions et des ajouts partiels. Il ne doit pas servir de
preuve de conformité. La syntaxe `local const x` qui peut être acceptée actuellement
n'est pas la syntaxe des attributs du manuel cible.

## Organisation actuelle à préserver

- `src/runtime/*.js` contient les fabriques du cœur ; `src/runtime.js` fournit leurs
  collaborateurs puis assemble leurs exports.
- Les anciens chemins comme `src/lapi.js` et `src/lparser.js` sont des façades de
  compatibilité. Modifier uniquement ces façades ne modifie pas leur implémentation.
- `src/library-runtime.js` compose les bibliothèques et l'API publique ; les noms
  des bibliothèques sont dans `src/lualib-constants.js`.
- `src/luaconf-base.js` partage la configuration sans cycle avec `defs.js`.
- `src/fengari-vm.js` fournit une extension d'intégration JS. Ses méthodes ne sont
  pas une partie de la spécification Lua et doivent avoir leurs propres régressions.

## Couverture actuellement inconnue

La présence d'exports existants ne valide ni leurs arguments, ni leur effet sur la
pile, ni la gestion des erreurs et yields. L'[inventaire](inventaire-api.md)
sépare « présent, contrat non vérifié », « absent » et « adaptation de type à concevoir ».
Il inclut les bibliothèques de base, package, coroutine, table, io, os, string,
utf8, math et debug, ainsi que les méthodes de fichiers qui exigent une fixture.

Un audit fonctionnel reste requis pour les comportements déjà présents : calculs,
coercitions, comparaisons, limites, itération, patterns, chaînes binaires, debug,
coroutines, environnement et appels hôtes. Ne pas considérer la base 5.3 comme
entièrement conforme : le README signale déjà plusieurs omissions.

## Baseline de tests

Lors de la fin du travail précédent, la suite complète passait avec 41 suites,
621 tests réussis et 21 ignorés. Ce résultat est un historique de régression, pas
un résultat de conformité 5.5.1 ni une preuve actualisée pour tous les fichiers.
Les sondes de ce dossier sont exécutées lors de sa génération ; elles ne doivent
pas être confondues avec une exécution de la suite officielle.

Le lint global présente des problèmes préexistants, notamment les fins de ligne
CRLF. Enregistrer séparément le lint du code migré et le lint global, et ne pas
masquer une erreur sémantique sous une dérogation de formatage.
