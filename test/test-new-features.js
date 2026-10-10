"use strict";

// Test des nouvelles fonctionnalités dans Fengari
const { lua_resetthread, lua_closeslot } = require('../src/lapi.js');
const { luaX_tokens } = require('../src/llex.js');

console.log("✅ Nouvelles fonctions de l'API C exportées:", typeof lua_resetthread === 'function' && typeof lua_closeslot === 'function');
console.log("✅ Tokens pour 'const' et '<close>' définis:", luaX_tokens.includes("const") && luaX_tokens.includes("<close>"));