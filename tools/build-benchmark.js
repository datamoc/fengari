"use strict";

const path = require("path");
const { buildBrowser } = require("./build-browser.js");
const root = path.resolve(__dirname, "..");
buildBrowser(path.join(root, "src", "pyroeis.js"),
    path.join(root, "docs", "benchmark", "pyroeis.bundle.js"),
    "Pyroeis", "@datamoc/pyroeis browser bundle; MIT", ["Fengari"]);
