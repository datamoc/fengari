"use strict";

const { PyroeisVm, LuaFloat, LimitError } = require('../src/pyroeis-vm.js');

function setup(source, options) {
    const vm = new PyroeisVm(undefined, undefined, options);
    vm.run(source);
    return { vm, fn: vm.compile('f') };
}

test('arithmetic compiles once and agrees with Lua for integers and floats', () => {
    const { vm, fn } = setup('function f(x,a,b) return a*x+b end');
    expect(fn.compiled).toBe(true);
    expect(fn.source).toContain('return function');
    for (const args of [[3, 4, 5], [1.5, -2.7, 0.25], [new LuaFloat(3), 4, 5], [Infinity, 2, 1], [NaN, 2, 1]]) {
        expect(fn(...args)).toEqual(vm.call('f', ...args));
    }
    expect(vm.compile('f').source).toBe(fn.source);
});

test('nested, descending, empty loops and visible index assignments agree', () => {
    const { vm, fn } = setup('function f(n,step) local s=0; for i=n,1,step do for j=1,3 do s=s+i*j end; i=99 end; return s end');
    expect(fn.compiled).toBe(true);
    for (const args of [[20, -1], [20, -3], [0, -1], [5, 1]]) expect(fn(...args)).toBe(vm.call('f', ...args));
});

test('overflow, wide integers and numeric strings fall back exactly', () => {
    const { vm, fn } = setup('function f(x) return x*x+x end');
    for (const x of [Number.MAX_SAFE_INTEGER, 9223372036854775807n, '12', new LuaFloat(5)]) {
        expect(fn(x)).toEqual(vm.call('f', x));
    }
});

test('float loop bounds and zero steps use interpreter semantics', () => {
    const { vm, fn } = setup('function f(n,step) local s=0; for i=1,n,step do s=s+i end; return s end');
    for (const args of [[4.5, 1], [4, 0.5], [new LuaFloat(4), new LuaFloat(1)]]) expect(fn(...args)).toBe(vm.call('f', ...args));
    expect(() => fn(4, 0)).toThrow(/step is zero/);
});

test('unsupported side effects execute once through the interpreter', () => {
    const { vm, fn } = setup('count=0; function f(x) count=count+1; return x+count end');
    expect(fn.compiled).toBe(false);
    expect(fn.reason).toMatch(/Unsupported/);
    expect(fn(3)).toBe(4);
    expect(vm.run('return count')).toBe(1);
});

test('missing and nonnumeric arguments preserve nil and errors', () => {
    const { vm, fn } = setup('function f(x) return x end');
    for (const x of [undefined, null, false, 'abc', { a: 1 }]) expect(fn(x)).toEqual(vm.call('f', x));
    const arithmetic = setup('function f(x) return x+1 end').fn;
    expect(() => arithmetic()).toThrow(/arithmetic/);
    expect(() => arithmetic({})).toThrow(/arithmetic/);
    expect(setup('function f() return end').fn()).toBe(null);
});

test('preserveFloats retains float results, including aliased arithmetic', () => {
    const { vm, fn } = setup('function f(x) x=x+1.0; x=-x; return x/2 end', { preserveFloats: true });
    expect(fn(3)).toEqual(new LuaFloat(-2));
    expect(fn(3)).toEqual(vm.call('f', 3));
});

test('integer zero loses its sign while floating zero preserves it', () => {
    const { vm, fn } = setup('function f(x) return -x end');
    for (const x of [0, -0, new LuaFloat(0), new LuaFloat(-0)]) expect(fn(x)).toBe(vm.call('f', x));
    const identity = setup('function f(x) return x end').fn;
    expect(identity(-0)).toBe(0);
});

test('limits enabled after compilation remain enforced', () => {
    const { vm, fn } = setup('function f(n) local s=0; for i=1,n do s=s+i end; return s end');
    vm.setLimits({ instructions: 1000 });
    expect(() => fn(100000)).toThrow(LimitError);
    vm.setLimits(null);
    expect(fn(10)).toBe(55);
});

test('debug hooks still run when invoking a compiled function', () => {
    const { vm, fn } = setup('function f(x) return x+1 end');
    vm.run('ticks=0; debug.sethook(function() ticks=ticks+1 end, "", 1)');
    fn(2);
    expect(vm.run('debug.sethook(); return ticks')).toBeGreaterThan(0);
});

test('compiled callable captures its function and can be released', () => {
    const { vm, fn } = setup('function f(x) return x+1 end');
    vm.run('function f(x) return x+100 end');
    expect(fn(2)).toBe(3);
    fn.release();
    expect(() => fn(2)).toThrow(/released/);
    expect(() => vm.compile('absent')).toThrow(TypeError);
    expect(vm.lua.lua_gettop(vm.state)).toBe(0);
});

test('LuaRefs, host functions and varargs are supported through fallback', () => {
    const vm = new PyroeisVm();
    const ref = vm.run('return function(x) return x^2 end');
    expect(vm.compile(ref)(3)).toBe(9);
    vm.defineFunction('host', x => x + 1);
    const host = vm.compile('host');
    expect(host.compiled).toBe(false);
    expect(host(2)).toBe(3);
    vm.run('function f(...) return ... end');
    const fn = vm.compile('f');
    expect(fn.compiled).toBe(false);
    expect(fn(7)).toBe(7);
});

test('environments blocking dynamic compilation retain interpreter fallback', () => {
    const vm = new PyroeisVm();
    vm.run('function f(x) return x+2 end');
    const original = global.Function;
    let fn;
    try {
        global.Function = function() { throw new EvalError('blocked by CSP'); };
        fn = vm.compile('f');
    } finally {
        global.Function = original;
    }
    expect(fn.compiled).toBe(false);
    expect(fn.reason).toMatch(/unavailable/);
    expect(fn(3)).toBe(5);
});
