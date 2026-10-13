(function(root) {
    "use strict";
    root.SECURITY_CASES = [
        {
            id: "loop",
            title: { en: "Lua loop: the control case", fr: "Boucle Lua\u202f: le cas témoin" },
            description: {
                en: "A bytecode loop is visible to a counting hook. Both engines must interrupt it.",
                fr: "Une boucle de bytecode est visible par un hook de comptage. Les deux moteurs doivent l’interrompre."
            },
            source: "while true do end", expected: "error"
        },
        {
            id: "pattern",
            title: { en: "Pattern search: native work invisible to the hook", fr: "Recherche de motif\u202f: travail natif invisible au hook" },
            description: {
                en: "Backtracking in string.find can burn a lot of CPU without running a new Lua instruction. Pyroeis adds interruption points to this search.",
                fr: "Le retour arrière de string.find peut consommer beaucoup de CPU sans exécuter de nouvelle instruction Lua. Pyroeis ajoute des points d’interruption à cette recherche."
            },
            source: "return ('a'):rep(20000):find('.-.-.-.-b')", expected: "timeout"
        },
        {
            id: "move",
            title: { en: "table.move: an oversized range", fr: "table.move\u202f: une plage démesurée" },
            description: {
                en: "Copying absent slots runs inside a single native function. The range size alone stalls the upstream engine; Pyroeis periodically interrupts this work.",
                fr: "La copie de cases absentes tourne dans une seule fonction native. La taille de la plage suffit à immobiliser le moteur amont\u202f; Pyroeis interrompt périodiquement ce travail."
            },
            source: "table.move({}, 1, 2^30, 2); return 'completed'", expected: "timeout"
        },
        {
            id: "pcall",
            title: { en: "pcall: hiding the overrun from the host code", fr: "pcall\u202f: masquer le dépassement au code hôte" },
            description: {
                en: "A script can catch a plain hook’s error and return normally. Pyroeis keeps an overrun state and fails the host call, even after pcall.",
                fr: "Un script peut attraper l’erreur d’un simple hook et retourner normalement. Pyroeis garde un état de dépassement et fait échouer l’appel hôte, même après pcall."
            },
            source: "local ok = pcall(function() while true do end end); return ok and 'unexpected' or 'budget error caught; normal host return'", expected: "returned"
        },
        {
            id: "xpcall",
            title: { en: "xpcall: a loop in the error handler", fr: "xpcall\u202f: une boucle dans le gestionnaire d’erreur" },
            description: {
                en: "The handler can run while hooks are disabled during the hook call that raised the error. Pyroeis re-enables control before reporting the overrun.",
                fr: "Le gestionnaire peut s’exécuter alors que les hooks sont désactivés pendant l’appel du hook qui a levé l’erreur. Pyroeis réactive le contrôle avant de signaler le dépassement."
            },
            source: "xpcall(function() while true do end end, function() while true do end end)", expected: "timeout"
        },
        {
            id: "allocation",
            title: { en: "An allocation beyond the budget", fr: "Une allocation au-delà du budget" },
            description: {
                en: "Upstream offers no Pyroeis-like allocation ceiling. This case reserves only 8 MiB: it shows an exceeded budget, without trying to exhaust browser memory.",
                fr: "L’amont n’offre pas le plafond d’allocation de Pyroeis. Ce cas réserve seulement 8 Mio\u202f: il illustre un budget dépassé, sans chercher à épuiser la mémoire du navigateur."
            },
            source: "return #string.rep('x', 8 * 1024 * 1024)", expected: "returned"
        },
        {
            id: "chunk",
            breach: { match: "forged chunk returned",
                yes: { en: "A forged chunk was accepted and ran", fr: "Un chunk forgé a été accepté et exécuté" },
                no: { en: "Forged chunk refused", fr: "Chunk forgé refusé" } },
            title: { en: "A forged binary chunk: one constant rewritten", fr: "Un chunk binaire forgé : une constante réécrite" },
            description: {
                en: "Both engines dump the same `return 1`, then the script rewrites one byte of its constant. Upstream loads the forged chunk as well-formed and returns the forged value: nothing verifies the operands. The Pyroeis sandbox has no `string.dump` and `load` accepts text only, so a binary chunk can be neither produced nor loaded.",
                fr: "Les deux moteurs sortent le même `return 1`, puis le script réécrit un octet de sa constante. L’amont charge le chunk forgé comme bien formé et renvoie la valeur forgée : rien ne vérifie les opérandes. Le sandbox Pyroeis n’a pas de `string.dump` et `load` n’accepte que du texte, un chunk binaire ne peut donc être ni produit ni chargé."
            },
            source: "local p = load(\"return 1\", \"=p\")\nif not string.dump then\n    local f, err = load(\"\\27Lua\\0\", '=forged', 'b')\n    if f then return 'binary chunk accepted' end\n    return 'refused: ' .. tostring(err)\nend\nlocal chunk = string.dump(p)\nchunk = chunk:sub(1, 65) .. string.char((chunk:byte(66) + 171) % 256) .. chunk:sub(67)\nlocal f, err = load(chunk, '=forged', 'b')\nif not f then return 'refused: ' .. tostring(err) end\nlocal ok, res = pcall(f)\nreturn ok and 'the forged chunk returned ' .. tostring(res) .. ' (the source says return 1)'\n    or 'lua-error: ' .. tostring(res)", expected: "returned"
        },
        {
            id: "concat",
            title: { en: "Quadratic string concatenation", fr: "Concaténation de chaînes quadratique" },
            description: {
                en: "`s = s .. 'A'` in a loop allocates every intermediate string. Upstream has no allocation ceiling and is stopped only by the adapter’s instruction budget; Pyroeis refuses the next allocation once the 4 MiB per call are spent.",
                fr: "`s = s .. 'A'` en boucle alloue chaque chaîne intermédiaire. L’amont n’a pas de plafond d’allocation et n’est arrêté que par le budget d’instructions de l’adaptateur ; Pyroeis refuse l’allocation suivante une fois les 4 Mio par appel dépensés."
            },
            source: "local s = '' for i = 1, 1e6 do s = s .. 'A' end return #s", expected: "error"
        },
        {
            id: "metatable",
            interop: true,
            breach: { match: "js is table",
                yes: { en: "The script reached the JavaScript bridge", fr: "Le script a atteint le pont JavaScript" },
                no: { en: "No JavaScript bridge", fr: "Aucun pont JavaScript" } },
            title: { en: "A metatable reaching for the JavaScript bridge (Fengari with interop)", fr: "Une métatable qui cherche le pont JavaScript (Fengari avec interop)" },
            description: {
                en: "`__index` runs normally on both engines; it can only return what Lua can see. With fengari-interop loaded, what Lua sees includes the `js` module, so the metatable hands the bridge to the script. Pyroeis has no such module to find, and blocking `__index` would break the standard library itself.",
                fr: "`__index` s’exécute normalement sur les deux moteurs ; il ne peut renvoyer que ce que Lua voit. Avec fengari-interop chargé, ce que Lua voit inclut le module `js` : la métatable remet le pont au script. Pyroeis n’a pas de tel module à trouver, et bloquer `__index` casserait la bibliothèque standard elle-même."
            },
            source: "local t = setmetatable({}, { __index = function() return js end }) return 'js is ' .. type(t.anything)", expected: "returned"
        },
        {
            id: "jsglobal-interop",
            breach: { match: "reached JavaScript",
                yes: { en: "The script ran JavaScript", fr: "Le script a exécuté du JavaScript" },
                no: { en: "No JavaScript bridge", fr: "Aucun pont JavaScript" } },
            interop: true,
            title: { en: "The js.global escape, with the interop (Fengari)", fr: "L’évasion js.global, avec l’interop (Fengari)" },
            description: {
                en: "Same script, but the upstream worker now loads fengari-interop 0.1.4, as an application exchanging data with JavaScript would. The script reaches `js.global:eval`: it runs JavaScript in the worker. Pyroeis has no such module, so the script finds no bridge; its data exchange goes through explicit copies.",
                fr: "Même script, mais le worker amont charge cette fois fengari-interop 0.1.4, comme le ferait une application qui échange des données avec JavaScript. Le script atteint `js.global:eval` : il exécute du JavaScript dans le worker. Pyroeis n’a pas de tel module, le script ne trouve donc aucun pont ; ses échanges de données passent par des copies explicites."
            },
            source: "local ok, res = pcall(function() return js.global:eval('1+1') end) return ok and 'reached JavaScript: ' .. tostring(res) or 'no bridge: ' .. tostring(res)", expected: "returned"
        },
        {
            id: "proto-interop",
            breach: { match: "inherits: yes",
                yes: { en: "The script polluted Object.prototype", fr: "Le script a pollué Object.prototype" },
                no: { en: "Object.prototype untouched", fr: "Object.prototype intact" } },
            interop: true,
            title: { en: "A __proto__ key, with the interop (Fengari)", fr: "Une clé __proto__, avec l’interop (Fengari)" },
            description: {
                en: "With fengari-interop, Lua holds real JavaScript objects. The script reads `__proto__` of a plain object, writes a key on it, then checks whether a brand-new `{}` inherits it: that is prototype pollution of the worker. Pyroeis has no `js` module; the same keys stay ordinary table slots.",
                fr: "Avec fengari-interop, Lua manipule de vrais objets JavaScript. Le script lit `__proto__` d’un objet simple, y écrit une clé, puis vérifie si un `{}` tout neuf en hérite : c’est une pollution de prototype du worker. Pyroeis n’a pas de module `js` ; les mêmes clés restent de simples cases de table."
            },
            source: "if not js then local t = {} t.__proto__ = {} t.__proto__.polluted = 1 return 'table slots only: ' .. tostring(({}).polluted) end local o = js.new(js.global.Object) o.__proto__.polluted = 'yes' return 'new {} inherits: ' .. tostring(js.new(js.global.Object).polluted)", expected: "returned"
        },
        {
            id: "gianttable",
            title: { en: "A giant table, under equal budgets", fr: "Une table géante, à budgets égaux" },
            description: {
                en: "A million slots are never allocated on either side: both engines stop the loop at the instruction budget. A Lua table is not capped by size — the budgets bound the loop that fills it.",
                fr: "Un million de cases n’est alloué d’aucun côté : les deux moteurs arrêtent la boucle au budget d’instructions. Une table Lua n’est pas plafonnée par sa taille — les budgets bornent la boucle qui la remplit."
            },
            source: "local t = {} for i = 1, 1e6 do t[i] = i end return #t", expected: "error"
        }
    ];
})(globalThis);
