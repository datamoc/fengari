"use strict";

const { lua_resetthread, lua_closeslot } = require('../src/lapi-ext.js');
const { lua, lauxlib, lualib } = require('../src/defs.js');

// Test de lua_resetthread
function testLuaResetThread() {
    try {
        const L = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(L);
        
        // Modifier l'état du thread
        lua.lua_pushnumber(L, 42);
        lua.lua_setglobal(L, "test_value");
        
        // Réinitialiser le thread
        const result = lua_resetthread(L);
        console.log("✅ lua_resetthread: Réinitialisation réussie avec code", result);
        
        // Vérifier que l'état est réinitialisé
        lua.lua_getglobal(L, "test_value");
        const type = lua.lua_type(L, -1);
        console.log("✅ lua_resetthread: État réinitialisé (type attendu: nil, obtenu:", type, ")");
        
        return result === lua.LUA_OK && type === lua.LUA_TNIL;
    } catch (e) {
        console.error("❌ lua_resetthread: Échec du test -", e.message);
        return false;
    }
}

// Test de lua_closeslot
function testLuaCloseSlot() {
    try {
        const L = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(L);
        
        // Créer une table
        lua.lua_newtable(L);
        lua.lua_pushnumber(L, 42);
        lua.lua_setfield(L, -2, "test_key");
        
        // Fermer un slot
        lua.lua_getfield(L, -1, "test_key");
        const idx = lua.lua_gettop(L);
        const result = lua_closeslot(L, idx);
        console.log("✅ lua_closeslot: Fermeture de slot réussie avec code", result);
        
        // Vérifier que le slot est fermé
        const type = lua.lua_type(L, idx);
        console.log("✅ lua_closeslot: Slot fermé (type attendu: nil, obtenu:", type, ")");
        
        return result === lua.LUA_OK && type === lua.LUA_TNIL;
    } catch (e) {
        console.error("❌ lua_closeslot: Échec du test -", e.message);
        return false;
    }
}

// Exécution des tests
console.log("\n=== Tests des nouvelles fonctions de l'API C ===\n");
const resetThreadPassed = testLuaResetThread();
const closeSlotPassed = testLuaCloseSlot();

console.log("\n=== Résultats ===");
console.log("✅ lua_resetthread:", resetThreadPassed ? "PASSED" : "FAILED");
console.log("✅ lua_closeslot:", closeSlotPassed ? "PASSED" : "FAILED");

if (resetThreadPassed && closeSlotPassed) {
    console.log("\n🎉 Tous les tests des nouvelles fonctions de l'API C ont réussi !");
} else {
    console.log("\n❌ Certains tests des nouvelles fonctions de l'API C ont échoué.");
}