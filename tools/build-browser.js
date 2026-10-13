"use strict";

const fs = require("fs");
const path = require("path");

/** Bundle CommonJS modules without adding a browser build dependency. */
function buildBrowser(entry, output, globalName, banner, aliases = [], defines = {}) {
    const nodeOnly = new Set(["fs", "os", "path", "tmp", "child_process", "readline-sync", "util"]);
    const modules = new Map();
    function add(filename) {
        if (modules.has(filename)) return modules.get(filename).id;
        const item = { id: modules.size, code: fs.readFileSync(filename, "utf8"), deps: {} };
        for (const [name, value] of Object.entries(defines)) item.code = item.code.split(name).join(value);
        modules.set(filename, item);
        const live = item.code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
        for (const [, , specifier] of live.matchAll(/\brequire\((['"])([^'"]+)\1\)/g)) {
            if (specifier in item.deps) continue;
            item.deps[specifier] = nodeOnly.has(specifier) ? -1 : add(require.resolve(
                specifier.startsWith(".") ? path.resolve(path.dirname(filename), specifier) : specifier,
                { paths: [path.dirname(filename), path.resolve(__dirname, "..", "node_modules")] }
            ));
        }
        return item.id;
    }
    const entryId = add(entry);
    const factories = [...modules.values()].map(({ id, code, deps }) =>
        `${id}: [function(require, module, exports) {\n${code}\n}, ${JSON.stringify(deps)}]`);
    const bundle = `/* ${banner} — generated; do not edit */
(function(global) {
"use strict";
var factories = {${factories.join(",\n")}};
var cache = {};
function load(id) {
    if (cache[id]) return cache[id].exports;
    var module = cache[id] = { exports: {} };
    var factory = factories[id];
    factory[0](function(specifier) {
        var dep = factory[1][specifier];
        if (dep === undefined) throw new Error("Cannot find module '" + specifier + "'");
        if (dep === -1) throw new Error("Module '" + specifier + "' is not available in the browser");
        return load(dep);
    }, module, module.exports);
    return module.exports;
}
global.${globalName} = load(${entryId});
${aliases.map(name => `global.${name} = global.${globalName};`).join("\n")}
})(typeof window !== "undefined" ? window : globalThis);
`;
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, bundle);
    console.log(`${path.relative(process.cwd(), output)}: ${modules.size} modules, ${(bundle.length / 1024).toFixed(0)} KiB`);
}

module.exports = { buildBrowser };
