"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { runFengari, runOracle, equivalent, sourceHashes } = require("./differential.cjs");
const root = path.resolve(__dirname, "../..");
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const archive = path.join(root, "docs/lua-5.5.1/reference/lua-5.5.1-tests.tar.gz");
const archiveHash = sha256(fs.readFileSync(archive));
if (archiveHash !== "da07b543872dc0bb2ff12aabd0c248578d78df3eb6b67efdc537a46d455c7f31")
    throw new Error("Official test archive checksum mismatch");

const directory = path.join(root, ".lua55-build/tests");
fs.mkdirSync(directory, { recursive: true });
execFileSync("tar", ["-xzf", archive, "-C", directory], { windowsHide: true });
const original = fs.readFileSync(path.join(directory, "lua-5.5.1-tests/utf8.lua"), "utf8");
const declaration = /^global <const> \*\r?\n/m;
if (!declaration.test(original)) throw new Error("Official UTF-8 fixture changed; review adaptation");
const adapted = original.replace(declaration, "-- Adapter: global wildcard declaration omitted; assertions unchanged.\n");
const fixture = { id: "official-utf8", source: original };
const actual = runFengari({ ...fixture, source: adapted });
const results = ["int32", "int64"].map(profile => {
    const directory = path.join(root, ".lua55-build", profile);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
    const executable = path.join(directory, process.platform === "win32" ? "lua.exe" : "lua");
    if (sha256(fs.readFileSync(executable)) !== manifest.executableSha256)
        throw new Error("Oracle executable checksum mismatch");
    const expected = runOracle(fixture, profile);
    return { profile, oracle: manifest, expected, matches: actual.status === "ok" && equivalent(actual, expected, fixture) };
});
const report = {
    capturedAt: new Date().toISOString(), archiveSha256: archiveHash, sourceHashes: sourceHashes(),
    originalSourceSha256: sha256(original), adaptedSourceSha256: sha256(adapted),
    source: original, adaptedSource: adapted,
    adaptation: "Only the global <const> * declaration is replaced by a comment in Fengari. Both native oracles run the original source. Assertions and UTF-8 inputs are unchanged.",
    limitations: ["Does not validate global declarations or readonly enforcement", "Does not certify the complete official suite or host API", "stdout is not compared; Lua assertions determine success"],
    actual, results
};
const filename = path.join(root, "docs/lua-5.5.1/official-utf8.json");
fs.writeFileSync(filename, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ report: path.relative(root, filename), actual, profiles: results.map(r => ({ profile: r.profile, matches: r.matches })) }));
if (!results.every(result => result.matches)) process.exitCode = 1;
