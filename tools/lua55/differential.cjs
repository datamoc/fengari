"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync, execFileSync } = require("child_process");
const root = path.resolve(__dirname, "../..");
const { lua, lauxlib, lualib, to_luastring } = require(path.join(root, "src/fengari.js"));
const protocol = "@@lua55@@";

function sourceHashes() {
    const hashes = {};
    function visit(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const filename = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(filename);
            else if (entry.isFile() && entry.name.endsWith(".js"))
                hashes[path.relative(root, filename).replace(/\\/g, "/")] = crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
        }
    }
    visit(path.join(root, "src"));
    return hashes;
}

function hex(bytes) {
    return Buffer.from(bytes).toString("hex");
}

function encode(L, index) {
    const type = lua.lua_type(L, index);
    if (type === lua.LUA_TNIL) return "nil";
    if (type === lua.LUA_TBOOLEAN) return "boolean:" + lua.lua_toboolean(L, index);
    if (type === lua.LUA_TSTRING) return "string:" + hex(lua.lua_tostring(L, index));
    if (type === lua.LUA_TNUMBER) {
        if (lua.lua_isinteger(L, index)) return "integer:" + String(lua.lua_tointeger(L, index));
        const bytes = Buffer.alloc(8);
        bytes.writeDoubleBE(lua.lua_tonumber(L, index));
        return "float:" + hex(bytes);
    }
    throw new Error("Unsupported differential result type " + type);
}

function runFengari(fixture) {
    const L = lauxlib.luaL_newstate();
    if (!L) throw new Error("Cannot create Fengari state");
    try {
        lualib.luaL_openlibs(L);
        const source = to_luastring(fixture.source);
        const compilation = lauxlib.luaL_loadbuffer(L, source, source.length, to_luastring("@" + fixture.id));
        if (compilation !== lua.LUA_OK) return { phase: "compilation", status: "error", values: [encode(L, -1)] };
        const execution = lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0);
        if (execution !== lua.LUA_OK) return { phase: "execution", status: "error", values: [encode(L, -1)] };
        const values = [];
        for (let index = 1; index <= lua.lua_gettop(L); index++) values.push(encode(L, index));
        return { phase: "execution", status: "ok", values };
    } finally {
        lua.lua_close(L);
    }
}

function oraclePaths(profile) {
    const directory = path.join(root, ".lua55-build", profile);
    return { directory, executable: path.join(directory, process.platform === "win32" ? "lua.exe" : "lua"), manifest: path.join(directory, "manifest.json") };
}

function runOracle(fixture, profile = "int32") {
    const oracle = oraclePaths(profile);
    if (!fs.existsSync(oracle.executable) || !fs.existsSync(oracle.manifest)) throw new Error("Build the oracle first: node tools/lua55/build-oracle.cjs");
    if (!/^[a-z0-9-]+$/.test(fixture.id)) throw new Error("Invalid fixture identifier");
    const fixtureDirectory = path.join(root, ".lua55-build/cases");
    fs.mkdirSync(fixtureDirectory, { recursive: true });
    const filename = path.join(fixtureDirectory, fixture.id + ".lua");
    fs.writeFileSync(filename, fixture.source);
    const result = spawnSync(oracle.executable, [path.join(__dirname, "oracle-driver.lua"), filename, fixture.id], {
        encoding: "utf8", windowsHide: true, timeout: 5000, maxBuffer: 1024 * 1024
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Oracle driver failed: " + result.stderr);
    const lines = result.stdout.split(/\r?\n/).filter(line => line.startsWith(protocol)).map(line => line.slice(protocol.length));
    const [phase, status] = (lines.shift() || "").split(":");
    if (!["compilation", "execution"].includes(phase) || !["ok", "error"].includes(status)) throw new Error("Invalid oracle protocol: " + result.stdout);
    return { phase, status, values: lines };
}

function equivalent(actual, expected, fixture) {
    if (actual.phase !== expected.phase || actual.status !== expected.status) return false;
    if (actual.status === "error" && !fixture.compareDiagnostics) {
        // Wording is recorded but not mandated by Lua; preserve phase and error-object type.
        return actual.values[0].split(":")[0] === expected.values[0].split(":")[0];
    }
    return JSON.stringify(actual.values) === JSON.stringify(expected.values);
}

function compare(fixture, profile = "int32") {
    const actual = runFengari(fixture);
    const expected = runOracle(fixture, profile);
    return { id: fixture.id, requirements: fixture.requirements, profile, source: fixture.source, actual, expected,
        matches: equivalent(actual, expected, fixture) };
}

function main() {
    const fixtures = JSON.parse(fs.readFileSync(path.join(root, "test/lua55/cases.json"), "utf8"));
    const profile = process.argv.includes("--int64") ? "int64" : "int32";
    const oracle = oraclePaths(profile);
    const manifest = JSON.parse(fs.readFileSync(oracle.manifest, "utf8"));
    const binaryHash = crypto.createHash("sha256").update(fs.readFileSync(oracle.executable)).digest("hex");
    if (binaryHash !== manifest.executableSha256) throw new Error("Oracle executable checksum mismatch");
    const results = fixtures.map(fixture => compare(fixture, profile));
    const report = {
        capturedAt: new Date().toISOString(), gitHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
        sourceHashes: sourceHashes(), fixturesSha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "test/lua55/cases.json"))).digest("hex"),
        oracle: manifest, currentFengariProfile: "int32/double; default distribution target remains int64/double",
        normalizations: ["Error wording is retained in reports; default comparison checks phase and error-object type. Set compareDiagnostics for exact wording."],
        limitations: ["Scalar results only; library/GC/native API suite coverage remains incomplete", "stdout side effects are not compared; fixtures must return observable traces", "Matching corpus does not certify the full specification"],
        total: results.length, matched: results.filter(result => result.matches).length, results
    };
    const output = path.join(root, "docs/lua-5.5.1/differential-" + profile + ".json");
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ profile, total: report.total, matched: report.matched, gaps: report.total - report.matched, report: path.relative(root, output) }));
    if (report.matched !== report.total && !process.argv.includes("--report-only")) process.exitCode = 1;
}

module.exports = { runFengari, runOracle, equivalent, compare, sourceHashes };
if (require.main === module) main();
