"use strict";

const { FengariVm, LuaError, Yield } = require("../src/fengari-vm.js");

describe("FengariVm libraries", () => {
    test("default opens everything", () => {
        const vm = new FengariVm();
        expect(vm.run("return type(load) .. type(require) .. type(os)")).toBe("functionfunctiontable");
    });

    test("libs selects libraries", () => {
        const vm = new FengariVm(undefined, undefined, { libs: ["base", "string", "table", "coroutine"] });
        expect(vm.run("return type(require) .. type(os) .. type(string.rep)")).toBe("nilnilfunction");
    });

    test("remove drops globals", () => {
        const vm = new FengariVm(undefined, undefined, { remove: ["load", "dofile", "loadfile", "os.exit"] });
        expect(vm.run("return type(load) .. type(dofile) .. type(os.exit) .. type(os.time)")).toBe("nilnilnilfunction");
    });

    test("unknown library throws", () => {
        expect(() => new FengariVm(undefined, undefined, { libs: ["nope"] })).toThrow(/Unknown/);
    });
});

describe("FengariVm conversions", () => {
    test("arrays vs objects", () => {
        const vm = new FengariVm();
        expect(vm.run("return {1, 2, 3}")).toEqual([1, 2, 3]);
        expect(vm.run("return {a = 1, [1] = 2}")).toEqual({ a: 1, 1: 2 });
        expect(vm.run("return {}")).toEqual({});
    });

    test("functions come back as callable refs", () => {
        const vm = new FengariVm();
        const ref = vm.run("return function(a, b) return a + b end");
        expect(ref.type).toBe("function");
        expect(ref.call(2, 3)).toBe(5);
        vm.defineFunction("apply", (fn, x) => fn.call(x));
        expect(vm.run("return apply(function(x) return x * 2 end, 21)")).toBe(42);
        ref.release();
        expect(() => ref.call(1, 1)).toThrow();
    });

    test("JS functions can be pushed", () => {
        const vm = new FengariVm();
        vm.defineFunction("give", () => ({ f: (x) => x + 1 }));
        expect(vm.run("return give().f(1)")).toBe(2);
    });

    test("cyclic tables are preserved, cyclic JS throws", () => {
        const vm = new FengariVm();
        const t = vm.run("local t = {} t.self = t return t");
        expect(t.self).toBe(t);
        const cyc = {}; cyc.self = cyc;
        expect(() => vm.push(cyc)).toThrow(RangeError);
        vm.lua.lua_settop(vm.state, 0);
    });

    test("host function called from a coroutine sees the right stack", () => {
        const vm = new FengariVm();
        vm.defineFunction("echo", (v) => v);
        expect(vm.run("return coroutine.wrap(function() return echo({1, 2}) end)()")).toEqual([1, 2]);
    });
});

