"use strict";

// Test de base pour FengariVm
function testFengariVm() {
    try {
        const { FengariVm } = require('../src/fengari-vm');
        const vm = new FengariVm();
        
        // Exécuter une expression Lua simple
        const result = vm.run("return 42");
        console.log("✅ Résultat de 'return 42':", result);
        
        return result === 42;
    } catch (e) {
        console.error("Test échoué:", e.message);
        return false;
    }
}

// Exécution du test
testFengariVm();