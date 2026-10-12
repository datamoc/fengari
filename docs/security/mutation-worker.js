"use strict";

/* Feeds the same deterministic series of corrupted binary chunks to the same Lua script on both engines.
   The script is ordinary Lua: it loads the chunk with load(..., "b") and runs it under pcall.
   The question is where a failure ends up: in Lua (load returns nil, pcall returns false), or as a JavaScript
   exception that crosses the Lua engine and reaches the host. */

const BASE = "local t = {} for i = 1, 3 do t[i] = tostring(i) .. 'x' end local function f(a, b) return a + b end return #t + f(1, 2), string.format('%d', 7)";
const SCRIPT = "local f, err = load(mutated(), '=mutated', 'b')\nif not f then return 'refused: ' .. tostring(err) end\nlocal ok, res = pcall(f)\nreturn ok and 'ran' or 'lua-error: ' .. tostring(res)";

function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function mutate(original, random) {
    const bytes = Uint8Array.from(original);
    const count = 1 + Math.floor(random() * 4);
    for (let i = 0; i < count; i++) bytes[Math.floor(random() * bytes.length)] = Math.floor(random() * 256);
    return bytes;
}

/* Upstream Fengari: the library surface of the other demonstrations (no os, io, package, debug, require). */
function upstreamEngine() {
    importScripts("../assets/fengari-0.1.5.bundle.js");
    const { lua, lauxlib, lualib, to_luastring, to_jsstring } = FengariUpstream;
    const open = () => {
        const L = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(L);
        for (const name of ["debug", "io", "os", "package", "require", "dofile", "loadfile"]) {
            lua.lua_pushnil(L);
            lua.lua_setglobal(L, to_luastring(name));
        }
        return L;
    };
    const L0 = open();
    lauxlib.luaL_loadstring(L0, to_luastring(`return string.dump(load(${JSON.stringify(BASE)}))`));
    lua.lua_pcall(L0, 0, 1, 0);
    const original = Uint8Array.from(lua.lua_tostring(L0, -1));
    lua.lua_close(L0);
    return {
        original,
        run(bytes) {
            const L = open();
            try {
                let budget = 100;
                lua.lua_sethook(L, state => { if (--budget < 0) lauxlib.luaL_error(state, to_luastring("instruction budget exceeded")); }, lua.LUA_MASKCOUNT, 1000);
                lua.lua_pushcfunction(L, state => { lua.lua_pushstring(state, bytes); return 1; });
                lua.lua_setglobal(L, to_luastring("mutated"));
                if (lauxlib.luaL_loadstring(L, to_luastring(SCRIPT)) !== lua.LUA_OK) throw new Error(to_jsstring(lua.lua_tostring(L, -1)));
                if (lua.lua_pcall(L, 0, 1, 0) !== lua.LUA_OK) return "lua-error: " + to_jsstring(lua.lua_tostring(L, -1));
                return to_jsstring(lua.lua_tostring(L, -1));
            } finally {
                lua.lua_close(L);
            }
        }
    };
}

/* Pyroeis with the sandbox preset, like the other demonstrations. */
function pyroeisEngine(original) {
    importScripts("../benchmark/pyroeis.bundle.js");
    return {
        original,
        run(bytes) {
            const vm = new Pyroeis.PyroeisVm(undefined, undefined, {
                sandbox: true,
                limits: { instructions: 20000, timeMs: 200, allocation: 1024 * 1024, totalAllocation: 4 * 1024 * 1024 }
            });
            try {
                vm.defineFunction("mutated", () => bytes);
                return String(vm.run(SCRIPT));
            } finally {
                Pyroeis.lua.lua_close(vm.state);
            }
        }
    };
}

self.onmessage = ({ data }) => {
    try {
        const upstream = upstreamEngine();
        const engine = data.engine === "upstream" ? upstream : pyroeisEngine(upstream.original);
        self.postMessage({ kind: "ready" });
        const random = mulberry32(data.seed);
        const outcomes = { refused: 0, ran: 0, luaError: 0, jsException: 0 };
        const escaped = new Map();
        const start = performance.now();
        for (let n = 0; n < data.count; n++) {
            const bytes = mutate(upstream.original, random);
            try {
                const result = engine.run(bytes);
                if (result.startsWith("refused")) outcomes.refused++;
                else if (result === "ran") outcomes.ran++;
                else outcomes.luaError++;
            } catch (error) {
                /* An error raised by the engine's own Lua-visible machinery is a LimitError or a Lua error with a message
                   from the chunk; anything else is a JavaScript exception that went through the Lua engine. */
                outcomes.jsException++;
                const key = `${error && error.constructor ? error.constructor.name : typeof error}: ${String(error && error.message).slice(0, 90)}`;
                escaped.set(key, (escaped.get(key) || 0) + 1);
            }
        }
        self.postMessage({ kind: "done", outcomes, escaped: [...escaped].sort((a, b) => b[1] - a[1]), ms: performance.now() - start, count: data.count });
    } catch (error) {
        self.postMessage({ kind: "setup-error", message: error.message });
    }
};
