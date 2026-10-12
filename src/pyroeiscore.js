/* Pyroeis specific functions
 *
 * This file includes pyroeis-specific data or and functionality for users to
 * manipulate the engine's string type.
 * The fields are exposed to the user on the 'pyroeis' entry point; however to
 * avoid a dependency on defs.js from lauxlib.js they are defined in this file.
 */

const defs = require("./defs.js");

/* Keep in step with "version" in package.json (test/pyroeis-version.test.js checks it). */
const PYROEIS_VERSION_MAJOR   = "0";
const PYROEIS_VERSION_MINOR   = "7";
const PYROEIS_VERSION_NUM     = 7;
const PYROEIS_VERSION_RELEASE = "0";
const PYROEIS_VERSION         = "Pyroeis " + PYROEIS_VERSION_MAJOR + "." + PYROEIS_VERSION_MINOR;
const PYROEIS_RELEASE         = PYROEIS_VERSION + "." + PYROEIS_VERSION_RELEASE;
const PYROEIS_AUTHORS         = "datamoc, B. Giannangeli, Daurnimator";
const PYROEIS_COPYRIGHT       = PYROEIS_RELEASE + "  Copyright (C) 2026 datamoc\nBased on Fengari, Copyright (C) 2017-2019 B. Giannangeli, Daurnimator\nBased on: " + defs.LUA_COPYRIGHT;

module.exports.PYROEIS_AUTHORS         = PYROEIS_AUTHORS;
module.exports.PYROEIS_COPYRIGHT       = PYROEIS_COPYRIGHT;
module.exports.PYROEIS_RELEASE         = PYROEIS_RELEASE;
module.exports.PYROEIS_VERSION         = PYROEIS_VERSION;
module.exports.PYROEIS_VERSION_MAJOR   = PYROEIS_VERSION_MAJOR;
module.exports.PYROEIS_VERSION_MINOR   = PYROEIS_VERSION_MINOR;
module.exports.PYROEIS_VERSION_NUM     = PYROEIS_VERSION_NUM;
module.exports.PYROEIS_VERSION_RELEASE = PYROEIS_VERSION_RELEASE;
module.exports.is_luastring            = defs.is_luastring;
module.exports.luastring_eq            = defs.luastring_eq;
module.exports.luastring_from          = defs.luastring_from;
module.exports.luastring_indexOf       = defs.luastring_indexOf;
module.exports.luastring_of            = defs.luastring_of;
module.exports.to_jsstring             = defs.to_jsstring;
module.exports.to_luastring            = defs.to_luastring;
module.exports.to_uristring            = defs.to_uristring;
module.exports.from_userstring         = defs.from_userstring;
