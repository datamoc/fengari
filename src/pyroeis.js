/**
@license MIT

Copyright © 2017-2019 Benoit Giannangeli
Copyright © 2017-2019 Daurnimator
Copyright © 1994–2017 Lua.org, PUC-Rio.
*/

"use strict";

const pyroeis = require("./library-runtime.js").pyroeis;
const { PyroeisVm, LuaError, LimitError, Multi, Yield, LuaRef, LuaFloat, Userdata, Coroutine } = require("./pyroeis-vm.js");

module.exports = Object.assign(pyroeis, { PyroeisVm, LuaError, LimitError, Multi, Yield, LuaRef, LuaFloat, Userdata, Coroutine });
