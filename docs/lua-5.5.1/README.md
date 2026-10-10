# Implémenter Lua 5.5.1 dans Fengari

État documentaire au 10 octobre 2026. Cible figée : **Lua 5.5.1**, publiée le
24 juillet 2026. Ce dossier prépare l'implémentation ; il ne déclare pas la migration réalisée.

## Parcours de lecture

| Document | Utilité |
| --- | --- |
| [Références](01-references.md) | Manuel, sources, tests, versions, empreintes et licences |
| [État des lieux](02-etat-des-lieux.md) | Écarts constatés et limites des preuves actuelles |
| [Exigences](03-exigences.md) | Couverture du langage, de la VM, des bibliothèques et de l'API |
| [Architecture](04-architecture.md) | Composants à modifier et contraintes propres à JavaScript |
| [Plan d'implémentation](05-plan-implementation.md) | Lots ordonnés, dépendances et critères de sortie |
| [Validation](06-validation.md) | Oracle officiel, tests différentiels et définition de terminé |
| [Décisions](07-decisions.md) | Choix techniques à prendre sans réduire la cible de conformité |
| [Suivi de conformité](08-suivi-conformite.md) | Matrice manuelle des exigences, tâches et preuves de validation |
| [Avancement vérifié](09-avancement.md) | Changements du moteur, commandes reproductibles et lacunes restantes |
| [Inventaire des API](inventaire-api.md) | Symboles officiels rapprochés des exports et bibliothèques actuels |
| [Observations](observations.json) | Résultats reproductibles de sondes exécutées sur ce worktree |

## Références hors ligne

- [Manuel livré avec Lua 5.5.1](reference/lua-5.5.1/doc/manual.html).
- [Index du manuel](reference/lua-5.5.1/doc/contents.html).
- [Informations de distribution et licence](reference/lua-5.5.1/doc/readme.html).
- [Sources complètes officielles, archivées](reference/lua-5.5.1.tar.gz).
- [Suite officielle 5.5.1, archivée](reference/lua-5.5.1-tests.tar.gz).
- [Manifest des références et empreintes](reference/manifest.json).

Les en-têtes publics et `lopcodes.h` sont également extraits sous
`reference/lua-5.5.1/src/`. Les sources C complètes restent dans l'archive : elles
servent de référence de portage, sans devenir une dépendance du moteur JS.

## Actualiser et vérifier

Depuis la racine du dépôt, avec ses dépendances installées :

```powershell
node docs/lua-5.5.1/tools/capture-baseline.cjs
node docs/lua-5.5.1/tools/check-docs.cjs
```

La première commande actualise les observations et les inventaires ; la seconde
vérifie les liens locaux, les ancres locales et l'intégrité des références. Aucun
de ces outils ne certifie la conformité du moteur. Le protocole de certification
est décrit dans [Validation](06-validation.md).

## Règle de suivi

Un symbole exporté ou une syntaxe reconnue ne suffit pas à valider son contrat.
Toute exigence passe de « à implémenter / à auditer » à « validée » seulement avec
des tests comportementaux référencés, un résultat daté et le profil d'exécution.
Les adaptations JavaScript restent visibles ; elles ne doivent pas être présentées
comme une conformité à l'ABI native C.
