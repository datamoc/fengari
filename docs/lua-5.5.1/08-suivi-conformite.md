# Suivi de conformité

Ce fichier est maintenu manuellement. Les outils régénèrent les observations et
les inventaires, **pas ce tableau**. Ne pas ajouter des preuves uniquement aux
fichiers générés : elles seraient perdues à la prochaine capture.

## Statuts

- **À auditer** : du code existe, mais le contrat cible n'est pas entièrement vérifié.
- **À implémenter** : au moins une lacune est confirmée ; le reste du domaine reste à auditer.
- **En cours** : tâche et diff identifiés, validation encore incomplète.
- **Validée** : toutes les exigences de la ligne ont des tests et résultats actuels,
  avec le profil et les adaptations hôtes spécifiés.

L'absence d'une preuve n'est pas une validation. Les observations ci-dessous sont
des indices de travail, pas des tests de conformité complets. Le statut initial
est conservateur ; aucune ligne n'est validée par ce dossier.

## Matrice de travail

| ID | Domaine | Lot | Statut initial | Point de départ | Tests et preuve de clôture |
| --- | --- | --- | --- | --- | --- |
| L01 | Types et valeurs | M1 | À auditer | Entiers 32 bits, représentation des chaînes et tags existants | À renseigner |
| L02 | Portées, `_ENV`, global | M3 | À implémenter | Sonde `global`, parseur actuel | À renseigner |
| L03 | Erreurs et avertissements | M4 | À implémenter | Sondes nil-error et warnings | À renseigner |
| L04 | Métaméthodes | M4 | À auditer | `ltm`, VM et limites `__call` | À renseigner |
| L05 | GC, finalisation, weak/ephemeron | M5 | À implémenter | Sonde collectgarbage et stub lua_gc | À renseigner |
| L06 | Coroutines | M4 | À implémenter | Sonde coroutine-close, contrats de resume | À renseigner |
| L07 | Lexer | M3 | À implémenter | Global et attributs officiels absents/incomplets | À renseigner |
| L08 | Instructions du langage | M3 | À implémenter | Attributs, boucles readonly et global | À renseigner |
| L09 | Expressions, opérateurs, varargs | M2, M3 | À implémenter | Sonde named-varargs ; audit opérateurs | À renseigner |
| L10 | Captures et visibilité | M3 | À auditer | Upvalues, closures, debug et scopes | À renseigner |
| A01 | Contrat général de l'API | M6 | À auditer | API JS dérivée de 5.3 ; adaptations à spécifier | À renseigner |
| A02 | Toutes les entrées de l'API | M6 | À implémenter | Inventaire, signatures et exports absents | À renseigner |
| A03 | Bibliothèque auxiliaire | M6 | À implémenter | Inventaire luaL et nouveaux contrats | À renseigner |
| B01 | Ouverture sélective des bibliothèques | M6 | À implémenter | luaL_openselectedlibs et masques absents | À renseigner |
| B02 | Bibliothèque de base | M7 | À implémenter | warn, GC et changements d'erreurs | À renseigner |
| B03 | Bibliothèque coroutine | M7 | À implémenter | close absent ; reste à auditer | À renseigner |
| B04 | Bibliothèque package | M7 | À auditer | Loaders JS, chemins et API native à distinguer | À renseigner |
| B05 | Bibliothèque string | M2, M7 | À implémenter | Format de dump 5.3 ; audit patterns/pack/format | À renseigner |
| B06 | Bibliothèque utf8 | M7 | À implémenter | Sonde utf8-offset-results ; audit mode laxiste | À renseigner |
| B07 | Bibliothèque table | M7 | À implémenter | Sonde table-create ; reste à auditer | À renseigner |
| B08 | Bibliothèque math | M7 | À auditer | Profil numérique et génération aléatoire | À renseigner |
| B09 | Bibliothèque io et fichiers | M7 | À implémenter | Fonctions NYI et fixtures de méthodes | À renseigner |
| B10 | Bibliothèque os | M7 | À auditer | Services hôtes et variantes de plateforme | À renseigner |
| B11 | Bibliothèque debug | M7 | À implémenter | Uservalues indexées et varargs nommés | À renseigner |
| D01 | Interpréteur autonome | M8 | À auditer | Composant CLI externe à identifier | À renseigner |
| D02 | Incompatibilités 5.4→5.5 | M3–M8 | À implémenter | Manuel §8, toutes les différences à couvrir | À renseigner |
| D03 | Grammaire complète | M3 | À implémenter | Sondes de compilation ; corpus à créer | À renseigner |
| V01 | Instructions et prototypes | M2 | À implémenter | lopcodes actuel 5.3 | À renseigner |
| V02 | Lecture des chunks | M2 | À implémenter | Format actuel 0x53 | À renseigner |
| V03 | Écriture des chunks | M2 | À implémenter | Format et protocole writer à porter | À renseigner |
| P01 | Graphe acyclique et intégration | Tous | À auditer | Gate de dépendances existante, à maintenir à chaque lot | À renseigner |

Références normatives et détails : [Exigences](03-exigences.md).

## Avancement des contrats

Les contrats UTF-8, `table.create`, l'ouverture sélective et la normalisation des
erreurs nil ont reçu un portage et des tests. Les preuves et limites figurent dans
[Avancement vérifié](09-avancement.md). Les domaines L03, L07, B01, B06 et B07
sont **en cours** ; leur statut initial dans le tableau ci-dessus reste un repère
historique. Aucun domaine entier n'est encore déclaré validé.

## Preuves par entrée d'API ou de bibliothèque

Ajouter une fiche par contrat ou groupe de contrats, en citant les symboles exacts
de [l'inventaire](inventaire-api.md). Une preuve de présence ne suffit pas à fermer
le groupe. Les types C, macros de compilation et variables d'environnement doivent
recevoir une classification explicite et leur contrat applicable.

```text
Exigence / symboles :
Statut :
Lot et tâche :
Implémentation (fichiers/commit) :
Référence officielle :
Tests (fichiers/cas) :
Résultat oracle 5.5.1 / profil / date :
Résultat Fengari / profil / date :
Normalisations et adaptations hôtes :
Tests ignorés et couverture équivalente :
Lacunes restantes :
```

## Audit de livraison

Vérifier chaque ligne, puis chaque entrée inventoriée. Relever toute exigence sans
preuve, tout test ignoré non remplacé et toute adaptation non publiée. Le statut
global reste incomplet tant qu'un de ces éléments appartient au périmètre annoncé.
Les portes détaillées G0–G8 figurent dans [Validation](06-validation.md).
