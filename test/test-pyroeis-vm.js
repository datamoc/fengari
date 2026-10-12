"use strict";

const { PyroeisVm, LuaError } = require('../src/pyroeis-vm');

// Test 1: Maintenir un état persistant
function testPersistentState() {
    const vm = new PyroeisVm();
    vm.run("counter = (counter or 0) + 1");
    const result1 = vm.call("counter");
    console.log("Test 1 - Counter après première exécution:", result1); // Doit afficher 1
    
    vm.run("counter = counter + 1");
    const result2 = vm.call("counter");
    console.log("Test 1 - Counter après deuxième exécution:", result2); // Doit afficher 2
    
    return result1 === 1 && result2 === 2;
}

// Test 2: Exposer une fonction JavaScript à Lua
function testExposeFunction() {
    const vm = new PyroeisVm();
    vm.defineFunction('add', (a, b) => a + b);
    const result = vm.run("return add(5, 10)");
    console.log("Test 2 - Résultat de add(5, 10):", result); // Doit afficher 15
    
    return result === 15;
}

// Test 3: Conversion des types entre Lua et JavaScript
function testTypeConversion() {
    const vm = new PyroeisVm();
    vm.run("table = { x = 10, y = 20, z = { 30, 40 } }");
    const result = vm.call("table");
    console.log("Test 3 - Table Lua convertie en JavaScript:", result); // Doit afficher { x: 10, y: 20, z: [30, 40] }
    
    return result.x === 10 && result.y === 20 && result.z[0] === 30 && result.z[1] === 40;
}

// Test 4: Gestion des erreurs
function testErrorHandling() {
    const vm = new PyroeisVm();
    try {
        vm.run("error('Test d'erreur')");
        return false; // Ne doit pas atteindre cette ligne
    } catch (e) {
        console.log("Test 4 - Erreur Lua capturée:", e.message); // Doit afficher "Test d'erreur"
        return e instanceof LuaError && e.message.includes("Test d'erreur");
    }
}

// Test 5: Sauvegarde et restauration de l'état
function testSaveRestoreState() {
    const vm = new PyroeisVm();
    vm.run("x = 10");
    const savedState = vm.saveState();
    vm.run("x = 20");
    vm.restoreState(savedState);
    const result = vm.call("x");
    console.log("Test 5 - Valeur de x après restauration:", result); // Doit afficher 10
    
    return result === 10;
}

// Exécution des tests
function runTests() {
    const tests = [
        { name: "Maintenir un état persistant", test: testPersistentState },
        { name: "Exposer une fonction JavaScript à Lua", test: testExposeFunction },
        { name: "Conversion des types entre Lua et JavaScript", test: testTypeConversion },
        { name: "Gestion des erreurs", test: testErrorHandling },
        { name: "Sauvegarde et restauration de l'état", test: testSaveRestoreState }
    ];
    
    let passed = 0;
    tests.forEach(({ name, test }) => {
        try {
            const result = test();
            if (result) {
                console.log(`✅ ${name}: PASSED`);
                passed++;
            } else {
                console.log(`❌ ${name}: FAILED`);
            }
        } catch (e) {
            console.log(`❌ ${name}: FAILED - ${e.message}`);
        }
    });
    
    console.log(`\nRésultats: ${passed}/${tests.length} tests passés.`);
    return passed === tests.length;
}

runTests();