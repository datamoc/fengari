"use strict";

const { lua, lauxlib, lualib, to_luastring, to_jsstring } = require("../src/fengari.js");
const { runFengari } = require("../tools/lua55/differential.cjs");

const text = s => "string:" + Buffer.from(s).toString("hex");

function run(source) {
    return runFengari({ id: "attribs", source });
}

function values(source) {
    const result = run(source);
    expect(result).toMatchObject({ status: "ok" });
    return result.values;
}

function errorMessage(source) {
    const result = run(source);
    expect(result.status).toBe("error");
    return Buffer.from(result.values[0].slice("string:".length), "hex").toString().replace(/^attribs:\d+: /, "");
}

describe("<const>", () => {
    test("reads like a local", () => {
        expect(values("local x <const> = 5 return x")).toEqual(["integer:5"]);
        expect(values("local <const> x, y = 1, 2 return x + y")).toEqual(["integer:3"]);
    });

    test("assignment is a compile-time error, through locals and upvalues", () => {
        expect(errorMessage("local x <const> = 1 x = 2")).toBe("attempt to assign to const variable 'x'");
        expect(errorMessage("local x <const> = 1 local function f() x = 2 end"))
            .toBe("attempt to assign to const variable 'x'");
        expect(errorMessage("local x <const> = 1 return function() return function() x = 2 end end"))
            .toBe("attempt to assign to const variable 'x'");
        expect(errorMessage("local a, b <const> = 1, 2 a = 3 b = 4")).toBe("attempt to assign to const variable 'b'");
    });

    test("a shadowing local stays assignable", () => {
        expect(values("local x <const> = 1 do local x = 2 x = 3 end return x")).toEqual(["integer:1"]);
    });

    test("an unknown attribute is named", () => {
        expect(errorMessage("local x <foo> = 1")).toBe("unknown attribute 'foo'");
    });

    test("'const' and 'close' remain ordinary names", () => {
        expect(values("local const, close = 1, 2 local t = {const = 3, close = 4} return const + close + t.const + t.close"))
            .toEqual(["integer:10"]);
    });
});

