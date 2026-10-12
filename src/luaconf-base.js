"use strict";

/* Configuration shared by definitions and the platform configuration. PYROEISCONF is a JSON object. */
const conf = typeof process !== "undefined" && process.env.PYROEISCONF
    ? JSON.parse(process.env.PYROEISCONF)
    : {};

module.exports.conf = conf;
module.exports.LUAI_MAXSTACK = conf.LUAI_MAXSTACK || 1000000;
