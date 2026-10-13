"use strict";

const { PyroeisVm, LuaError, LimitError } = require("../src/pyroeis-vm.js");

const limited = (limits, options = {}) => new PyroeisVm(undefined, undefined, { limits, ...options });

describe('limits.coroutines caps the coroutines created by one call', () => {
    const create = n => `local t = {} for i = 1, ${n} do t[i] = coroutine.create(function() end) end return #t`;

    test('a script creating more coroutines than allowed gets an uncatchable LimitError', () => {
        const vm = limited({ coroutines: 100 }, { sandbox: true });
        expect(vm.run(create(100))).toBe(100);
        const run = () => vm.run('local ok = pcall(function() for i = 1, 1000 do coroutine.create(function() end) end end) return "survived"');
        expect(run).toThrow(LimitError);
        expect(vm.limitHit).toBe('coroutines');
    });

    test('coroutine.wrap counts too, and the budget is renewed by every top-level call', () => {
        const vm = limited({ coroutines: 10 });
        expect(() => vm.run('for i = 1, 11 do coroutine.wrap(function() end) end')).toThrow(LimitError);
        expect(vm.run(create(10))).toBe(10);
        expect(vm.run(create(10))).toBe(10);
    });

    test('the count is per call: a coroutine made by a callback of the host counts like the others', () => {
        const vm = limited({ coroutines: 3 });
        vm.defineFunction('spawn', () => { vm.coroutineFromSource('return 1'); return 0; });
        expect(vm.run('for i = 1, 3 do spawn() end return "ok"')).toBe('ok');
        expect(() => vm.run('for i = 1, 4 do spawn() end return "ok"')).toThrow(LimitError);
        expect(vm.limitHit).toBe('coroutines');
    });

    test('without limits.coroutines nothing is counted, and an invalid value is refused', () => {
        expect(limited({ instructions: 1e8 }).run(create(20000))).toBe(20000);
        expect(() => limited({ coroutines: 0 })).toThrow(RangeError);
    });

    test('removing the limits removes the callback', () => {
        const vm = limited({ coroutines: 1 });
        vm.setLimits(null);
        expect(vm.run(create(50))).toBe(50);
    });
});

describe('a limit overrun cannot be hidden by the script', () => {

    test('a coroutine created by Lua that exceeds the budget fails the host call even if Lua catches it', () => {
        const vm = new PyroeisVm(undefined, undefined, { limits: { instructions: 1000 } });
        const run = () => vm.run('local co = coroutine.create(function() while true do end end); local ok = coroutine.resume(co); return 42');
        expect(run).toThrow(LimitError);
        expect(vm.limitHit).toBe('instructions');
        expect(vm.run('return 1')).toBe(1);
        expect(vm.limitHit).toBeNull();
    });

    test('coroutine.wrap inside pcall is covered too, and so is vm.call', () => {
        const vm = new PyroeisVm(undefined, undefined, { limits: { instructions: 1000 } });
        expect(() => vm.run('local f = coroutine.wrap(function() while true do end end); local ok = pcall(f); return 43')).toThrow(LimitError);
        vm.run('function caught() local co = coroutine.create(function() while true do end end); coroutine.resume(co); return 44 end');
        expect(() => vm.call('caught')).toThrow(LimitError);
        expect(() => vm.callMulti('caught')).toThrow(LimitError);
    });

    test('a host coroutine whose Lua code catches an inner overrun fails resume', () => {
        const vm = new PyroeisVm(undefined, undefined, { limits: { instructions: 1000 } });
        const co = vm.coroutineFromSource('local inner = coroutine.create(function() while true do end end); coroutine.resume(inner); return 45');
        expect(() => co.resume()).toThrow(LimitError);
    });

    test('a removed limit leaves no stale overrun behind', () => {
        const vm = new PyroeisVm(undefined, undefined, { limits: { instructions: 1000 } });
        expect(() => vm.run('while true do end')).toThrow(LimitError);
        vm.setLimits(null);
        expect(vm.run('return 46')).toBe(46);
        expect(vm.limitHit).toBeNull();
    });

    test('Coroutine#close runs the pending __close handlers with a fresh budget', () => {
        const vm = new PyroeisVm(undefined, undefined, { limits: { instructions: 1000 } });
        const source = 'local x <close> = setmetatable({}, {__close = function() for i = 1, 10000 do end end}); coroutine.yield(1)';
        const co = vm.coroutineFromSource(source);
        co.resume();
        expect(() => co.close()).toThrow(LimitError);
        const quick = vm.coroutineFromSource('local x <close> = setmetatable({}, {__close = function() for i = 1, 100 do end end}); coroutine.yield(1)');
        quick.resume();
        expect(() => quick.close()).not.toThrow();
        expect(quick.status).toBe('dead');
    });
});

