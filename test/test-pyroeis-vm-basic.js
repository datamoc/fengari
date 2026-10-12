"use strict";

// Test de base pour PyroeisVm
function testPyroeisVm() {
    try {
        const { PyroeisVm } = require('../src/pyroeis-vm');
        const vm = new PyroeisVm();
        
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
testPyroeisVm();