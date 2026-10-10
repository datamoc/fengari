# Validation et critères de conformité

La suite actuelle protège contre les régressions. La validation de Lua 5.5.1 doit
en plus comparer les contrats du manuel à un oracle de la version exacte.

## Oracle reproductible

Utiliser l'[archive officielle](reference/lua-5.5.1.tar.gz) dont l'empreinte est
vérifiée. L'extraire dans un répertoire de travail séparé, compiler avec le
toolchain de la plateforme et consigner : version, hash de l'archive, compilateur,
options, largeur des entiers et flottants, endianness et options de compatibilité.

Les commandes de compilation dépendent du système ; elles sont dans le
[readme officiel](reference/lua-5.5.1/doc/readme.html). Exemple POSIX, après
extraction : `make linux` puis `src/lua -v`. Sur Windows, utiliser un toolchain
adapté et enregistrer sa configuration ; ne pas supposer que `make linux` convient.

Le build est désormais reproductible avec `node tools/lua55/build-oracle.cjs`
depuis la racine. Il produit deux exécutables sous `.lua55-build/` : entiers
64 bits/doubles (distribution officielle par défaut) et entiers 32 bits/doubles
(comparaison avec le moteur actuel). Chaque build conserve son manifest et son
log de compilation. Sous Windows, le script utilise MSVC ; sous POSIX, `CC` ou
`cc`. Les copies du code et les exécutables restent hors du dépôt.

Une suite compilée avec l'API interne C ne s'exécute pas automatiquement dans le
moteur JS. Le build de l'oracle ne suffit pas à fermer M0 ou les portes suivantes.

## Suite officielle 5.5.1

