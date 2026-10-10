"use strict";

// Test des nouvelles fonctions de l'API C
const { lua_resetthread, lua_closeslot } = require('../src/lapi-ext.js');

console.log("✅ lua_resetthread exporté:", typeof lua_resetthread === 'function');
console.log("✅ lua_closeslot exporté:", typeof lua_closeslot === 'function');