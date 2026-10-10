# Références et provenance

## Référence normative

La cible est le manuel **livré dans la distribution 5.5.1**, conservé localement.
Le [manuel en ligne](https://www.lua.org/manual/5.5/manual.html) peut recevoir des
corrections ; une modification de référence doit être datée et expliquée.

| Source officielle | Copie locale | Rôle |
| --- | --- | --- |
| [Distribution 5.5.1](https://www.lua.org/ftp/lua-5.5.1.tar.gz) | [Archive](reference/lua-5.5.1.tar.gz) | Source exacte du portage, manuel et en-têtes |
| [Manuel 5.5](https://www.lua.org/manual/5.5/manual.html) | [Manuel figé](reference/lua-5.5.1/doc/manual.html) | Syntaxe, sémantique, bibliothèques et contrats de l'API |
| [Notes 5.5](https://www.lua.org/manual/5.5/readme.html) | [Notes figées](reference/lua-5.5.1/doc/readme.html) | Nouveautés et instructions de compilation |
| [Tests 5.5.1](https://www.lua.org/tests/lua-5.5.1-tests.tar.gz) | [Archive de tests](reference/lua-5.5.1-tests.tar.gz) | Tests de la version exacte |
| [Instructions des tests](https://www.lua.org/tests/) | Protocole résumé dans [Validation](06-validation.md) | Modes portable, complet et interne |
| [Téléchargements](https://www.lua.org/download.html) | Empreintes dans [manifest.json](reference/manifest.json) | Version publiée et vérification de provenance |
| [Historique des anomalies](https://www.lua.org/bugs.html) | Pas de copie figée | Vérifier les anomalies connues, sans changer silencieusement la cible |

Les deux archives ont été téléchargées le 10 octobre 2026. Leur SHA-256 a été
comparé aux valeurs publiées sur les pages officielles :

```text
lua-5.5.1.tar.gz
1c4b4068d67061f2a2231ad2b5422e77acea1487ea9890f6320af614f4373dce

lua-5.5.1-tests.tar.gz
da07b543872dc0bb2ff12aabd0c248578d78df3eb6b67efdc537a46d455c7f31
```

## Lire le code de référence

Les fichiers ci-dessous sont sous `lua-5.5.1/src/` dans l'archive officielle.

| Domaine | Sources C à comparer |
| --- | --- |
| Lexer, portée, déclarations, émission | `llex.c`, `lparser.c`, `lcode.c`, `lopcodes.h`, `lopcodes.c` |
| Instructions, opérateurs et appels | `lvm.c`, `ldo.c`, `ltm.c` |
| Valeurs, fonctions, états | `lobject.h`, `lobject.c`, `lfunc.c`, `lstate.h`, `lstate.c` |
| Tables, chaînes et mémoire | `ltable.c`, `lstring.c`, `lgc.c`, `lmem.c` |
| API et diagnostics | `lapi.c`, `lua.h`, `ldebug.c`, `ldebug.h` |
| Chunks binaires | `ldump.c`, `lundump.c`, `lundump.h` |
| Bibliothèque auxiliaire | `lauxlib.c`, `lauxlib.h` |
| Bibliothèques standard | `lbaselib.c`, `lcorolib.c`, `ldblib.c`, `liolib.c`, `lmathlib.c`, `loadlib.c`, `loslib.c`, `lstrlib.c`, `ltablib.c`, `lutf8lib.c`, `linit.c`, `lualib.h` |
| Interpréteur et compilateur autonomes | `lua.c`, `luac.c`, `Makefile`, `luaconf.h` |

Le portage doit partir de ces fichiers **5.5.1**, et non des pages de sources 5.3
ou 5.4 ni d'une branche Git non figée. Les tests historiques du dépôt restent des
tests de régression ; ils ne remplacent pas la suite 5.5.1.

## Licence et intégrité

Lua est distribué sous une licence permissive de type MIT. Le texte de licence
complet est conservé dans [lua.h](reference/lua-5.5.1/src/lua.h) et dans
[readme.html](reference/lua-5.5.1/doc/readme.html). Les mentions originales ne sont
pas supprimées. Les archives officielles sont conservées sans modification.

Le manifest enregistre la taille, l'empreinte et l'origine des archives ainsi que
l'empreinte de chaque fichier extrait. Ne pas éditer les copies de référence pour
faire correspondre le manuel au comportement du port JS : les adaptations et les
écarts se documentent dans les fichiers de travail.
