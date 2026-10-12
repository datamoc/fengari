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
        }
    ];
})(globalThis);
