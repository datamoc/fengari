# Architecture du portage

Ce document décrit une architecture proposée. Les choix non encore validés sont
suivis dans [Décisions](07-decisions.md). La cible sémantique reste celle des
[exigences](03-exigences.md), quelle que soit la représentation interne retenue.

## Frontières de modules

Conserver les fabriques du cœur sous `src/runtime/` et leur composition dans
`src/runtime.js`. Les façades existantes gardent leur rôle de compatibilité.
Une fabrique reçoit les collaborateurs dont elle a besoin ; elle ne doit pas
importer une autre façade du cœur pour récupérer ces collaborateurs.

Le chemin d'exécution attendu est :

```text
texte Lua → lexer → parseur et résolution lexicale → générateur 5.5.1
         → prototype 5.5.1 → VM → appels, fermetures, GC, bibliothèques

chunk binaire 5.5.1 → lecteur validant → prototype 5.5.1 → même VM
prototype 5.5.1 → writer 5.5.1 → chunk binaire compatible avec son profil
```

Les deux chemins doivent partager les structures de prototypes, valeurs,
instructions et informations de debug. Un numéro de version modifié dans
`src/lbytecode.js` ne réalise aucune de ces transformations.

## Carte du code à modifier

| Sous-système | Fichiers du dépôt | Portage à prévoir |
| --- | --- | --- |
| Définitions et configuration | `src/defs.js`, `src/luaconf-base.js`, `src/luaconf.js`, `src/llimits.js` | Constantes, profils, limites, formats et version publiée |
| Lexer | `src/runtime/llex.js`, `src/ljstype.js`, `src/lzio.js` | Mot réservé global, attributs traités dans le parseur, lecture exacte des nombres/chaînes |
| Résolution et grammaire | `src/runtime/lparser.js` | Global/local, readonly, close, varargs, portées et diagnostics |
| Code et instructions | `src/runtime/lcode.js`, `src/lopcodes.js` | Nouvel encodage, opérations et métadonnées ; vérifier l'ensemble du header upstream |
| Valeurs et fonctions | `src/runtime/lobject.js`, `src/runtime/lfunc.js`, `src/tvalue.js` | Représentation numérique, userdata, prototypes, varargs, captures et racines |
| Exécution | `src/runtime/lvm.js`, `src/runtime/ldo.js`, `src/runtime/ltm.js` | Instructions 5.5, coercitions, appels/yields, fermetures, métaméthodes et erreurs |
| État et pile | `src/runtime/lstate.js`, `src/runtime/lapi.js` | Ressources à fermer, état de coroutine, registry, callbacks et API hôte |
| Debug | `src/runtime/ldebug.js`, `src/ldblib.js` | Lignes, locaux/constantes optimisés, varargs nommés et valeurs utilisateur indexées |
| Tables et chaînes | `src/runtime/ltable.js`, `src/lstring.js` | Hachage avec graine, stockage, égalité et liens avec GC |
| Mémoire | Nouveau composant proposé `src/runtime/lgc.js` | Tracé Lua, objets vivants, tables faibles, finalisation et modes du GC |
| Binaire | `src/ldump.js`, `src/runtime/lundump.js`, `src/lbytecode.js` | Format réel 5.5.1, validation, sérialisation et protocole writer |
| API publique | `src/lua.js`, `src/lauxlib.js`, `src/lapi-ext.js` | Nouvelles signatures, constantes, aliases et adaptateurs JS |
| Bibliothèques | `src/l*lib.js`, `src/loadlib.js`, `src/runtime/loadlib.js` | Audit de chaque symbole, pas uniquement les nouvelles fonctions |
| Composition | `src/runtime.js`, `src/library-runtime.js`, `src/lualib-constants.js` | Nouveaux composants sans cycle, masques et chargement sélectif |
| Intégration JS | `src/fengari-vm.js`, `src/fengaricore.js`, `src/fengari.js` | Conversions sûres, références, ressources et erreurs |

Les chemins de futurs fichiers sont des propositions, pas des fichiers existants.

