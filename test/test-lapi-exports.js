"use strict";

// Test des exports dans lapi.js
const { lua_resetthread, lua_closeslot } = require('../src/lapi.js');

console.log("✅ lua_resetthread exporté:", typeof lua_resetthread === 'function');
console.log("✅ lua_closeslot exporté:", typeof lua_closeslot === 'function');