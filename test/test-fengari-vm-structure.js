"use strict";

// Test de structure pour vérifier que FengariVm peut être chargé et instancié
function testStructure() {
    try {
        const { FengariVm } = require('../src/fengari-vm');
        
        // Vérifier que FengariVm est une classe
        if (typeof FengariVm !== 'function') {
            console.error("FengariVm n'est pas une classe.");
            return false;
        }
        
        // Vérifier que la classe a un constructeur
        if (typeof FengariVm.prototype.constructor !== 'function') {
            console.error("FengariVm n'a pas de constructeur.");
            return false;
        }
        
        // Vérifier que la classe a les méthodes attendues
        const methods = ['run', 'call', 'defineFunction', 'push', 'read', 'saveState', 'restoreState'];
        for (const method of methods) {
            if (typeof FengariVm.prototype[method] !== 'function') {
                console.error(`FengariVm n'a pas la méthode ${method}.`);
                return false;
            }
        }
        
        console.log("✅ Structure de FengariVm: VALIDE");
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