"use strict";

// Test des tokens pour const et <close>
const { luaX_tokens } = require('../src/llex.js');

// Convertir les Uint8Array en chaînes de caractères
const tokens = luaX_tokens.map(token => String.fromCharCode(...token));

console.log("Tokens définis:", tokens);
console.log("✅ Token 'const' défini:", tokens.includes("const"));
console.log("✅ Token '<close>' défini:", tokens.includes("<close>"));