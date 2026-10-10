"use strict";

const { lua_resetthread, lua_closeslot } = require("./lapi.js");

module.exports = { lua_resetthread, lua_closeslot };
