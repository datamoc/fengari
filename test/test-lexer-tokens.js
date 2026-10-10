"use strict";

const { luaX_tokens, LexState } = require('../src/llex.js');
const { luaS_new } = require('../src/lstring.js');
const { lua_State } = require('../src/lstate.js');

// Test des tokens pour const et <close>
function testLexerTokens() {
    try {
        // Initialiser le lexer
        const ls = new LexState();
        const L = new lua_State({});
        ls.L = L;
        ls.buff = { buffer: new Uint8Array(1024), n: 0 };
        ls.dyd = { actvar: { arr: [], n: 0, size: 0 }, gt: { arr: [], n: 0, size: 0 }, label: { arr: [], n: 0, size: 0 } };
        ls.t = { token: 0 };
        ls.lookahead = { token: 0 };
        ls.fs = null;
        ls.linenumber = 1;
        ls.lastline = 1;
        ls.source = luaS_new(L, "=test");
        ls.envn = luaS_new(L, "_ENV");
        
        // Vérifier que les tokens pour const et <close> sont définis
        const tokens = luaX_tokens.map(token => String.fromCharCode(...token));
        const hasConst = tokens.includes("const");
        const hasClose = tokens.includes("<close>");
        
        console.log("✅ Token 'const' défini:", hasConst);
        console.log("✅ Token '<close>' défini:", hasClose);
        
        return hasConst && hasClose;
    } catch (e) {
        console.error("❌ Échec du test des tokens -", e.message);
        return false;
    }
}

// Exécution du test
testLexerTokens();