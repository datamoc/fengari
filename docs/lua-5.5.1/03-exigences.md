# Exigences de conformité Lua 5.5.1

Les identifiants ci-dessous servent à relier implémentation, tests et décisions.
Tous sont **à implémenter ou à auditer** au départ. Le manuel figé fait foi ; ces
exigences en sont un guide de travail, pas une spécification de remplacement.
Les [inventaires](inventaire-api.md) complètent les lignes regroupant de nombreuses API.

## Couvrir toute la spécification

| ID | Référence du manuel local | Exigence et preuve attendue |
| --- | --- | --- |
| L01 | [§2.1](reference/lua-5.5.1/doc/manual.html#2.1) | Huit types, identité des objets, nil/false, entiers/flottants, chaînes d'octets ; tests de valeurs et conversions |
| L02 | [§2.2](reference/lua-5.5.1/doc/manual.html#2.2) | Portées lexicales, upvalues, `_ENV`, environnement global et déclarations ; tests de captures et masquages |
| L03 | [§2.3](reference/lua-5.5.1/doc/manual.html#2.3) | Erreurs protégées, handlers, panic et avertissements ; tests imbriqués et erreurs hôtes |
| L04 | [§2.4](reference/lua-5.5.1/doc/manual.html#2.4) | Ensemble des métaméthodes, ordre de recherche, raw access, chaînes `__call` ; tests de chaque événement |
| L05 | [§2.5](reference/lua-5.5.1/doc/manual.html#2.5) | Modes de GC, paramètres, racines, finalisation, résurrection, tables faibles et éphemerons ; tests de cycles et ressources |
| L06 | [§2.6](reference/lua-5.5.1/doc/manual.html#2.6) | États des coroutines, transferts, yields, fermeture et erreurs ; tests de transitions et continuations |
| L07 | [§3.1](reference/lua-5.5.1/doc/manual.html#3.1) | Lexer complet : mots réservés, commentaires, littéraux, échappements et erreurs de syntaxe |
| L08 | [§3.2–3.3](reference/lua-5.5.1/doc/manual.html#3.2) | Variables, blocs, affectations, contrôle, labels/goto, boucles et déclarations ; tests de portée et limites |
| L09 | [§3.4](reference/lua-5.5.1/doc/manual.html#3.4) | Tous les opérateurs, précédences, coercitions, constructeurs, appels, varargs et ajustement multirésultats |
| L10 | [§2.2](reference/lua-5.5.1/doc/manual.html#2.2) | Visibilité des variables et fermetures, y compris réentrance et scopes créés dans les boucles |
| A01 | [§4](reference/lua-5.5.1/doc/manual.html#4) | Contrat de l'API : pile, pseudo-indices, registry, callbacks, erreurs, yields, allocateurs et stabilité des pointeurs ; contrat JS explicite |
| A02 | [§4.6](reference/lua-5.5.1/doc/manual.html#4.6) | Chaque fonction/type/constante documenté : signature, résultats, effet de pile, erreurs et yields ; test identifié par entrée d'inventaire |
| A03 | [§5](reference/lua-5.5.1/doc/manual.html#5) | Chaque fonction/type de la bibliothèque auxiliaire, buffers, refs, loaders et diagnostics |
| B01 | [§6.1](reference/lua-5.5.1/doc/manual.html#6.1) | Chargement sélectif et préchargement des bibliothèques ; masques `LUA_*LIBK` et `luaL_openselectedlibs` |
| B02 | [§6.2](reference/lua-5.5.1/doc/manual.html#6.2) | Bibliothèque de base complète, dont `warn`, collectgarbage, loaders, erreurs et environnement |
| B03 | [§6.3](reference/lua-5.5.1/doc/manual.html#6.3) | Coroutine : create/resume/yield/wrap/running/status/isyieldable/close, arguments optionnels et erreurs |
| B04 | [§6.4](reference/lua-5.5.1/doc/manual.html#6.4) | Package : require, searchers, searchpath, chemins, loaded/preload, loader data et loadlib |
| B05 | [§6.5](reference/lua-5.5.1/doc/manual.html#6.5) | String : toutes les fonctions, patterns, formats, pack/unpack/packsize, dump et chaînes binaires |
| B06 | [§6.6](reference/lua-5.5.1/doc/manual.html#6.6) | UTF-8 : validation, mode laxiste, indices, itération et double résultat d'offset |
| B07 | [§6.7](reference/lua-5.5.1/doc/manual.html#6.7) | Table : opérations complètes, métaméthodes applicables, séquences et `table.create` |
| B08 | [§6.8](reference/lua-5.5.1/doc/manual.html#6.8) | Math : profil numérique, arrondis, random/randomseed, limites et conversions |
| B09 | [§6.9](reference/lua-5.5.1/doc/manual.html#6.9) | IO : fonctions et méthodes de fichiers, formats, itérateurs, fermeture, modes et erreurs système |
| B10 | [§6.10](reference/lua-5.5.1/doc/manual.html#6.10) | OS : dates, locales, environnement, fichiers, commandes et résultats portables/non portables |
| B11 | [§6.11](reference/lua-5.5.1/doc/manual.html#6.11) | Debug : hooks, informations, locaux, upvalues, valeurs utilisateur indexées et varargs nommés |
| D01 | [§7](reference/lua-5.5.1/doc/manual.html#7) | Interpréteur autonome : options, init, arg, stdin/REPL, avertissements et fermeture ; composant à identifier, pas omission implicite |
| D02 | [§8](reference/lua-5.5.1/doc/manual.html#8) | Incompatibilités 5.4→5.5 toutes couvertes par tests de migration ; pas d'options de compatibilité silencieuses |
| D03 | [§9](reference/lua-5.5.1/doc/manual.html#9) | Grammaire complète : corpus d'acceptations/rejets et tests de précédence |
| V01 | [Source : lopcodes.h](reference/lua-5.5.1/src/lopcodes.h) | Ensemble des instructions 5.5.1, encodage, registres, constantes et flags ; émission/exécution couplées |
| V02 | [§4.6 lua_load](reference/lua-5.5.1/doc/manual.html#lua_load) | Chunks texte/binaire, modes, lecteurs fractionnés, données tronquées et incompatibilités de format |
| V03 | [§4.6 lua_dump](reference/lua-5.5.1/doc/manual.html#lua_dump) | Chunks 5.5.1 valides, protocole writer, strip debug et compatibilité avec le profil de l'oracle |
| P01 | [Architecture](04-architecture.md) | Aucun cycle d'import réintroduit ; chargement à froid, navigateur et intégration JS préservés |

## Changements de langage à implémenter explicitement

### Attributs et fermeture hérités de Lua 5.4, précisés par 5.5

Le parseur doit reconnaître les attributs selon
[§3.3.7](reference/lua-5.5.1/doc/manual.html#3.3.7) et leur portée. En 5.5,
un attribut peut aussi précéder la liste de noms. `const` et `close` sont des noms
d'attribut, pas des mots réservés supplémentaires à inventer.

- Une variable en lecture seule refuse les affectations, y compris via une closure.
- `<close>` est réservé aux variables locales ; une liste contient au plus une telle variable.
- La valeur à fermer doit être nil, false ou disposer de `__close`.
- Fermer en ordre inverse lors de sortie normale, break, goto, return et erreurs.
- En cas d'erreur, transmettre l'objet d'erreur à `__close` ; sans erreur, respecter
  l'absence de second argument du manuel 5.5.1, vérifiée notamment avec `select('#', ...)`.
- Une erreur dans une fermeture ne dispense pas d'exécuter les autres fermetures.
- La coroutine suspendue conserve ses ressources ; la fermeture explicite les libère
  conformément au contrat. Ne pas confondre `__close` déterministe et `__gc`.

### Déclarations globales 5.5

`global` devient un mot réservé. Implémenter les déclarations de noms, les attributs,
`global *`, `global<const> *` et `global function`, avec l'état lexical approprié.
Une déclaration globale avec initialisation échoue à l'exécution si la valeur
existante n'est pas nil ; une déclaration sans initialisation ne l'efface pas.
Les déclarations contrôlent les accès syntaxiques ; elles ne rendent pas `_G`
physiquement immuable. Tester les accès via `_ENV`, les blocs et les closures.

### Varargs nommés et boucles

`function(...args)` lie un local en lecture seule à une table contenant les arguments
et leur nombre dans `args.n`. La table reste mutable : une modification de ses entrées
ou de `n` peut modifier les valeurs produites par `...`. Ne pas remplacer ce contrat
par une simple copie indépendante de la pile. Tester capture, retour de la table,
valeurs nil, zéro argument, modifications et formes optimisées, avec
[§3.4.11](reference/lua-5.5.1/doc/manual.html#3.4.11).

Les variables de contrôle des boucles numériques et génériques sont en lecture
seule. Tester l'affectation directe et capturée, ainsi que le masquage par un local.

### Autres incompatibilités

Appliquer la limite de 15 objets dans une chaîne `__call`, le remplacement d'un
objet d'erreur nil par un message, et la conversion décimale des flottants permettant
leur relecture sans perte. Les optimisations internes 5.5 (taille des tableaux,
partage de chaînes, varargs optimisés) peuvent être portées après la sémantique,
mais les contrats observables ne doivent pas être différés avec elles.

## Points d'API à haut risque

Lire les contrats complets dans le manuel et les signatures dans les en-têtes figés :

- `lua_newstate` reçoit une graine de hachage ; `luaL_makeseed` doit avoir un contrat hôte.
- `lua_resume` et la gestion des continuations changent par rapport à la base 5.3 ;
  définir le transport du nombre de résultats dans l'API JS.
- `lua_closethread`, `lua_toclose`, `lua_closeslot`, `lua_settop` et `lua_close` doivent
  participer à la fermeture des ressources. `lua_resetthread` est dépréciée en 5.5.
- Userdata : `lua_newuserdatauv`, valeurs utilisateur indexées et fonctions associées.
- Avertissements : `lua_setwarnf`, `lua_warning`, fragments et callback hôte.
- Chaînes externes : `lua_pushexternalstring`, stabilité des octets et callback de libération.
- `lua_call` et fonctions apparentées : au plus 250 résultats explicitement demandés ;
  `LUA_MULTRET` conserve son contrat distinct.
- `lua_dump` : pile et dernier appel au writer selon le contrat 5.5.1.
- `lua_pushvfstring` signale ses erreurs selon le nouveau contrat ; ne pas conserver
  automatiquement le comportement qui levait une erreur.
- GC : `LUA_GCPARAM` et les six paramètres du header ; distinction des modes et des réglages.
- `luaL_openselectedlibs` charge/précharge selon les masques ; `luaL_openlibs` conserve
  le comportement dérivé défini par `lualib.h`.

Cet ensemble n'est pas une liste exhaustive des API : toutes les entrées de
l'[inventaire](inventaire-api.md) doivent être traitées, même si leur nom existait en 5.3.
