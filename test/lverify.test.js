"use strict";

const { lua, lauxlib, lualib, to_luastring, to_jsstring } = require("../src/pyroeis.js");
const { PyroeisVm } = require("../src/pyroeis-vm.js");

/* A program that uses upvalues, varargs, loops, metamethods, goto, method calls and constants of every kind. */
const PROGRAM = `local up = 0 local function mk(n) local c = 0 return function(...) c = c + select('#', ...) + n up = up + 1 return c, ... end end
local f = mk(2) local t = {1, 2, 3, x = 'y'} local s = 0 for k, v in pairs(t) do s = s .. k end
for i = 10, 1, -3 do if i % 2 == 0 and s ~= nil or i < 5 then s = s .. i else s = (s or '') .. '|' end end
local o = setmetatable({}, {__index = function(_, k) return k .. '!' end, __call = function(self, a) return a end})
local m = ('abc'):upper() .. o.zz .. o(7) goto done ::done:: local a, b = f(1, 2, 3) return a, b, #t, m, t.x, 1 << 3, 7 // 2, 2 ^ 0.5, not nil`;

/* This chunk was found by corrupting a valid one: its CONCAT names registers far beyond the frame, so
   the VM used to spin inside that single instruction, where no count hook can reach it. */
const STALLING_CHUNK = "1b4c7561530019930d0a1a0a04040408087856000000000000000000000028774001846c6f63616c2074203d207b7d20666f7220693d312c3320646f20745b695d3d746f737472696e672869292e2e27782720656e64206c6f63616c2066756e6374696f6e206428612c62292072657475726e20612b6220656e642072657475726e202374202b206628312c32292c20737472696e672e666f726d617428272564272c20372900000000000000000001071a0000000b0000004100000081400000c10000006840018046814000800100026481000181c100005d8181020a4001026700fe7f6c0000009c000000c00080000101000041010100e48080018dc00001c64041005d80c10101c1010041010200e4008001a600000026008000090000001301000000000000001303000000000000001409746f737472696e671402781302000000000000001407737472696e671407666f726d61741403256413070000000000000001000000010001000000000100000001000000020003030000008d400000a60000012600800000000000000000000000000003000000010000000100000001000000020000000261000000000300000002620000000003000000000000001a000000010000000100000001000000010000000100000001000000010000d401000000010000000100000001000000010000000100000001000000010000000100000001000000010000000100000001000000010000000100000001000000010000000100000001000000060000000274010000001a0000000c28666f7220696e64657829040000000c0000000c28666f72206c696d697429040000000c0000000b28666f72207374657029040000000c0000000269050000000b00000002660d0000001a00000001000000055f454e56";

function dump(source) {
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    expect(lauxlib.luaL_loadstring(L, to_luastring(source))).toBe(lua.LUA_OK);
    const parts = [];
    lua.lua_dump(L, (state, p, size) => { parts.push(Uint8Array.from(p.slice(0, size))); return 0; }, null, false);
    lua.lua_close(L);
    const bytes = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes;
}

/* Loads and runs a binary chunk under a count hook; any JavaScript exception propagates to the caller. */
function loadAndRun(bytes) {
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    let budget = 200;
    lua.lua_sethook(L, state => { if (--budget < 0) lauxlib.luaL_error(state, to_luastring("budget")); }, lua.LUA_MASKCOUNT, 1000);
    try {
        const status = lauxlib.luaL_loadbuffer(L, bytes, bytes.length, to_luastring("=chunk"));
        if (status !== lua.LUA_OK) return { loaded: false, message: to_jsstring(lua.lua_tostring(L, -1)) };
        return { loaded: true, status: lua.lua_pcall(L, 0, 0, 0) };
    } finally {
        lua.lua_close(L);
    }
}

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

describe('binary chunks are checked when they are loaded', () => {

    test('a valid chunk still loads and runs', () => {
        const result = loadAndRun(dump(PROGRAM));
        expect(result).toEqual({ loaded: true, status: lua.LUA_OK });
    });

    test('a chunk whose operands leave the frame is refused instead of stalling the VM', () => {
        const result = loadAndRun(Uint8Array.from(Buffer.from(STALLING_CHUNK, "hex")));
        expect(result.loaded).toBe(false);
        expect(result.message).toMatch(/malformed \(invalid operand in CONCAT/);
    });

    test('a function that does not end with a return is refused', () => {
        const bytes = dump("return 1");
        const text = Buffer.from(bytes);
        /* the last instruction of the main function is RETURN 0 1; turn it into MOVE 0 0 */
        const marker = Buffer.from([0x26, 0x00, 0x80, 0x00]);
        const at = text.lastIndexOf(marker);
        expect(at).toBeGreaterThan(0);
        text[at] = 0x00;
        text[at + 2] = 0x00;
        const result = loadAndRun(Uint8Array.from(text));
        expect(result.loaded).toBe(false);
        expect(result.message).toMatch(/does not end with a return/);
    });

    test('a forged string size cannot make the loader allocate what the chunk does not contain', () => {
        const filler = 'x'.repeat(300);
        const bytes = dump(`return '${filler}'`);
        const text = Buffer.from(bytes);
        /* a string longer than 254 bytes is stored as 0xFF, its 4-byte size (length + 1) and the bytes */
        const sizeField = Buffer.alloc(4);
        sizeField.writeInt32LE(filler.length + 1);
        const at = text.indexOf(Buffer.concat([Buffer.from([0xFF]), sizeField, Buffer.from(filler)]));
        expect(at).toBeGreaterThan(0);
        text.writeInt32LE(0x7FFFFFFF, at + 1); /* declares a 2 GB string the chunk cannot hold */

        const L = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(L);
        let peak = 0;
        lua.lua_setallocf(L, (ud, size) => { if (size > peak) peak = size; }, null);
        const status = lauxlib.luaL_loadbuffer(L, Uint8Array.from(text), text.length, to_luastring("=chunk"));
        const message = status === lua.LUA_OK ? "" : to_jsstring(lua.lua_tostring(L, -1));
        lua.lua_close(L);
        expect(status).not.toBe(lua.LUA_OK);
        expect(message).toMatch(/truncated precompiled chunk/);
        expect(peak).toBeLessThan(64 * 1024); /* only what the chunk really holds was allocated */
    });

    test('corrupted chunks end as Lua errors, never as JavaScript exceptions or a stalled VM', () => {
        const original = dump(PROGRAM);
        const random = mulberry32(20260512);
        const counts = { refused: 0, ran: 0 };
        for (let n = 0; n < 3000; n++) {
            const bytes = Uint8Array.from(original);
            for (let i = 1 + Math.floor(random() * 4); i > 0; i--) bytes[Math.floor(random() * bytes.length)] = Math.floor(random() * 256);
            const result = loadAndRun(bytes);
            if (result.loaded) counts.ran++; else counts.refused++;
        }
        expect(counts.refused).toBeGreaterThan(0);
        expect(counts.ran).toBeGreaterThan(0);
    }, 60000);

    test('the sandbox does not parse binary chunks at all', () => {
        const vm = new PyroeisVm(undefined, undefined, { sandbox: true });
        vm.defineFunction("chunk", () => dump(PROGRAM));
        expect(vm.run("local f, err = load(chunk(), '=c', 'b') return f == nil and err")).toMatch(/binary chunk/);
    });
});
