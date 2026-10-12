"use strict";

// Test de structure pour vérifier que PyroeisVm peut être chargé et instancié
function testStructure() {
    try {
        const { PyroeisVm } = require('../src/pyroeis-vm');
        
        // Vérifier que PyroeisVm est une classe
        if (typeof PyroeisVm !== 'function') {
            console.error("PyroeisVm n'est pas une classe.");
            return false;
        }
        
        // Vérifier que la classe a un constructeur
        if (typeof PyroeisVm.prototype.constructor !== 'function') {
            console.error("PyroeisVm n'a pas de constructeur.");
            return false;
        }
        
        // Vérifier que la classe a les méthodes attendues
        const methods = ['run', 'call', 'defineFunction', 'push', 'read', 'saveState', 'restoreState'];
        for (const method of methods) {
            if (typeof PyroeisVm.prototype[method] !== 'function') {
                console.error(`PyroeisVm n'a pas la méthode ${method}.`);
                return false;
            }
        }
        
        console.log("✅ Structure de PyroeisVm: VALIDE");
        return true;
    } catch (e) {
        console.error("Test échoué:", e.message);
        return false;
    }
}

// Exécution du test
if (testStructure()) {
    console.log("✅ Test de structure: PASSED");
} else {
    console.log("❌ Test de structure: FAILED");
}