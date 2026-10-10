"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync, execFileSync } = require("child_process");
const root = path.resolve(__dirname, "../..");
const archive = path.join(root, "docs/lua-5.5.1/reference/lua-5.5.1.tar.gz");
const expectedHash = "1c4b4068d67061f2a2231ad2b5422e77acea1487ea9890f6320af614f4373dce";
const archiveHash = crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
if (archiveHash !== expectedHash) throw new Error("Lua reference archive checksum mismatch");

function run(executable, args, options = {}) {
    const result = spawnSync(executable, args, { windowsHide: true, encoding: "utf8", timeout: 120000, ...options });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${executable} failed (${result.status})\n${result.stdout}\n${result.stderr}`);
    return result;
}

let vcvars;
if (process.platform === "win32") {
    const locator = path.join(process.env["ProgramFiles(x86)"], "Microsoft Visual Studio/Installer/vswhere.exe");
    const installation = execFileSync(locator, ["-latest", "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "-property", "installationPath"], { encoding: "utf8", windowsHide: true }).trim();
    vcvars = path.join(installation, "VC/Auxiliary/Build/vcvars64.bat");
    if (!installation || !fs.existsSync(vcvars)) throw new Error("An MSVC C toolchain is required");
}

for (const profile of ["int64", "int32"]) {
    const directory = path.join(root, ".lua55-build", profile);
    fs.mkdirSync(directory, { recursive: true });
    run("tar", ["-xzf", archive, "-C", directory]);
    const sourceDirectory = path.join(directory, "lua-5.5.1/src");
    const header = path.join(sourceDirectory, "luaconf.h");
    if (profile === "int32") {
        const original = fs.readFileSync(header, "utf8");
        const updated = original.replace(/(#define LUA_INT_DEFAULT\s+)LUA_INT_LONGLONG/, "$1LUA_INT_INT");
        if (updated === original) throw new Error("Cannot configure 32-bit integer reference profile");
        fs.writeFileSync(header, updated);
    }
    const sources = fs.readdirSync(sourceDirectory).filter(name => name.endsWith(".c") && name !== "luac.c").sort();
    const executable = path.join(directory, process.platform === "win32" ? "lua.exe" : "lua");
    let compilation;
    if (process.platform === "win32") {
        const options = ["/nologo", "/O2", "/MD", "/std:c11", "/DLUA_USE_WINDOWS", "/D_CRT_SECURE_NO_WARNINGS", `/Fe:"${executable}"`, ...sources];
        fs.writeFileSync(path.join(sourceDirectory, "compile.rsp"), options.join("\n"));
        const batch = path.join(__dirname, "build-native.cmd");
        const command = `""${batch}" "${vcvars}" "${sourceDirectory}""`;
        compilation = run("cmd.exe", ["/d", "/s", "/c", command], { windowsVerbatimArguments: true });
    } else {
        compilation = run(process.env.CC || "cc", ["-O2", ...sources, "-lm", "-o", executable], { cwd: sourceDirectory });
    }
    fs.writeFileSync(path.join(directory, "compile.log"), compilation.stdout + compilation.stderr);
    const release = run(executable, ["-v"]);
    const numeric = run(executable, ["-e", "print(string.packsize('j'), string.packsize('n'), math.mininteger, math.maxinteger)"]);
    const manifest = {
        target: "Lua 5.5.1", profile, builtAt: new Date().toISOString(), platform: process.platform,
        archiveSha256: archiveHash, executableSha256: crypto.createHash("sha256").update(fs.readFileSync(executable)).digest("hex"),
        release: (release.stdout + release.stderr).trim(), numericProfile: numeric.stdout.trim(),
        configuration: profile === "int32" ? "LUA_INT_DEFAULT=LUA_INT_INT; double floats; no LUA_32BITS" : "Upstream default: long long integers and double floats",
        compatibility: "No compatibility options enabled", compilerEnvironment: vcvars || process.env.CC || "cc",
        compilerLog: compilation.stdout + compilation.stderr
    };
    if (!manifest.release.includes("Lua 5.5.1")) throw new Error("Unexpected oracle release");
    const widths = manifest.numericProfile.split(/\s+/).slice(0, 2).map(Number);
    if (widths[0] !== (profile === "int64" ? 8 : 4) || widths[1] !== 8) throw new Error("Unexpected oracle numeric profile");
    fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    console.log(JSON.stringify({ profile, release: manifest.release, numericProfile: manifest.numericProfile, executable }));
}
