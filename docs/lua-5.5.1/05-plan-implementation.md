# Plan d'implémentation

Ce plan ordonne le travail sans annoncer de dates non étayées. Aucun lot n'est
marqué terminé à la création de ce dossier. Une tâche est fermée avec un diff,
des tests, leurs résultats et les exigences couvertes.

Les statuts et preuves sont conservés dans le [suivi de conformité](08-suivi-conformite.md),
séparément des inventaires générés.

## Lots et dépendances

| Lot | Dépend de | Travail | Exigences principales | Critère de sortie |
| --- | --- | --- | --- | --- |
| M0 — Référence et oracle | — | Installer/compiler l'oracle 5.5.1, enregistrer son profil, importer les cas et produire une baseline différentielle | Toutes, P01 | Version/hachage/profil enregistrés ; runner JS et oracle comparables ; exclusions visibles |
| M1 — Contrats et valeurs | M0 | Fixer profil numérique/API, porter tags et représentations, prototypes, userdata et conversions | L01, A01 | Tests de limites numériques, octets, identité et conversions hôtes ; aucune perte silencieuse |
| M2 — VM et format | M1 | Porter les instructions et prototypes 5.5.1, dispatch, émission compatible, dump/undump et debug structurel | V01–V03, L09, B05, B11 | Chaque opcode couvert ; échanges de chunks avec l'oracle au profil correspondant ; rejet des chunks incompatibles |
| M3 — Grammaire et résolution | M2 | Attributs, readonly, global, varargs nommés, boucles readonly, scopes et diagnostics | L02, L07–L10, D02–D03 | Corpus d'acceptations/rejets ; mutations/captures des varargs et déclarations globales conformes |
| M4 — Appels et fermeture | M2, M3 | Call frames, continuations, yields, ressources, close slots/threads/states et gestion des erreurs | L03, L04, L06, A01–A02, B03 | Matrice des sorties de scope, erreurs, réentrance et coroutines entièrement couverte |
| M5 — GC et tables faibles | M1, M4 | Tas/racines logiques, modes/paramètres, finalisation/résurrection, ephemerons, chaînes externes | L05, A02, B02 | Tests contrôlés de collecte, cycles, ordre, warnings et callbacks de libération ; pas de stubs déclarés conformes |
| M6 — API et auxiliaire | M1–M5 | Chaque entrée inventoriée : signatures, effets de pile, erreurs/yields, buffers et chargement sélectif | A01–A03, B01 | Inventaire complet avec tests par contrat et adaptations JS documentées |
| M7 — Bibliothèques et hôtes | M3–M6 | Base, package, string, utf8, table, math, debug, io, os et services hôtes | B02–B11 | Toutes les entrées testées ; profils Node/navigateur distincts ; absence de trous masqués par skips |
| M8 — Distribution et CLI | M6, M7 | Version, chemins, documentation, entrypoints, CLI/luac ou composants identifiés, migration des utilisateurs | D01–D02, P01 | Version publiée reflète les capacités ; options et environnement testés ; incompatibilités annoncées |
| M9 — Audit final | M0–M8 | Suite officielle, différentiels, tests internes adaptés, régressions, mémoire et navigateur | Toutes | Chaque exigence possède une preuve actuelle ; aucun statut inconnu dans le périmètre annoncé |

M6 et M7 peuvent préparer leurs tests avant la fin des dépendances. Ils ne sont pas
validés tant que les mécanismes sous-jacents sont incomplets. Éviter un long fork
où parseur, VM et format désignent des générations différentes.

## Première séquence concrète

1. Régénérer `observations.json` et l'inventaire, puis enregistrer une vraie exécution
   de `npm test -- --runInBand` sur l'état choisi comme baseline.
2. Ouvrir les décisions de [07-decisions.md](07-decisions.md). Ne pas convertir le
   numéro annoncé en 5.5.1 pour simuler une migration.
3. Compiler la distribution officielle et vérifier `lua -v`, les tailles numériques
   et les options de compatibilité. Ne pas comparer des profils numériques différents.
4. Écrire le runner différentiel, ses règles de normalisation et les cas de test
   minimaux du [protocole](06-validation.md). Les sondes actuelles servent de cas rouges.
5. Lancer M1 puis M2, en conservant le test de graphe des imports comme invariant.

## Format d'une tâche

```text
Titre : Mx / exigence / comportement observable
État : à faire | en cours | à vérifier | validée | bloquée
Référence : section/entrée du manuel figé, source C 5.5.1
Constat : observation actuelle, reproduction
Changement : fichiers, structure et contrats affectés
Tests : cas nominal, limites, erreur, yield/réentrance si applicables
Preuve : commande, version/profil, date et résultat
Adaptation hôte : aucune ou décision référencée
Restant : lacunes explicites, sans renommer l'objectif pour les exclure
```

## Conditions de livraison

La migration n'est pas livrable si `<close>` n'est qu'une syntaxe reconnue, si
`lua_gc` reste vide, si le bytecode garde une disposition 5.3 avec un octet 5.5,
ou si des fonctions nouvelles ne font que porter le nom de l'API officielle.

Chaque bibliothèque, type, fonction et constante de l'inventaire est auditée.
Les tests ignorés sont justifiés individuellement. Un profil partiel peut être
livré comme tel pendant le développement, mais il ne termine pas la cible de
conformité complète. Les contraintes liées à l'ABI native et à l'hôte nécessitent
une décision explicite et une formulation exacte des capacités publiées.
