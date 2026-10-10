"use strict";

/* Compose the VM once. Factories never import other VM components.
 * Namespace references are wired before any Lua code can run. Components that
 * snapshot values follow their providers: object, lexer, code generator. */
const createLobject = require("./runtime/lobject.js");
const createLfunc = require("./runtime/lfunc.js");
const createLstate = require("./runtime/lstate.js");
const createLtable = require("./runtime/ltable.js");
const createLtm = require("./runtime/ltm.js");
const createLlex = require("./runtime/llex.js");
const createLcode = require("./runtime/lcode.js");
const createLparser = require("./runtime/lparser.js");
const createLundump = require("./runtime/lundump.js");
const createLvm = require("./runtime/lvm.js");
const createLdebug = require("./runtime/ldebug.js");
const createLdo = require("./runtime/ldo.js");
const createLapi = require("./runtime/lapi.js");

const components = {
    lobject: {},
    lfunc: {},
    lstate: {},
    ltable: {},
    ltm: {},
    llex: {},
    lcode: {},
    lparser: {},
    lundump: {},
    lvm: {},
    ldebug: {},
    ldo: {},
    lapi: {}
};

Object.assign(components.lobject, createLobject(components));
Object.assign(components.lfunc, createLfunc(components));
Object.assign(components.lstate, createLstate(components));
Object.assign(components.ltable, createLtable(components));
Object.assign(components.ltm, createLtm(components));
Object.assign(components.llex, createLlex(components));
Object.assign(components.lcode, createLcode(components));
Object.assign(components.lparser, createLparser(components));
Object.assign(components.lundump, createLundump(components));
Object.assign(components.lvm, createLvm(components));
Object.assign(components.ldebug, createLdebug(components));
Object.assign(components.ldo, createLdo(components));
Object.assign(components.lapi, createLapi(components));

module.exports = components;
