"use strict";

/* Documentation snapshot only: this does not certify semantic conformance. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const repository = path.resolve(__dirname, "../../..");
const directory = path.resolve(__dirname, "..");
const reference = path.join(directory, "reference/lua-5.5.1");
const pyroeis = require(path.join(repository, "src/pyroeis.js"));
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = pyroeis;

function filesUnder(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const filename = path.join(folder, entry.name);
        return entry.isDirectory() ? filesUnder(filename) : [filename];
    });
}

function relative(filename) {
    return path.relative(repository, filename).replace(/\\/g, "/");
}

function sha256(filename) {
    return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function evaluate(source) {
    const L = lauxlib.luaL_newstate();
    if (!L) throw new Error("Cannot create Lua state");
    try {
        lualib.luaL_openlibs(L);
        const compilation = lauxlib.luaL_loadstring(L, to_luastring(source));
        if (compilation !== lua.LUA_OK) {
            return { phase: "compilation", status: compilation, error: lua.lua_tojsstring(L, -1) };
        }
        const execution = lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0);
        if (execution !== lua.LUA_OK) {
            return { phase: "execution", status: execution, error: lua.lua_tojsstring(L, -1) };
        }
        const values = [];
        for (let index = 1; index <= lua.lua_gettop(L); index++) {
            const type = lua.lua_type(L, index);
            const name = to_jsstring(lua.lua_typename(L, type));
            let value = null;
            if (type === lua.LUA_TBOOLEAN) value = lua.lua_toboolean(L, index);
            else if (type === lua.LUA_TNUMBER) value = String(lua.lua_tonumber(L, index));
            else if (type === lua.LUA_TSTRING) value = lua.lua_tojsstring(L, index);
            values.push({ type: name, value });
        }
        return { phase: "execution", status: execution, values };
    } finally {
        lua.lua_close(L);
    }
}

const probes = [
    ["version", "return _VERSION"],
    ["const-suffix", "local x <const> = 1; return x"],
    ["const-prefix", "local <const> x, y = 1, 2; return x+y"],
    ["close", "local x <close> = nil; return true"],
    ["legacy-const", "local const x = 1; return x"],
    ["global", "global X; X = 1; return X"],
    ["global-wildcard", "global<const> *; return math.pi"],
    ["named-varargs", "local f = function(...args) return args.n, args[1] end; return f(7)"],
    ["readonly-for", "for i=1,1 do i=7 end; return true"],
    ["table-create", "return type(table.create)"],
    ["coroutine-close", "return type(coroutine.close)"],
    ["warnings", "return type(warn)"],
    ["nil-error", "local ok,e=pcall(error,nil); return ok,type(e)"],
    ["utf8-offset-results", "return select('#',utf8.offset('a',1))"],
    ["float-roundtrip", "return tostring(1.2345678901234567)"],
    ["integer-profile", "return math.mininteger, math.maxinteger"],
    ["collectgarbage", "return collectgarbage('count')"]
];

const observations = {
    capturedAt: new Date().toISOString(),
    target: "Lua 5.5.1",
    nodeVersion: process.version,
    platform: process.platform,
    gitHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repository, encoding: "utf8" }).trim(),
    gitStatus: execFileSync("git", ["status", "--short"], { cwd: repository, encoding: "utf8" }).trim().split(/\r?\n/),
    limitations: "Observations of this worktree only; the Lua 5.5.1 oracle and full official suite were not run by this tool.",
    sourceHashes: filesUnder(path.join(repository, "src")).filter(filename => filename.endsWith(".js"))
        .map(filename => ({ file: relative(filename), sha256: sha256(filename) })),
    bytecodeVersion: require(path.join(repository, "src/lbytecode.js")).LUAC_VERSION,
    probes: probes.map(([id, source]) => ({ id, source, observed: evaluate(source) }))
};
fs.writeFileSync(path.join(directory, "observations.json"), JSON.stringify(observations, null, 2) + "\n");

const manual = fs.readFileSync(path.join(reference, "doc/manual.html"), "utf8");
const anchors = [...manual.matchAll(/<a\s+name="([^"]+)"/g)].map(match => match[1]);
const modules = { lua, lauxlib, lualib };
const rows = new Map();
function add(symbol, kind, header) {
    const moduleName = symbol.startsWith("luaopen_") || ["luaL_openlibs", "luaL_openselectedlibs"].includes(symbol)
        ? "lualib" : symbol.startsWith("luaL_") ? "lauxlib" : "lua";
    const actual = Object.prototype.hasOwnProperty.call(modules[moduleName], symbol) ? typeof modules[moduleName][symbol] : "absent";
    const status = kind === "type" ? "type-contract-to-define" : actual === "absent" ? "export-absent" : "present-contract-unverified";
    const key = moduleName + ":" + symbol;
    if (!rows.has(key) || kind === "type") rows.set(key, { symbol, kind, module: moduleName, observedType: actual, status, header });
}

for (const header of ["lua.h", "lauxlib.h", "lualib.h"]) {
    const text = fs.readFileSync(path.join(reference, "src", header), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of text.matchAll(/\b(?:LUA_API|LUALIB_API|LUAMOD_API)\b[^;]*?\((lua(?:L|open)?_[A-Za-z0-9_]+)\)\s*\(/g)) add(match[1], "function", header);
    for (const match of text.matchAll(/^\s*#define\s+(lua(?:L|open)?_[A-Za-z0-9_]+)\s*\(/gm)) add(match[1], "macro-function", header);
    for (const match of text.matchAll(/^\s*#define\s+(LUA[A-Z0-9_]+)\b/gm)) {
        const symbol = match[1];
        const moduleName = header === "lualib.h" ? "lualib" : header === "lauxlib.h" ? "lauxlib" : "lua";
        const actual = Object.prototype.hasOwnProperty.call(modules[moduleName], symbol) ? typeof modules[moduleName][symbol] : "absent";
        rows.set(moduleName + ":" + symbol, { symbol, kind: "constant-or-build-macro", module: moduleName, observedType: actual,
            status: actual === "absent" ? "export-or-adaptation-to-audit" : "present-contract-unverified", header });
    }
}
for (const symbol of anchors.filter(anchor => /^(lua_|luaL_|luaopen_)/.test(anchor))) {
    const isType = /^lua_[A-Z]/.test(symbol) || ["luaL_Buffer", "luaL_Reg", "luaL_Stream"].includes(symbol);
    add(symbol, isType ? "type" : "documented-api", "manual.html");
}

const api = [...rows.values()].sort((a, b) => a.module.localeCompare(b.module) || a.symbol.localeCompare(b.symbol));
const contextEntries = anchors.filter(anchor => /^pdf-(?:LUA|lua\.h)/.test(anchor)).map(anchor => ({
    symbol: anchor.slice(4), status: "environment-or-configuration-constant-to-audit"
}));
const library = anchors.filter(anchor => anchor.startsWith("pdf-") && !/^pdf-(?:LUA|lua\.h)/.test(anchor)).map(anchor => {
    const symbol = anchor.slice(4);
    if (symbol.includes(":")) return { symbol, status: "file-fixture-required", observed: null };
    return { symbol, status: "contract-unverified", observed: evaluate(`return type(${symbol})`) };
}).sort((a, b) => a.symbol.localeCompare(b.symbol));
fs.writeFileSync(path.join(directory, "inventaire-api.json"), JSON.stringify({ capturedAt: observations.capturedAt,
    note: "Presence is not semantic conformance; header macros include build-only contracts to classify explicitly.", api, library, contextEntries }, null, 2) + "\n");

const lines = ["# Lua 5.5.1 API inventory", "", `Captured: ${observations.capturedAt}.`, "",
    "Generated from the headers and manual anchors shipped with 5.5.1, matched against the current worktree.",
    "**The presence of an export does not validate its contract.** Configuration/build macros and C types require an explicit classification, not necessarily a JS export.", "",
    "File methods require a file fixture. Other library entries are probed under Node only: their type does not validate their behavior nor their browser availability.", "",
    "Detailed data: [inventaire-api.json](inventaire-api.json). Refresh: `node docs/lua-5.5.1/tools/capture-baseline.cjs`.", "",
    `## APIs, types and macros (${api.length} entries)`, "", "| Symbol | JS module | Kind | Observed type | Status | Reference |", "| --- | --- | --- | --- | --- | --- |"];
for (const row of api) {
    const link = anchors.includes(row.symbol) ? `reference/lua-5.5.1/doc/manual.html#${row.symbol}`
        : anchors.includes("pdf-" + row.symbol) ? `reference/lua-5.5.1/doc/manual.html#pdf-${row.symbol}` : `reference/lua-5.5.1/src/${row.header}`;
    lines.push(`| \`${row.symbol}\` | ${row.module} | ${row.kind} | ${row.observedType} | ${row.status} | [official](${link}) |`);
}
lines.push("", `## Standard libraries (${library.length} documented entries)`, "", "| Entry | Observed type / status | Reference |", "| --- | --- | --- |");
for (const row of library) {
    const value = row.observed?.values?.[0]?.value || row.status;
    lines.push(`| \`${row.symbol}\` | ${value} — ${row.status} | [official](reference/lua-5.5.1/doc/manual.html#pdf-${row.symbol}) |`);
}
lines.push("", "Each row must then receive its contract tests, the oracle/JS result and its profile, per [Validation](06-validation.md).", "");
lines.push(`## Documented constants, environment and configuration (${contextEntries.length} entries)`, "",
    "Constants may also appear in the header inventory. Environment variables and compilation options are not library functions.", "",
    "| Entry | Status | Reference |", "| --- | --- | --- |");
for (const row of contextEntries) lines.push(`| \`${row.symbol}\` | ${row.status} | [official](reference/lua-5.5.1/doc/manual.html#pdf-${row.symbol}) |`);
lines.push("");
fs.writeFileSync(path.join(directory, "inventaire-api.md"), lines.join("\n"));
console.log(JSON.stringify({ probes: probes.length, apiEntries: api.length, libraryEntries: library.length, capturedAt: observations.capturedAt }));