describe('looking up a global path runs under the limits', () => {
    const hostile = 'setmetatable(_G, {__index = function(_, key) while true do end end})';

    test('an endless __index on _G cannot hang call, callMulti, compile or coroutine', () => {
        const vm = new PyroeisVm(undefined, undefined, { limits: { instructions: 5000 } });
        vm.run('function present() return 1 end');
        vm.run(hostile);
        expect(() => vm.call('missing')).toThrow(LimitError);
        expect(() => vm.callMulti('missing')).toThrow(LimitError);
        expect(() => vm.compile('missing')).toThrow(LimitError);
        expect(() => vm.coroutine('missing')).toThrow(LimitError);
        expect(vm.call('present')).toBe(1);
    });

    test('a failing __index is a LuaError, not an unprotected raise, and leaves the stack clean', () => {
        const vm = new PyroeisVm();
        vm.run('setmetatable(_G, {__index = function(_, key) error("no global " .. key) end}); function present() return 1 end');
        const before = vm.lua.lua_gettop(vm.state);
        expect(() => vm.call('absent')).toThrow(/no global absent/);
        expect(() => vm.compile('absent')).toThrow(LuaError);
        expect(() => vm.coroutine('absent')).toThrow(LuaError);
        expect(vm.lua.lua_gettop(vm.state)).toBe(before);
        expect(vm.call('present')).toBe(1);
    });
});

