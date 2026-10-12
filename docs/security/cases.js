(function(root) {
    "use strict";
    root.SECURITY_CASES = [
        {
            id: "loop", title: "Boucle Lua : le cas témoin",
            description: "Une boucle de bytecode est visible par un hook de comptage. Les deux moteurs doivent l’interrompre.",
            source: "while true do end", expected: "error"
        },
        {
            id: "pattern", title: "Recherche de motif : travail natif invisible au hook",
            description: "Le retour arrière de string.find peut consommer beaucoup de CPU sans exécuter de nouvelle instruction Lua. Pyroeis ajoute des points d’interruption à cette recherche.",
            source: "return ('a'):rep(20000):find('.-.-.-.-b')", expected: "timeout"
        },
        {
            id: "move", title: "table.move : une plage démesurée",
            description: "La copie de cases absentes tourne dans une seule fonction native. La taille de la plage suffit à immobiliser le moteur amont ; Pyroeis interrompt périodiquement ce travail.",
            source: "table.move({}, 1, 2^30, 2); return 'completed'", expected: "timeout"
        },
        {
            id: "pcall", title: "pcall : masquer le dépassement au code hôte",
            description: "Un script peut attraper l’erreur d’un simple hook et retourner normalement. Pyroeis garde un état de dépassement et fait échouer l’appel hôte, même après pcall.",
            source: "local ok = pcall(function() while true do end end); return ok and 'unexpected' or 'budget error caught; normal host return'", expected: "returned"
        },
        {
            id: "xpcall", title: "xpcall : une boucle dans le gestionnaire d’erreur",
            description: "Le gestionnaire peut s’exécuter alors que les hooks sont désactivés pendant l’appel du hook qui a levé l’erreur. Pyroeis réactive le contrôle avant de signaler le dépassement.",
            source: "xpcall(function() while true do end end, function() while true do end end)", expected: "timeout"
        },
        {
            id: "allocation", title: "Une allocation au-delà du budget",
            description: "L’amont n’offre pas le plafond d’allocation de Pyroeis. Ce cas réserve seulement 8 Mio : il illustre un budget dépassé, sans chercher à épuiser la mémoire du navigateur.",
            source: "return #string.rep('x', 8 * 1024 * 1024)", expected: "returned"
        }
    ];
})(globalThis);