describe("<close>", () => {
    const item = "local log = '' local function item(n) return setmetatable({}, {__close = function(_, e) log = log .. n .. (e and ('!' .. tostring(e)) or '') end}) end ";

    test("closes in reverse order at block exit, with a nil error", () => {
        expect(values(item + "do local a <close> = item('a') local b <close> = item('b') end return log"))
            .toEqual([text("ba")]);
        expect(values("local n do local a <close> = setmetatable({}, {__close = function(self, ...) n = select('#', ...) end}) end return n"))
            .toEqual(["integer:1"]);
    });

    test("nil and false are accepted, anything else needs __close", () => {
        expect(values("local x <close> = nil local y <close> = false return 7")).toEqual(["integer:7"]);
        expect(errorMessage("local x <close> = 42")).toBe("variable 'x' got a non-closable value");
    });

    test("the variable is read-only and only one is allowed per local statement", () => {
        expect(errorMessage("local x <close> = nil x = 1")).toBe("attempt to assign to const variable 'x'");
        expect(errorMessage("local a <close>, b <close> = nil, nil")).toBe("multiple to-be-closed variables in local list");
    });

    test("runs on return without disturbing the returned values", () => {
        expect(values(item + "local function f() local a <close> = item('a') return 1, 2, 3 end local x, y, z = f() return x, y, z, log"))
            .toEqual(["integer:1", "integer:2", "integer:3", text("a")]);
        expect(values(item + "local function f(...) local a <close> = item('a') return ... end return f(4, 5, 6)"))
            .toEqual(["integer:4", "integer:5", "integer:6"]);
    });

    test("a call in return position is not a tail call inside the scope", () => {
        expect(values(item + "local function g() return log end local function f() local a <close> = item('a') return g() end return f(), log"))
            .toEqual([text(""), text("a")]);
    });

    test("runs on break and goto", () => {
        expect(values("local log = '' for i = 1, 3 do local a <close> = setmetatable({}, {__close = function() log = log .. i end}) if i == 2 then break end end return log"))
            .toEqual([text("12")]);
        expect(values("local log = '' do local i = 0 ::top:: i = i + 1 do local a <close> = setmetatable({}, {__close = function() log = log .. i end}) if i < 3 then goto top end end end return log"))
            .toEqual([text("123")]);
    });

    test("runs in the main chunk and in loops that finish normally", () => {
        expect(values("local s = '' for i = 1, 3 do local a <close> = setmetatable({}, {__close = function() s = s .. i end}) end return s"))
            .toEqual([text("123")]);
        expect(values("local s = '' local i = 0 repeat i = i + 1 local a <close> = setmetatable({}, {__close = function() s = s .. i end}) until i >= 2 return s"))
            .toEqual([text("12")]);
    });

    test("closures captured before the close still see the variable", () => {
        expect(values("local f do local a <close> = setmetatable({v = 5}, {__close = function(o) f = function() return o.v end end}) end return f()"))
            .toEqual(["integer:5"]);
    });

    test("an error unwinding to pcall closes with the error object", () => {
        expect(values(item + "local ok, e = pcall(function() local a <close> = item('a') error('boom', 0) end) return ok, e, log"))
            .toEqual(["boolean:false", text("boom"), text("a!boom")]);
    });

    test("xpcall hands the closer the handled error", () => {
        expect(values("local log = '' local ok, e = xpcall(function() local a <close> = setmetatable({}, {__close = function(_, err) log = tostring(err) end}) error('boom', 0) end, function(m) return 'H:' .. m end) return ok, e, log"))
            .toEqual(["boolean:false", text("H:boom"), text("H:boom")]);
    });

    test("an error in a closer replaces the error and the other closers still run", () => {
        expect(values("local ok, e = pcall(function() local a <close> = setmetatable({}, {__close = function() error('second', 0) end}) error('first', 0) end) return ok, e"))
            .toEqual(["boolean:false", text("second")]);
        expect(values("local log = '' local ok, e = pcall(function() local a <close> = setmetatable({}, {__close = function() log = log .. 'a' end}) local b <close> = setmetatable({}, {__close = function() log = log .. 'b' error('x', 0) end}) end) return ok, e, log"))
            .toEqual(["boolean:false", text("x"), text("ba")]);
    });

    test("nested protected calls each close their own variables", () => {
        expect(values("local log = '' local function f() local a <close> = setmetatable({}, {__close = function() log = log .. 'a' end}) pcall(function() local b <close> = setmetatable({}, {__close = function() log = log .. 'b' end}) error('x') end) log = log .. '|' end f() return log"))
            .toEqual([text("b|a")]);
    });

    test("a closer cannot yield", () => {
        const [ok, message] = values("local co = coroutine.wrap(function() local a <close> = setmetatable({}, {__close = function() coroutine.yield() end}) end) return pcall(co)");
        expect(ok).toBe("boolean:false");
        expect(Buffer.from(message.slice(7), "hex").toString()).toMatch(/attempt to yield/);
    });

    test("a coroutine may yield over a to-be-closed variable", () => {
        expect(values("local co = coroutine.wrap(function() local a <close> = setmetatable({}, {__close = function() out = 'closed' end}) coroutine.yield('y') return 'r' end) local y = co() local r = co() return y, r, out"))
            .toEqual([text("y"), text("r"), text("closed")]);
    });
});

describe("generic for closing value", () => {
    const closer = "setmetatable({}, {__close = function() log = log .. 'c' end})";

    test("is closed when the loop ends, breaks, errors or returns", () => {
        expect(values(`local log = '' for i in function(s, c) if c < 2 then return c + 1 end end, nil, 0, ${closer} do log = log .. i end return log`))
            .toEqual([text("12c")]);
        expect(values(`local log = '' for i in function(s, c) return c + 1 end, nil, 0, ${closer} do break end return log`))
            .toEqual([text("c")]);
        expect(values(`local log = '' pcall(function() for i in function(s, c) return c + 1 end, nil, 0, ${closer} do error('x') end end) return log`))
            .toEqual([text("c")]);
        expect(values(`local log = '' local function f() for i in function(s, c) return c + 1 end, nil, 0, ${closer} do return i end end local v = f() return v, log`))
            .toEqual(["integer:1", text("c")]);
    });

    test("must be closable", () => {
        expect(errorMessage("for i in next, {}, nil, 42 do end")).toMatch(/non-closable value/);
    });

    test("ordinary loops are unaffected", () => {
        expect(values("local n = 0 for k, v in pairs({a = 1, b = 2}) do n = n + v end for i, v in ipairs({5, 6, 7}) do n = n + i * v end return n"))
            .toEqual(["integer:41"]);
        expect(values("local fs = {} for k, v in pairs({10, 20}) do fs[#fs + 1] = function() return k + v end end return fs[1]() + fs[2]()"))
            .toEqual(["integer:33"]);
    });
});