describe("PyroeisVm execution limits", () => {
    test("an instruction budget stops an infinite loop", () => {
        const vm = limited({ instructions: 100000 });
        let error;
        try { vm.run("while true do end"); } catch (e) { error = e; }
        expect(error).toBeInstanceOf(LimitError);
        expect(error).toBeInstanceOf(LuaError);
        expect(error.limit).toBe("instructions");
        expect(error.message).toMatch(/instructions limit exceeded/);
    });

    test("a time budget stops an infinite loop", () => {
        const vm = limited({ timeMs: 50 });
        const start = Date.now();
        let error;
        try { vm.run("while true do end"); } catch (e) { error = e; }
        expect(error).toBeInstanceOf(LimitError);
        expect(error.limit).toBe("time");
        expect(Date.now() - start).toBeLessThan(2000);
    });

    test("the VM stays usable and the budget is renewed on each call", () => {
        const vm = limited({ instructions: 50000 });
        expect(() => vm.run("while true do end")).toThrow(LimitError);
        for (let i = 0; i < 5; i++) {
            expect(vm.run("local s = 0 for i = 1, 5000 do s = s + i end return s")).toBe(12502500);
        }
    });

    test("work under the limit is not disturbed", () => {
        const vm = limited({ instructions: 10000000, timeMs: 5000 });
        expect(vm.run("local t = {} for i = 1, 2000 do t[i] = i * 2 end return #t")).toBe(2000);
        vm.run("function f(x) return x + 1 end");
        expect(vm.call("f", 1)).toBe(2);
        expect(vm.callMulti("f", 1)).toEqual([2]);
    });

    test("pcall cannot be used to survive the limit", () => {
        const vm = limited({ instructions: 20000 });
        expect(() => vm.run("while true do pcall(function() while true do end end) end")).toThrow(LimitError);
        expect(() => vm.run(`
            local function nest(n)
              if n == 0 then while true do end end
              pcall(nest, n - 1)
              while true do end
            end
            nest(20)`)).toThrow(LimitError);
        expect(() => vm.run("while true do pcall(error, 'x') end")).toThrow(LimitError);
    });

    test("coroutines cannot be used to survive the limit", () => {
        const vm = limited({ instructions: 20000 });
        expect(() => vm.run("coroutine.wrap(function() while true do end end)()")).toThrow(LimitError);
        expect(() => vm.run(`
            while true do
              local co = coroutine.create(function() while true do end end)
              coroutine.resume(co)
            end`)).toThrow(LimitError);
        expect(() => vm.run("local co = coroutine.create(function() while true do end end) while true do coroutine.resume(co) end"))
            .toThrow(LimitError);
        expect(vm.run("return coroutine.wrap(function() coroutine.yield(1) end)()")).toBe(1);
    });

    test("host-driven coroutines are limited per resume", () => {
        const vm = limited({ instructions: 30000 });
        const co = vm.coroutineFromSource("coroutine.yield(1) while true do end");
        expect(co.resume()).toEqual({ done: false, values: [1] });
        expect(() => co.resume()).toThrow(LimitError);
        const again = vm.coroutineFromSource("local n = 0 for i = 1, 100 do n = n + coroutine.yield(i) end return n");
        let step = again.resume();
        while (!step.done) step = again.resume(1);
        expect(step.values).toEqual([100]);
    });

    test("threads put in strict mode are restored for the next call", () => {
        const vm = limited({ instructions: 20000 });
        vm.run("co = coroutine.create(function() while true do coroutine.yield() end end)");
        expect(() => vm.run("while true do coroutine.resume(co) end")).toThrow(LimitError);
        expect(vm.run("local s = 0 for i = 1, 3000 do s = s + 1 end return s")).toBe(3000);
        expect(vm.limitedThreads.size).toBe(0);
    });

    test("limits compose with the sandbox preset", () => {
        const vm = limited({ instructions: 20000 }, { sandbox: true });
        expect(() => vm.run("while true do end")).toThrow(LimitError);
        expect(vm.run("return load('return 6 * 7')()")).toBe(42);
    });

    test("setLimits changes or removes the limits and validates", () => {
        const vm = new PyroeisVm();
        vm.setLimits({ instructions: 20000 });
        expect(() => vm.run("while true do end")).toThrow(LimitError);
        vm.setLimits(null);
        expect(vm.run("local s = 0 for i = 1, 100000 do s = s + 1 end return s")).toBe(100000);
        expect(() => vm.setLimits({ instructions: 0 })).toThrow(RangeError);
        expect(() => vm.setLimits({ timeMs: -5 })).toThrow(RangeError);
        expect(() => vm.setLimits({})).toThrow(RangeError);
    });

    test("small budgets are honoured", () => {
        const vm = limited({ instructions: 50 });
        expect(() => vm.run("for i = 1, 100000 do end")).toThrow(LimitError);
    });
});

