"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { buildBrowser } = require("./build-browser.js");

const root = path.resolve(__dirname, "..");
const assets = path.join(root, "docs", "assets");
const packages = [
    {
        name: "fengari", version: "0.1.5", license: "MIT",
        integrity: "sha512-0DS4Nn4rV8qyFlQCpKK8brT61EUtswynrpfFTcgLErcilBIBskSMQ86fO2WVuybr14ywyKdRjv91FiRZwnEuvQ==",
        url: "https://registry.npmjs.org/fengari/-/fengari-0.1.5.tgz"
    },
    {
        name: "@datamoc/mw_games", version: "0.35.1", license: "MPL-2.0",
        integrity: "sha512-pwhRVC3DyXxTBPWPAF+w6Dteg+SpY/MGNe796IwN3Z4bWaNe8RdHvIPoyutF6if4NtlRw4MXvk7LV4srKF2RKw==",
        url: "https://registry.npmjs.org/@datamoc/mw_games/-/mw_games-0.35.1.tgz"
    }
];

async function main() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pyroeis-pages-"));
    fs.mkdirSync(assets, { recursive: true });
    try {
        for (const [index, pkg] of packages.entries()) {
            const response = await fetch(pkg.url);
            if (!response.ok) throw new Error(`Downloading ${pkg.name}: HTTP ${response.status}`);
            const bytes = Buffer.from(await response.arrayBuffer());
            const actual = "sha512-" + crypto.createHash("sha512").update(bytes).digest("base64");
            if (actual !== pkg.integrity) throw new Error(`Integrity mismatch for ${pkg.name}`);
            const unpack = path.join(tempRoot, String(index));
            fs.mkdirSync(unpack);
            const archive = path.join(unpack, "package.tgz");
            fs.writeFileSync(archive, bytes);
            execFileSync("tar", ["-xzf", archive, "-C", unpack]);
            const source = path.join(unpack, "package");
            if (pkg.name === "fengari") {
                buildBrowser(path.join(source, "src", "fengari.js"), path.join(assets, "fengari-0.1.5.bundle.js"),
                    "FengariUpstream", "Fengari 0.1.5 npm source; browser define process.env.FENGARICONF=undefined; MIT; see fengari-LICENSE.txt",
                    [], { "process.env.FENGARICONF": "undefined" });
                fs.copyFileSync(path.join(source, "LICENSE"), path.join(assets, "fengari-LICENSE.txt"));
            } else {
                fs.copyFileSync(path.join(source, "dist", "mw_games.global.js"), path.join(assets, "mw_games-0.35.1.global.js"));
                fs.copyFileSync(path.join(source, "LICENSE"), path.join(assets, "mwg-LICENSE.txt"));
            }
        }
        fs.writeFileSync(path.join(assets, "vendor-manifest.json"), JSON.stringify(packages, null, 2) + "\n");
        fs.copyFileSync(path.join(root, "logo.svg"), path.join(assets, "pyroeis.svg"));
        fs.copyFileSync(path.join(root, "logo.png"), path.join(assets, "pyroeis.png"));
        require("./build-benchmark.js");
        fs.writeFileSync(path.join(root, "docs", ".nojekyll"), "");
    } finally {
        // Only remove the unique directory created by this invocation inside the OS temp directory.
        if (path.dirname(tempRoot) !== path.resolve(os.tmpdir())) throw new Error("Unexpected temporary directory");
        fs.rmSync(tempRoot, { recursive: true, force: true });
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