describe("FengariVm coroutines", () => {
    test("resume/yield from Lua with values both ways", () => {
        const vm = new FengariVm();
        vm.run("function gen(a) local b = coroutine.yield(a + 1) local c = coroutine.yield(b * 2) return 'end', c end");
        const co = vm.coroutine("gen");
        expect(co.status).toBe("suspended");
        expect(co.resume(1)).toEqual({ done: false, values: [2] });
        expect(co.resume(10)).toEqual({ done: false, values: [20] });
        expect(co.resume("z")).toEqual({ done: true, values: ["end", "z"] });
        expect(co.status).toBe("dead");
        expect(() => co.resume()).toThrow(/dead/);
    });

    test("host function yields and receives the answer on resume", () => {
        const vm = new FengariVm();
        const log = [];
        vm.defineFunction("ask", (question) => new Yield([question]));
        vm.defineFunction("log", (v) => { log.push(v); });
        const co = vm.coroutineFromSource("local ans = ask('name?') log(ans) local a, b = ask('x') return a .. b");
        expect(co.resume()).toEqual({ done: false, values: ["name?"] });
        expect(co.resume("bob")).toEqual({ done: false, values: ["x"] });
        expect(log).toEqual(["bob"]);
        expect(co.resume("a", "b")).toEqual({ done: true, values: ["ab"] });
    });

    test("yield outside a coroutine is a Lua error", () => {
        const vm = new FengariVm();
        vm.defineFunction("ask", () => new Yield([]));
        expect(() => vm.run("return ask()")).toThrow(LuaError);
    });

    test("errors carry a traceback and kill the coroutine", () => {
        const vm = new FengariVm();
        const co = vm.coroutineFromSource("error('boom')", "=co");
        let error;
        try { co.resume(); } catch (e) { error = e; }
        expect(error).toBeInstanceOf(LuaError);
        expect(error.message).toMatch(/boom/);
        expect(error.traceback).toMatch(/stack traceback/);
        expect(co.status).toBe("dead");
    });

    test("close runs pending <close> variables", () => {
        const vm = new FengariVm();
        vm.defineFunction("mark", () => { vm.closed = true; });
        const co = vm.coroutineFromSource("local x <close> = setmetatable({}, {__close = mark}) coroutine.yield(1)");
        expect(co.resume().done).toBe(false);
        co.close();
        expect(vm.closed).toBe(true);
        expect(co.status).toBe("dead");
    });

    test("bad target and syntax errors throw", () => {
        const vm = new FengariVm();
        expect(() => vm.coroutine("nothing.here")).toThrow(TypeError);
        expect(() => vm.coroutineFromSource("this is not lua")).toThrow(LuaError);
        expect(vm.lua.lua_gettop(vm.state)).toBe(0);
    });

    test("two coroutines interleave independently", () => {
        const vm = new FengariVm();
        vm.run("function counter() local i = 0 while true do i = i + 1 coroutine.yield(i) end end");
        const a = vm.coroutine("counter");
        const b = vm.coroutine("counter");
        a.resume(); a.resume();
        expect(a.resume().values).toEqual([3]);
        expect(b.resume().values).toEqual([1]);
    });
});

describe("FengariVm numbers and exports", () => {
    const { LuaFloat } = require("../src/fengari-vm.js");

    test("LuaFloat pushes a float", () => {
        const vm = new FengariVm();
        vm.defineFunction("f", () => new LuaFloat(5));
        vm.defineFunction("i", () => 5);
        expect(vm.run("return math.type(f()) .. math.type(i())")).toBe("floatinteger");
    });

    test("preserveFloats round-trips float-valued integers", () => {
        const vm = new FengariVm(undefined, undefined, { preserveFloats: true });
        const value = vm.run("return 5.0");
        expect(value).toBeInstanceOf(LuaFloat);
        expect(Number(value)).toBe(5);
        expect(vm.run("return 5")).toBe(5);
        expect(vm.run("return 1.5")).toBe(1.5);
        vm.defineFunction("id", (v) => v);
        expect(vm.run("return math.type(id(5.0))")).toBe("float");
    });

    test("default reads 5.0 as a plain number", () => {
        expect(new FengariVm().run("return 5.0")).toBe(5);
    });

    test("fengari entry point exposes the VM", () => {
        const fengari = require("../src/fengari.js");
        expect(fengari.FengariVm).toBe(FengariVm);
        expect(fengari.Coroutine).toBeDefined();
        expect(fengari.lua).toBeDefined();
    });
});

describe("FengariVm userdata and 64-bit integers", () => {
    const { Userdata, LuaRef } = require("../src/fengari-vm.js");

    test("full userdata is a LuaRef", () => {
        const vm = new FengariVm();
        const stdout = vm.run("return io.stdout");
        expect(stdout).toBeInstanceOf(LuaRef);
        expect(stdout.type).toBe("userdata");
        vm.defineFunction("same", (a) => a);
        vm.defineFunction("kind", (a) => a.type);
        expect(vm.run("return kind(io.stdout)")).toBe("userdata");
    });

    test("host values round-trip as light userdata", () => {
        const vm = new FengariVm();
        const unit = { id: 7 };
        vm.defineFunction("get_unit", () => new Userdata(unit));
        vm.defineFunction("unit_id", (u) => u.value.id);
        expect(vm.run("local u = get_unit() return type(u) .. unit_id(u)")).toBe("userdata7");
        expect(vm.run("return get_unit()").value).toBe(unit);
    });

    test("integers beyond 2^53 are BigInt and round-trip", () => {
        const vm = new FengariVm();
        expect(vm.run("return math.maxinteger")).toBe(9223372036854775807n);
        expect(vm.run("return 42")).toBe(42);
        vm.defineFunction("id", (v) => v);
        expect(vm.run("return id(math.maxinteger) == math.maxinteger")).toBe(true);
        expect(vm.run("return math.type(id(2^62 // 1 | 0))")).toBe("integer");
    });

    test("unsafe JS numbers are pushed as floats instead of throwing", () => {
        const vm = new FengariVm();
        vm.defineFunction("big", () => 1e300);
        expect(vm.run("return math.type(big())")).toBe("float");
    });

    test("print and error tables tolerate non-JSON values", () => {
        const vm = new FengariVm();
        vm.run("print(function() end, math.maxinteger, io.stdout, {f = print})");
        expect(vm.output[0]).toContain("<function>");
        expect(() => vm.run("error({f = print})")).toThrow(/error table/);
    });
});

