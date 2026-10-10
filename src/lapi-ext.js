"use strict";

const { lua_resetthread, lua_closeslot, lua_closethread, lua_toclose } = require("./lapi.js");

module.exports = { lua_resetthread, lua_closeslot, lua_closethread, lua_toclose };
