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
            title: { en: "A metatable reaching for the JavaScript bridge", fr: "Une métatable qui cherche le pont JavaScript" },
            description: {
                en: "`__index` runs normally on both engines; it can only return what Lua can see. Without fengari-interop there is no `js` module to find, and blocking `__index` would break the standard library itself.",
                fr: "`__index` s’exécute normalement sur les deux moteurs ; il ne peut renvoyer que ce que Lua voit. Sans fengari-interop, aucun module `js` à trouver, et bloquer `__index` casserait la bibliothèque standard elle-même."
            },
            source: "local t = setmetatable({}, { __index = function() return js end }) return 'js is ' .. tostring(t.anything)", expected: "returned"
        },
        {
            id: "jsglobal",
            title: { en: "The js.global escape, without the interop", fr: "L’évasion js.global, sans l’interop" },
            description: {
                en: "fengari-interop would hand `js.global` to the script, and with it `eval`, the DOM and the network. Neither engine here loads it: the escape has nothing to reach, on upstream as on Pyroeis.",
                fr: "fengari-interop remettrait `js.global` au script, et avec lui `eval`, le DOM et le réseau. Aucun des deux moteurs ne le charge ici : l’évasion n’a rien à atteindre, sur l’amont comme sur Pyroeis."
            },
            source: "local ok, res = pcall(function() return js.global:eval('1+1') end) return ok and 'reached JavaScript' or 'no bridge: ' .. tostring(res)", expected: "returned"
        },
        {
            id: "proto",
            title: { en: "A __proto__ key, from Lua", fr: "Une clé __proto__, depuis Lua" },
            description: {
                en: "In Lua, `__proto__` is an ordinary key: it reads and writes a table slot, never a JavaScript prototype. Values cross as copies, so a `__proto__` key stays an own property; the translator flags it as unsafe.",
                fr: "En Lua, `__proto__` est une clé ordinaire : elle lit et écrit une case de table, jamais un prototype JavaScript. Les valeurs traversent en copies, une clé `__proto__` reste donc une propriété own ; le traducteur la signale comme unsafe."
            },
            source: "local t = { __proto__ = { x = 1 } } return type(t.__proto__) .. ' ' .. tostring(t.__proto__.x)", expected: "returned"
        },
        {
            id: "eval",
            title: { en: "A constant mentioning eval", fr: "Une constante mentionnant eval" },
            description: {
                en: "The source text contains `eval`, the word that worries a JavaScript host. A Lua string is data: `eval` is not a Lua global, and nothing in the engine executes a constant.",
                fr: "Le texte source contient `eval`, le mot qui inquiète un hôte JavaScript. Une chaîne Lua est de la donnée : `eval` n’est pas un global Lua, et rien dans le moteur n’exécute une constante."
            },
            source: "local f = load(\"return eval('1+1')\") local ok, res = pcall(f) return ok and 'ran' or 'lua-error: ' .. tostring(res)", expected: "returned"
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