describe("coroutine.close", () => {
    test("closes a suspended coroutine and leaves it dead", () => {
        expect(values("local log = '' local co = coroutine.create(function() local a <close> = setmetatable({}, {__close = function() log = log .. 'c' end}) coroutine.yield() end) coroutine.resume(co) return coroutine.close(co), coroutine.status(co), log"))
            .toEqual(["boolean:true", text("dead"), text("c")]);
    });

    test("a coroutine killed by an error reports it and runs the pending closers", () => {
        expect(values("local log = '' local co = coroutine.create(function() local a <close> = setmetatable({}, {__close = function() log = log .. 'c' end}) error('e', 0) end) local ok, e = coroutine.resume(co) local r1, r2 = coroutine.close(co) return ok, e, r1, r2, log"))
            .toEqual(["boolean:false", text("e"), "boolean:false", text("e"), text("c")]);
    });

    test("an error in a closer is returned", () => {
        expect(values("local co = coroutine.create(function() local a <close> = setmetatable({}, {__close = function() error('cl', 0) end}) coroutine.yield() end) coroutine.resume(co) return coroutine.close(co)"))
            .toEqual(["boolean:false", text("cl")]);
    });

    test("refuses a running or normal coroutine", () => {
        expect(values("return pcall(coroutine.close, coroutine.running())")).toEqual(["boolean:false", text("cannot close a running coroutine")]);
    });

    test("coroutine.wrap closes the coroutine when it fails", () => {
        expect(values("local log = '' local f = coroutine.wrap(function() local a <close> = setmetatable({}, {__close = function() log = log .. 'c' end}) error('e', 0) end) local ok, e = pcall(f) return ok, e, log"))
            .toEqual(["boolean:false", text("e"), text("c")]);
    });
});

describe("C API", () => {
    test("lua_toclose and lua_closeslot run the closer and nil the slot", () => {
        const L = lauxlib.luaL_newstate();
        try {
            lualib.luaL_openlibs(L);
            const source = to_luastring("closed = 0 return setmetatable({}, {__close = function() closed = closed + 1 end})");
            expect(lauxlib.luaL_loadstring(L, source)).toBe(lua.LUA_OK);
            expect(lua.lua_pcall(L, 0, 1, 0)).toBe(lua.LUA_OK);
            lua.lua_pushcfunction(L, L => {
                lua.lua_pushvalue(L, 1);
                lua.lua_toclose(L, 2);
                lua.lua_closeslot(L, 2);
                expect(lua.lua_isnil(L, 2)).toBe(true);
                return 0;
            });
            lua.lua_pushvalue(L, 1);
            expect(lua.lua_pcall(L, 1, 0, 0)).toBe(lua.LUA_OK);
            lua.lua_getglobal(L, to_luastring("closed"));
            expect(lua.lua_tointeger(L, -1)).toBe(1);
        } finally {
            lua.lua_close(L);
        }
    });

    test("lua_closethread closes a suspended coroutine", () => {
        const L = lauxlib.luaL_newstate();
        try {
            lualib.luaL_openlibs(L);
            const source = to_luastring("closed = 0 return coroutine.create(function() local a <close> = setmetatable({}, {__close = function() closed = closed + 1 end}) coroutine.yield() end)");
            expect(lauxlib.luaL_loadstring(L, source)).toBe(lua.LUA_OK);
            expect(lua.lua_pcall(L, 0, 1, 0)).toBe(lua.LUA_OK);
            const co = lua.lua_tothread(L, -1);
            expect(lua.lua_resume(co, L, 0)).toBe(lua.LUA_YIELD);
            expect(lua.lua_closethread(co, L)).toBe(lua.LUA_OK);
            lua.lua_getglobal(L, to_luastring("closed"));
            expect(to_jsstring(lua.lua_tolstring(L, -1))).toBe("1");
        } finally {
            lua.lua_close(L);
        }
    });
});
