/**
@license MIT

Copyright © 2017-2019 Benoit Giannangeli
Copyright © 2017-2019 Daurnimator
Copyright © 1994–2017 Lua.org, PUC-Rio.
*/

"use strict";

const fengari = require("./library-runtime.js").fengari;
const { FengariVm, LuaError, LimitError, Multi, Yield, LuaRef, LuaFloat, Userdata, Coroutine } = require("./fengari-vm.js");

module.exports = Object.assign(fengari, { FengariVm, LuaError, LimitError, Multi, Yield, LuaRef, LuaFloat, Userdata, Coroutine });
