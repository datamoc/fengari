"use strict";

/*
** True only on a real Node.js (or a runtime that implements process.versions.node).
** `typeof process` alone is not enough: browser bundlers often define a `process`
** shim, and the Node-only modules (fs, path, ...) are empty stubs there.
*/
module.exports = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