Extraire [lua-5.5.1-tests.tar.gz](reference/lua-5.5.1-tests.tar.gz) sans modifier ses
originaux. La [page officielle](https://www.lua.org/tests/) distingue :

| Mode | Commande pour l'oracle, depuis la suite extraite | Portée |
| --- | --- | --- |
| Portable | `chemin/vers/lua -e"_U=true" all.lua` | Écarte certains tests lourds/non portables ; ne certifie pas toute la spécification |
| Complet | `chemin/vers/lua all.lua` | Requiert la construction des bibliothèques de tests dans `libs/` et `libs/P1/` |
| Interne | Oracle construit avec `ltests.c`, `ltests.h` et la configuration officielle | Accès aux structures internes et tests C ; adaptation/harness nécessaire pour JS |

Sur Windows, adapter la syntaxe du shell et les builds, en gardant les mêmes
intentions. Conserver logs, codes de sortie et message final. L'oracle doit lui
aussi passer les cas retenus, sinon distinguer défaut de plateforme et défaut du port.

Pour Fengari, créer un runner dédié aux scripts de la suite et porter les fonctions
de tests hôtes nécessaires. Garder le test original, le patch d'adaptation et sa
raison séparés. Tout test sans équivalent reste non couvert ; il n'est pas « réussi ».

## Comparaison différentielle

Le runner lance les mêmes sources avec l'oracle et Fengari. Il compare :

- acceptation/rejet à la compilation et catégorie de diagnostic ;
- type, nombre et valeur des résultats, y compris nil intermédiaires ;
- octets des chaînes, sous-type entier/flottant et grands entiers sans passage
  destructif par JSON/Number ;
- erreurs, avertissements, état des coroutines et séquence des callbacks ;
- effets de pile, de registry et de userdata côté API ;
- fichiers et sorties hôtes lorsque le profil expose ces services.

Normaliser seulement les éléments non prescrits : chemins absolus, adresses,
timings et détails de diagnostics dépendant de l'hôte. Documenter chaque règle.
Ne pas normaliser les types, l'ordre de fermeture, la présence d'un argument nil,
le nombre de résultats ou les différences de précision pour faire passer les tests.

## Corpus et commandes

Le [corpus actuel](../../test/lua55/cases.json) et le runner sont exécutables :

```powershell
node tools/lua55/differential.cjs
node tools/lua55/differential.cjs --int64
node tools/lua55/check-official-utf8.cjs
```

Les commandes différentielles écrivent un rapport puis échouent si un écart
subsiste. `--report-only` conserve les écarts dans le rapport sans code de sortie
d'échec ; ce mode sert au suivi, pas à certifier le moteur. Les rapports enregistrent
les empreintes des sources JS, des fixtures et de l'exécutable de référence.
Les valeurs scalaires sont comparées avec types et cardinalité : octets des
chaînes, entiers décimaux exacts et flottants binaires. Les textes des erreurs sont
conservés, mais seuls la phase et le type sont comparés par défaut ; une fixture
peut exiger le texte exact avec `compareDiagnostics`. Les objets non scalaires,
les sorties stdout, les effets de l'API native et les services hôtes restent à couvrir.

Le runner UTF-8 exécute `utf8.lua` officiel sans modification dans les deux oracles.
Dans Fengari, seule sa déclaration `global <const> *` est remplacée par un
commentaire ; toutes les assertions sont conservées. Cette adaptation ne valide
ni les déclarations globales ni readonly. Le rapport conserve les deux sources et
leurs empreintes : [official-utf8.json](official-utf8.json).

Le tableau suivant décrit la couverture à obtenir ; le corpus actuel ne la remplit
pas intégralement. Les preuves datées figurent dans [Avancement](09-avancement.md).

| Groupe | Cas obligatoires |
| --- | --- |
| Attributs | Préfixe/suffixe, readonly direct/capturé, close interdit sur global, attribut inconnu, liste avec plusieurs close |
| Global | Déclaration sans effacement, initialisation non-nil refusée, wildcard, readonly wildcard, scopes, `_ENV`, global function |
| Varargs | Table nommée readonly, table mutable, n/entrées modifiés influant sur `...`, nil, zéro argument, captures, table retournée, debug |
| Boucles | Contrôle numérique/générique readonly, masquage, closures, bornes et overflow |
| Close | Ordre inverse ; sortie normale, return, break, goto, erreur ; erreur dans close ; absence du second argument sans erreur ; coroutine suspendue/en erreur ; close API et réentrance |
| Opérateurs | Chaque métaméthode, chaîne call à 15 et au-delà, comparaisons/coercitions et fonctions multirésultats |
| Erreurs/warnings | `error(nil)`, handlers récursifs, warnings fragmentés, callback absent/présent et erreurs hôtes |
| Numérique | min/max, conversions mixtes, modulo/division, shifts, précision de relecture, NaN/infinis, zéro signé, `string.pack` |
| Bibliothèques | Chaque entrée inventoriée ; table.create ; deux retours utf8.offset ; userdata indexé en debug ; selected libs/preload ; randomseed |
| GC | Roots hôtes, cycles, weak k/v/kv, éphemerons, finalisation, résurrection, paramètres, strings externes et fermeture de l'état |
| Binaire | Texte JS→chunk→oracle et inverse, strip/no-strip, lecteurs fractionnés, fin de writer, versions/profils incompatibles, troncatures et limites |
| API | Effet de pile, indices invalides, 250/251 résultats, continuations, close slots/threads, allocateur/seed, signatures et callbacks |
| Distribution | Chargement à froid, navigateur/workers, API publique, CLI/init/options/env/REPL selon composant retenu |

Exemples de fixtures valides selon la cible :

```lua
local <const> a, b = 1, 2
return a + b
```

```lua
local f = function(...args)
  args[1] = 9
  args.n = 1
  return ...
end
return f(1, 2) -- doit produire 9 uniquement
```

```lua
global X
X = 1
global X = 2 -- doit échouer à l'exécution : X est déjà non-nil
```

```lua
local log = {}
do
  local a <close> = setmetatable({}, {
    __close = function(self, ...)
      log[#log + 1] = select('#', ...)
    end
  })
end
return log[1] -- 0 : aucun second argument sur une sortie normale
```

## Portée par environnement

Tester le langage et les bibliothèques portables sous Node et dans un contexte
navigateur sans `process`. Pour IO, OS et modules natifs, identifier les services
hôtes requis. Un service non disponible est une limitation de profil, pas une
réussite de conformité. Les cas natifs C demandent un équivalent JS vérifiable ou
un composant natif/Wasm ; consigner la différence entre sémantique API et ABI.

## Portes de validation

| Porte | Preuve nécessaire |
| --- | --- |
| G0 Références | Empreintes officielles, licence et profil de l'oracle enregistrés |
| G1 Régressions | `npm test -- --runInBand`, résultat actuel et liste des skips ; baseline comparée |
| G2 Imports | `npx jest test/dependencies.test.js --runInBand` ; aucun cycle, chargement à froid et navigateur |
| G3 Code | Lint du code modifié ; lint global et différences de baseline signalés séparément |
| G4 Contrats | Toutes les entrées d'inventaire et exigences reliées à un test comportemental |
| G5 Différentiels | Résultats oracle/JS identiques après normalisations déclarées |
| G6 Suite officielle | Portable et complet dans leur profil ; couverture interne adaptée et exclusions identifiées |
| G7 Hôtes/mémoire | Ressources, cycles, fermeture, callbacks et limites testés par profil |
| G8 Livraison | Version, docs, API, profils, format binaire et limitations cohérents |

Une quantité de tests réussis n'est pas un pourcentage de spécification couverte.
Une déclaration « Lua 5.5.1 entièrement implémenté » exige toutes les preuves du
périmètre annoncé, aucune lacune inconnue et aucune omission dissimulée par des skips.
