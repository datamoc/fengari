# Décisions à prendre

Ces décisions sont ouvertes. Les propositions facilitent le démarrage et ne sont
pas des choix déjà approuvés. Une décision peut modifier une représentation interne
ou nommer un profil ; elle ne doit pas transformer une exigence manquante en succès.

| ID | Question | Proposition initiale | Validation et impact |
| --- | --- | --- | --- |
| ADR-01 | Profil numérique de distribution ? | 64 bits signés avec BigInt, doubles avec Number ; profil 32 bits nommé si maintenu | Oracle correspondant ; API hôte et chunks adaptés ; migration des consommateurs |
| ADR-02 | Comment satisfaire GC, tables faibles et finalisation ? | Tas logique Lua au-dessus du GC JS | Modèle de racines, callbacks, coûts et modes ; preuve par tests, pas simple WeakRef |
| ADR-03 | Conventions de l'API JS pour out-parameters et pointeurs ? | Contrats documentés par fonction ; objets/tuples explicites où nécessaire | Compatibilité historique, types d'erreur, stack effects, résultats de resume |
| ADR-04 | Chaînes externes et buffers empruntés ? | Protocole de rétention/libération hôte avec octets stables | Durée de vie, mutation, callback, GC et fermeture de l'état |
| ADR-05 | IO/OS dans le navigateur ? | Services hôtes injectables et profil de capacités explicite | Système de fichiers, stdin/out, dates/locales et refus documentés ; ne pas annoncer IO complet sans services |
| ADR-06 | Compatibilité binaire 5.3/5.4 ? | Nouveau lecteur/writer 5.5.1 ; rejeter anciens chunks ; recompiler depuis les sources | Outils consommateurs, messages d'erreur, caches et tests croisés avec oracle |
| ADR-07 | Options de compatibilité et anciens ajouts ? | Cible 5.5 sans options implicites ; extensions JS isolées et annoncées | Syntaxe historique `local const`, mot global, aliases dépréciés et breaking changes |
| ADR-08 | CLI et ABI native C ? | Identifier explicitement les composants responsables ; API JS sémantique séparée de l'ABI | Distribution complète vs runtime ; besoin éventuel de natif/Wasm ; pas de conformité ABI par renommage |
| ADR-09 | Portage des tests C et internes ? | Fixtures originales + couche d'adaptation versionnée + journal d'exclusions | Tests comportementaux équivalents ; ne pas modifier les attentes pour accepter le port |
| ADR-10 | Hachage et aléatoire ? | Graine par état et politique d'entropie hôte ; implémentations 5.5.1 à auditer | Reproductibilité explicite, collisions, randomseed et différences autorisées par la configuration |

## Fiche de décision

```text
ID et titre :
État : ouverte | proposée | adoptée | remplacée
Date et responsables :
Exigences concernées :
Contexte et preuve actuelle :
Options étudiées :
Choix et raison :
Contrat observable :
Impact Node/navigateur/clients :
Preuves de validation :
Limitations restantes et formulation publique :
```

Les décisions adoptées doivent être reportées dans l'architecture, le plan et la
matrice de validation. Avant d'annoncer une conformité complète, vérifier qu'elles
ne laissent pas des exigences non réalisées derrière un profil non nommé.
