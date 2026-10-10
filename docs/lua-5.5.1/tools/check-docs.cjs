"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const directory = path.resolve(__dirname, "..");
const documentation = path.resolve(directory, "..");
const failures = [];

function filesUnder(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const filename = path.join(folder, entry.name);
        return entry.isDirectory() ? filesUnder(filename) : [filename];
    });
}

const markdown = filesUnder(documentation).filter(filename => filename.endsWith(".md"));
let checkedLinks = 0;
for (const filename of markdown) {
    const text = fs.readFileSync(filename, "utf8");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const href = match[1];
        if (/^[a-z]+:/i.test(href)) continue;
        const [link, fragment] = href.split("#");
        const target = path.resolve(path.dirname(filename), decodeURIComponent(link));
        checkedLinks++;
        if (!fs.existsSync(target)) failures.push(`${filename}: missing ${href}`);
        else if (fragment && target.endsWith(".html")) {
            const html = fs.readFileSync(target, "utf8");
            const anchor = decodeURIComponent(fragment);
            if (!html.includes(`name="${anchor}"`) && !html.includes(`id="${anchor}"`)) failures.push(`${filename}: missing anchor ${href}`);
        }
    }
}

const manifest = JSON.parse(fs.readFileSync(path.join(directory, "reference/manifest.json"), "utf8"));
for (const item of [...manifest.archives, ...manifest.extractedFiles]) {
    const filename = path.join(directory, "reference", item.file);
    if (!fs.existsSync(filename)) {
        failures.push(`missing reference ${item.file}`);
        continue;
    }
    const data = fs.readFileSync(filename);
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    if (hash !== item.sha256) failures.push(`checksum mismatch ${item.file}`);
    if (data.length !== item.bytes) failures.push(`size mismatch ${item.file}`);
}

const inventory = JSON.parse(fs.readFileSync(path.join(directory, "inventaire-api.json"), "utf8"));
for (const key of ["api", "library"]) {
    const names = inventory[key].map(row => key === "api" ? row.module + ":" + row.symbol : row.symbol);
    if (new Set(names).size !== names.length) failures.push(`duplicate entries in ${key}`);
    if (!names.length) failures.push(`empty inventory ${key}`);
}
const observations = JSON.parse(fs.readFileSync(path.join(directory, "observations.json"), "utf8"));
if (!observations.probes.length || !observations.sourceHashes.length) failures.push("empty observations");
const requirements = fs.readFileSync(path.join(directory, "03-exigences.md"), "utf8");
const tracker = fs.readFileSync(path.join(directory, "08-suivi-conformite.md"), "utf8");
function identifiers(text) {
    return [...text.matchAll(/^\| ([LABDVP]\d\d) \|/gm)].map(match => match[1]).sort();
}
if (JSON.stringify(identifiers(requirements)) !== JSON.stringify(identifiers(tracker))) failures.push("requirement/tracker mismatch");

if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
} else {
    console.log(JSON.stringify({ markdownFiles: markdown.length, localLinks: checkedLinks,
        verifiedReferences: manifest.archives.length + manifest.extractedFiles.length,
        apiEntries: inventory.api.length, libraryEntries: inventory.library.length,
        trackedRequirements: identifiers(tracker).length, status: "OK" }));
}