test("runMulti and callMulti return every value", () => {
    const vm = new FengariVm();
    expect(vm.runMulti("return 1, 'a', {2}")).toEqual([1, "a", [2]]);
    expect(vm.runMulti("return")).toEqual([]);
    vm.run("function pair(a) return a, a * 2 end");
    expect(vm.callMulti("pair", 4)).toEqual([4, 8]);
    expect(vm.run("return 1, 2")).toBe(1);
    expect(vm.lua.lua_gettop(vm.state)).toBe(0);
});

describe("FengariVm binary strings and exotic keys", () => {
    test("non-UTF-8 strings are Uint8Array and round-trip", () => {
        const vm = new FengariVm();
        const bytes = vm.run("return string.char(255, 254, 97)");
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(Array.from(bytes)).toEqual([255, 254, 97]);
        vm.defineFunction("bytes", () => new Uint8Array([0, 200, 10]));
        expect(vm.run("local s = bytes() return #s .. ':' .. s:byte(2)")).toBe("3:200");
        expect(vm.run("return 'é\0x'")).toBe("é\u0000x");
    });

    test("valid UTF-8 and a leading BOM stay strings", () => {
        const vm = new FengariVm();
        expect(vm.run("return '\u{FEFF}ok'")).toBe("\uFEFFok");
    });

    test("boolean, float, function and binary keys become a Map", () => {
        const vm = new FengariVm();
        const map = vm.run("return {[true] = 1, [1.5] = 'x', a = 2}");
        expect(map).toBeInstanceOf(Map);
        expect(map.get(true)).toBe(1);
        expect(map.get(1.5)).toBe("x");
        expect(map.get("a")).toBe(2);
        const fnKeyed = vm.run("return {[print] = 1}");
        expect([...fnKeyed.keys()][0].type).toBe("function");
        expect(vm.run("return {[string.char(255)] = 1}")).toBeInstanceOf(Map);
    });

    test("a string key colliding with an integer key becomes a Map", () => {
        const vm = new FengariVm();
        const map = vm.run("return {[1] = 'i', ['1'] = 's'}");
        expect(map).toBeInstanceOf(Map);
        expect(map.get(1)).toBe("i");
        expect(map.get("1")).toBe("s");
    });

    test("Map pushes back with exact key types", () => {
        const vm = new FengariVm();
        vm.defineFunction("m", () => new Map([[true, "t"], [1.5, "f"], ["1", "s"], [1, "i"]]));
        expect(vm.run("local t = m() return t[true] .. t[1.5] .. t['1'] .. t[1]")).toBe("tfsi");
        vm.defineFunction("bad", () => new Map([[NaN, 1]]));
        expect(() => vm.run("return bad()")).toThrow(/NaN/);
    });

    test("round trip keeps booleans keys", () => {
        const vm = new FengariVm();
        vm.defineFunction("id", (v) => v);
        expect(vm.run("local t = id({[true] = 'y', [false] = 'n'}) return t[true] .. t[false]")).toBe("yn");
    });

    test("cyclic tables become arrays/maps without stale references", () => {
        const vm = new FengariVm();
        const arr = vm.run("local t = {} t[1] = t t[2] = 5 return t");
        expect(Array.isArray(arr)).toBe(true);
        expect(arr[0]).toBe(arr);
    });
});
