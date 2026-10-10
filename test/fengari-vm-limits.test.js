"use strict";

const { FengariVm, LuaError, LimitError } = require("../src/fengari-vm.js");

const limited = (limits, options = {}) => new FengariVm(undefined, undefined, { limits, ...options });

describe("FengariVm execution limits", () => {
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
        const vm = new FengariVm();
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

describe("FengariVm limits against hooks that are switched off", () => {
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
        const vm = new FengariVm();
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

    test("sandbox accepts a library list without base", () => {
        const vm = new FengariVm(undefined, undefined, { sandbox: true, libs: ["string"] });
        expect(vm.run("return string.rep('a', 3)")).toBe("aaa");
    });

    test("limits can be removed again, including the native interrupts", () => {
        const vm = limited({ instructions: 20000, allocation: 10 });
        vm.setLimits(null);
        expect(vm.run("return #string.rep('x', 100000)")).toBe(100000);
        expect(vm.state.l_G.interrupt).toBeNull();
    });
});