describe("PyroeisVm limits against hooks that are switched off", () => {
    test("an xpcall message handler cannot run unchecked", () => {
        const vm = limited({ instructions: 20000 });
        expect(() => vm.run("xpcall(function() while true do end end, function(e) while true do end end)")).toThrow(LimitError);
        expect(() => vm.run(`xpcall(function() while true do end end,
            function(e) pcall(function() while true do end end) while true do end end)`)).toThrow(LimitError);
    });

    test("metamethods, __close handlers and library callbacks are limited", () => {
        const vm = limited({ instructions: 20000 });
        for (const code of [
            "local t = setmetatable({}, {__index = function() while true do end end}) return t.x",
            "local x <close> = setmetatable({}, {__close = function() while true do end end}) while true do end",
            "table.sort({3, 2, 1}, function(a, b) while true do end end)",
            "return ('abc'):gsub('.', function() while true do end end)"
        ]) {
            expect(() => vm.run(code)).toThrow(LimitError);
        }
    });

    test("one long pattern match is interrupted", () => {
        const vm = limited({ instructions: 1000000, timeMs: 2000 });
        const start = Date.now();
        expect(() => vm.run("return (string.rep('a', 20000)):find('.-.-.-.-.-b')")).toThrow(LimitError);
        expect(Date.now() - start).toBeLessThan(5000);
        expect(vm.run("return (string.rep('a', 100)):find('a-b') == nil")).toBe(true);
    });

    test("pattern matching stays correct and fast without limits", () => {
        const vm = new PyroeisVm();
        expect(vm.run("return select(2, (string.rep('ab', 50000)):gsub('ab', 'x'))")).toBe(50000);
        expect(vm.run("return (string.rep('a', 100000) .. 'b'):find('a*b')")).toBe(1);
    });

    test("allocation caps refuse oversized strings and stay catchable", () => {
        const vm = limited({ instructions: 1000000, allocation: 100000 });
        expect(vm.run("local ok = pcall(string.rep, 'x', 2^27) return ok")).toBe(false);
        expect(vm.run("local ok, err = pcall(string.rep, 'x', 2^27) return err")).toBe("not enough memory");
        expect(vm.run("return #string.rep('x', 5000)")).toBe(5000);
    });

    test("doubling concatenation is refused by the allocation cap", () => {
        const vm = limited({ instructions: 1000000, allocation: 100000 });
        expect(() => vm.run("local s = 'x' for i = 1, 40 do s = s .. s end return #s")).toThrow(/not enough memory/);
        expect(vm.run("return #string.rep('x', 1000)")).toBe(1000);
    });

    test("a total allocation budget is a limit that pcall cannot survive", () => {
        const vm = limited({ totalAllocation: 100000 });
        let error;
        try { vm.run("while true do pcall(string.rep, 'x', 50000) end"); } catch (e) { error = e; }
        expect(error).toBeInstanceOf(LimitError);
        expect(error.limit).toBe("memory");
        expect(vm.run("return #string.rep('x', 1000)")).toBe(1000);
    });

    test("a huge table.move is interrupted", () => {
        const vm = limited({ instructions: 1000000, timeMs: 2000 });
        const start = Date.now();
        expect(() => vm.run("table.move({}, 1, 2^40, 2)")).toThrow(LimitError);
        expect(() => vm.run("table.move({}, 2^40, 1, 2)")).not.toThrow(LimitError);
        expect(Date.now() - start).toBeLessThan(5000);
        expect(vm.run("local t = table.move({1, 2, 3}, 1, 3, 2) return t[1] .. t[2] .. t[3] .. t[4]")).toBe("1123");
    });

    test("a quadratic plain-text search is interrupted", () => {
        const vm = limited({ instructions: 1000000, timeMs: 2000 });
        const start = Date.now();
        expect(() => vm.run("return (string.rep('a', 200000)):find(string.rep('a', 100000) .. 'b', 1, true)")).toThrow(LimitError);
        expect(Date.now() - start).toBeLessThan(5000);
    });

    test("plain and pattern searches keep their results", () => {
        const vm = new PyroeisVm();
        expect(vm.run("return (string.find('hello world', 'o w', 1, true))")).toBe(5);
        expect(vm.runMulti("return string.find('hello world', 'wor', 1, true)")).toEqual([7, 9]);
        expect(vm.runMulti("return string.find('hello', '', 3, true)")).toEqual([3, 2]);
        expect(vm.run("return string.find('hello', 'xyz', 1, true)")).toBeNull();
        expect(vm.runMulti("return string.find('a.b', '.', 1, true)")).toEqual([2, 2]);
        expect(vm.run("return (string.find('abcabc', 'bc', 3, true))")).toBe(5);
    });

    test("sandbox accepts a library list without base", () => {
        const vm = new PyroeisVm(undefined, undefined, { sandbox: true, libs: ["string"] });
        expect(vm.run("return string.rep('a', 3)")).toBe("aaa");
    });

    test("limits can be removed again, including the native interrupts", () => {
        const vm = limited({ instructions: 20000, allocation: 10 });
        vm.setLimits(null);
        expect(vm.run("return #string.rep('x', 100000)")).toBe(100000);
        expect(vm.state.l_G.interrupt).toBeNull();
    });
});
