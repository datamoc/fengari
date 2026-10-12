"use strict";

// Test final pour vérifier que PyroeisVm peut exécuter du code Lua simple
function testFinal() {
    try {
        const { PyroeisVm } = require('../src/pyroeis-vm');
        
        // Créer une instance de PyroeisVm
        const vm = new PyroeisVm();
        
        // Exécuter une expression Lua simple
        const result = vm.run("return 42 + 8");
        console.log("Test - Résultat de 'return 42 + 8':", result); // Doit afficher 50
        
        if (result !== 50) {
            console.error("Le résultat attendu était 50, mais a obtenu:", result);
            return false;
        }
        
        // Exposer une fonction JavaScript à Lua
        vm.defineFunction('add', (a, b) => a + b);
        const addResult = vm.run("return add(10, 20)");
        console.log("Test - Résultat de 'add(10, 20)':", addResult); // Doit afficher 30
        
        if (addResult !== 30) {
            console.error("Le résultat attendu était 30, mais a obtenu:", addResult);
            return false;
        }
        
        console.log("✅ Test final: PASSED");
        return true;
    } catch (e) {
        console.error("Test échoué:", e.message);
        return false;
    }
}

// Exécution du test
testFinal();