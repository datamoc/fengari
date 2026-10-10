"use strict";

// Test simplifié pour vérifier que FengariVm peut être instancié et exécuter du code Lua basique
function testBasicFunctionality() {
    try {
        const { FengariVm } = require('../src/fengari-vm');
        const vm = new FengariVm();
        
        // Test basique: exécuter une expression Lua
        const result = vm.run("return 42");
        console.log("Test - Résultat de 'return 42':", result); // Doit afficher 42
        
        return result === 42;
    } catch (e) {
        console.error("Test échoué:", e.message);
        return false;
    }
}

// Exécution du test
if (testBasicFunctionality()) {
    console.log("✅ Test de base: PASSED");
} else {
    console.log("❌ Test de base: FAILED");
}