## Profil numérique

La configuration actuelle emploie des entiers 32 bits. Lua autorise des profils
numériques configurés : ce seul fait ne prouve pas une non-conformité du langage.
Il empêche toutefois de comparer sans adaptation avec une distribution configurée
en entiers 64 bits et influe sur `string.pack`, les bornes, les opérations et les chunks.

Proposition pour rejoindre le profil habituel : entiers signés 64 bits via `BigInt`,
flottants via `Number`, tag distinct dans `TValue`, normalisation explicite modulo
2^64 et conversion signée. Auditer l'ensemble des opérations bitwise JS, des `| 0`,
du hachage, des clés de tables, des constantes et des conversions mixtes.

Ne pas convertir silencieusement un entier de grande magnitude en `Number` dans
l'API hôte. Définir les retours `BigInt`, les conversions explicites et les erreurs
de perte de précision. Tester aussi NaN, infinis, zéro signé, division entière,
modulo, limites, conversion texte et représentation décimale des flottants.

Si un profil 32 bits est conservé, le nommer et compiler un oracle Lua 5.5.1 avec
le même profil. Il ne remplace pas une décision sur le profil de distribution cible.

## Fermeture déterministe

Ajouter aux états et aux frames les informations permettant de retrouver les
slots marqués à fermer. Les sorties de bloc générées par le compilateur et les
réductions de pile via l'API doivent utiliser un mécanisme partagé.

Auditer conjointement return, tailcall, goto, break, unwind d'erreur, `lua_settop`,
`lua_closeslot`, `lua_closethread`, `lua_close` et fermeture explicite de coroutine.
Ne pas exécuter deux fois un `__close` après une erreur ou une réentrance. Conserver
le bon objet d'erreur et fermer les ressources restantes si un handler échoue.

## Mémoire et finalisation

Le GC JavaScript peut gérer la mémoire physique du port, mais il ne fournit pas
à lui seul les contrats observables de `collectgarbage`, des tables faibles, des
éphemerons ou de `__gc`. `WeakRef` et `FinalizationRegistry` ne constituent pas une
preuve de conformité de ces mécanismes.

Proposition : un tas logique Lua suivi par le moteur. Définir les racines (piles,
registry, threads, closures, userdata, prototypes, bibliothèques, références hôtes),
le marquage, la résurrection et les listes de finalisation. Les références JS qui
doivent garder un objet Lua vivant ont un contrat de rétention/libération explicite.
Les cycles Lua et les éphemerons exigent un traitement dédié.

Les modes et paramètres du GC ne sont pas des valeurs factices. Les seuils exacts
et le coût des pas peuvent varier selon l'implémentation ; les comportements
prescrits par le manuel doivent être testables. L'optimisation de la compacité des
tableaux vient après les garanties de vie et de libération.

## Hôte et API

L'API JS doit spécifier comment elle représente les out-parameters, pointeurs,
allocateurs, userdata, chaînes externes, continuation contexts et fonctions C.
Chaque adaptation est reliée à une entrée officielle. Une ABI C native nécessite
un composant natif ou WebAssembly ; un objet JS portant le même nom ne la fournit pas.

Pour Node, les services de fichiers/processus/locales sont fournis par des adaptateurs
testés. Pour le navigateur, définir les capacités hôtes et une stratégie de système
de fichiers ; ne pas considérer une bibliothèque absente comme implémentée. Les
limitations du profil navigateur restent explicites dans la matrice de conformité.

## Migration du bytecode

Porter depuis l'archive 5.5.1 les instructions, les tailles de champs, les flags,
les tables de modes et les structures de prototypes. Mettre à jour en une unité
cohérente émission, exécution, lecture et écriture. Vérifier les nouvelles
instructions de fermeture, varargs et déclarations globales dans `lopcodes.h`.

Le lecteur rejette explicitement les versions et profils incompatibles ; il ne
doit pas requalifier des données 5.3 en 5.5. Les anciennes données sauvegardées
nécessitent une recompilation depuis le texte ou un outil de conversion séparé.
