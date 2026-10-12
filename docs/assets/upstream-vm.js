/* Adapter for unmodified upstream Fengari 0.1.5. Not an upstream sandbox API. */
(function(root) {
    "use strict";
    class UpstreamVm {
        constructor(instructions = null) {
            const { lua, lauxlib, lualib, to_luastring } = root.FengariUpstream;
            this.api = root.FengariUpstream;
            this.state = lauxlib.luaL_newstate();
            lualib.luaL_openlibs(this.state);
            // Same restricted library surface used for the demonstrations. No JS interop.
            for (const name of ["debug", "io", "os", "package", "require", "dofile", "loadfile"]) {
                lua.lua_pushnil(this.state);
                lua.lua_setglobal(this.state, to_luastring(name));
            }
            if (instructions !== null) {
                let remaining = instructions;
                const hook = state => {
                    remaining -= 1000;
                    if (remaining <= 0) lauxlib.luaL_error(state, to_luastring("instruction budget exceeded (host count hook)"));
                };
                lua.lua_sethook(this.state, hook, lua.LUA_MASKCOUNT, 1000);
            }
        }
        read() {
            const { lua, to_jsstring } = this.api;
            if (lua.lua_isnil(this.state, -1)) return null;
            if (lua.lua_isboolean(this.state, -1)) return lua.lua_toboolean(this.state, -1);
            if (lua.lua_isnumber(this.state, -1)) return lua.lua_tonumber(this.state, -1);
            return to_jsstring(lua.lua_tostring(this.state, -1));
        }
        checked(status) {
            if (status !== this.api.lua.LUA_OK) throw new Error(this.read());
        }
        run(source) {
            const { lua, lauxlib, to_luastring } = this.api;
            lua.lua_settop(this.state, 0);
            this.checked(lauxlib.luaL_loadstring(this.state, to_luastring(source)));
            this.checked(lua.lua_pcall(this.state, 0, 1, 0));
            const value = this.read();
            lua.lua_settop(this.state, 0);
            return value;
        }
        call(name, n) {
            const { lua, to_luastring } = this.api;
            lua.lua_getglobal(this.state, to_luastring(name));
            lua.lua_pushnumber(this.state, n);
            this.checked(lua.lua_pcall(this.state, 1, 1, 0));
            const value = this.read();
            lua.lua_settop(this.state, 0);
            return value;
        }
        close() { this.api.lua.lua_close(this.state); }
    }
    root.UpstreamVm = UpstreamVm;
})(globalThis);
