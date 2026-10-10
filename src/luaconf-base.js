"use strict";

/* Configuration shared by definitions and the platform configuration. */
const conf = typeof process !== "undefined" && process.env.FENGARICONF
    ? JSON.parse(process.env.FENGARICONF)
    : {};

module.exports.conf = conf;
module.exports.LUAI_MAXSTACK = conf.LUAI_MAXSTACK || 1000000;
