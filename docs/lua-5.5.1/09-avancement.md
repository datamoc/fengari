# Avancement vérifié

État au 10 octobre 2026. L'objectif reste l'ensemble de Lua 5.5.1 décrit dans ce
dossier. Aucun des grands lots M0–M9 n'est déclaré entièrement terminé.

## Oracle et comparaison

`tools/lua55/build-oracle.cjs` vérifie l'archive officielle et compile les profils
int64/double et int32/double. Le second change uniquement le type entier par
défaut ; il ne sélectionne pas `LUA_32BITS`, qui changerait aussi les flottants.
Les deux exécutables annoncent Lua 5.5.1 ; leurs manifests enregistrent les
empreintes, le compilateur et les tailles numériques.

Le corpus différentiel couvre les résultats scalaires, leurs types et leur nombre,
les rejets à la compilation et les erreurs d'exécution. Les traces des effets
doivent être renvoyées explicitement. Voir les rapports
[int32](differential-int32.json) et [int64](differential-int64.json), avec la source
de chaque cas et les résultats des deux moteurs. La comparaison int64 reste utile
pour la cible, mais le profil numérique actuel de Fengari est int32/double.

Résultat actuel : **60 cas**, dont **46 concordances / 14 écarts** avec le profil
int32 et **38 concordances / 22 écarts** avec le profil int64. Les huit cas de
profil, grandes valeurs, wrap, comparaisons mixtes, clés de table, shifts, pack et
division/modulo concordent en int32 et exposent tous un écart en int64. Ce corpus
sert de point de départ à M1 ; il n'est pas une mesure de couverture globale.

La première exécution de la suite officielle portable complète sur l'oracle
Windows (`lua -e '_U=true' all.lua`) a échoué dans `files.lua:467` lors de
l'ouverture de `/dev/null`. Le bloc suivant utilise aussi `/dev/full`. C'est une
dépendance aux périphériques POSIX, pas une réussite de la suite portable.
Le log local est `.lua55-build/tests/oracle-portable.log`. Une exécution sur un
hôte POSIX ou une adaptation séparée des tests de périphériques reste nécessaire.

## Contrats portés

| Contrat | Changement | Preuve | Limites restantes |
| --- | --- | --- | --- |
| UTF-8 | Décodage strict/laxiste, rejet des surrogates en strict, encodage jusqu'à `0x7fffffff`, itérateurs, charpattern et deux résultats de offset | Suite officielle `utf8.lua` comparée aux deux profils ; fixtures et tests JS | Déclaration global retirée uniquement côté JS ; profil numérique et autres environnements à valider |
| Échappements UTF-8 | Lexer et encodeur partagent la limite 31 bits ; overflow vérifié avant le shift | Suite UTF-8 officielle, fixtures overflow et tests literals | Reste du lexer et de la grammaire non porté |
| table.create | Table neuve vide ; paramètres entiers et capacités entre 0 et INT_MAX | Fixtures nominales, défauts, coercition et erreurs ; tests JS | Capacités utilisées comme hints par l'API JS existante ; bibliothèque table entière à auditer |
| Bibliothèques sélectionnées | Masques officiels, load prioritaire sur preload, ordre officiel, conservation de la pile et registration dans preload | Tests API pour pile, globals, registry et require | IO indisponible sans services Node ; comparaison API C et navigateur à compléter |
| Objet d'erreur nil | Remplacé par `<no error object>` après le handler ; autres objets préservés | Fixtures différentielles, xpcall, assert, identité et appel hôte lua_error | Fermeture, continuations et autres contrats d'erreur restent à porter |

`luaL_openlibs` continue à charger l'extension Fengari après les bibliothèques
standard. `luaL_openselectedlibs` sélectionne seulement les bibliothèques
standard. Le numéro de version et le format binaire n'ont pas été changés pour
faire croire que la VM est déjà migrée.

## Commandes de validation

Depuis la racine, après compilation des oracles :

```powershell
node tools/lua55/differential.cjs --report-only
node tools/lua55/differential.cjs --int64 --report-only
node tools/lua55/check-official-utf8.cjs
npm test -- --runInBand --silent
node docs/lua-5.5.1/tools/capture-baseline.cjs
node docs/lua-5.5.1/tools/check-docs.cjs
```

Les tests historiques dont les attentes étaient propres à Lua 5.3 ont été
actualisés selon 5.5.1 : limite UTF-8, diagnostics de bornes et objets d'erreur nil.
Les contrôles d'erreur sont conservés. Le lint du code modifié passe avec
`no-undef` activé et la règle de fins de ligne désactivée pour les CRLF du worktree.

Dernière exécution complète : **43 suites réussies, 635 tests réussis, 21 ignorés,
656 au total**, aucun échec. La suite UTF-8 officielle conserve toutes ses
assertions et passe sur Fengari avec l'adaptation déclarée ainsi que sur les deux
oracles sans adaptation. Le test de graphe des imports passe dans la suite complète.

## Travail restant

M1 doit porter le profil numérique 64 bits et ses conversions hôtes ; M2 doit
porter ensemble instructions, prototypes, émission et chunks binaires. Les
déclarations globales, attributs, varargs nommés et boucles readonly restent en
écart. La fermeture des ressources et coroutines, le GC logique, les nouvelles
API et le reste des bibliothèques doivent ensuite recevoir leurs implémentations
et preuves. Les réussites ci-dessus ne ferment pas ces exigences.
