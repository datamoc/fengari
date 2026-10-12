"use strict";

/* Compose the VM once. Factories never import other VM components.
 * Namespace references are wired before any Lua code can run. Components that
 * snapshot values follow their providers: object, lexer, code generator. */
const factories = {
    lobject: require("./runtime/lobject.js"),
    lfunc: require("./runtime/lfunc.js"),
    lstate: require("./runtime/lstate.js"),
    ltable: require("./runtime/ltable.js"),
    ltm: require("./runtime/ltm.js"),
    llex: require("./runtime/llex.js"),
    lcode: require("./runtime/lcode.js"),
    lparser: require("./runtime/lparser.js"),
    lundump: require("./runtime/lundump.js"),
    lvm: require("./runtime/lvm.js"),
    ldebug: require("./runtime/ldebug.js"),
    ldo: require("./runtime/ldo.js"),
    lapi: require("./runtime/lapi.js")
};

/* Allocate every namespace before invoking factories, preserving the order above. */
const components = Object.fromEntries(Object.keys(factories).map(name => [name, {}]));
for (const [name, create] of Object.entries(factories)) {
    Object.assign(components[name], create(components));
}

module.exports = components;
