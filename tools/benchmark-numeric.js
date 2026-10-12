"use strict";

const { performance } = require('node:perf_hooks');
const { PyroeisVm } = require('../src/pyroeis-vm.js');

const vm = new PyroeisVm();
vm.run('function sum(n) local s=0; for i=1,n do s=s+i end; return s end');
const compiled = vm.compile('sum');
if (!compiled.compiled) throw new Error(compiled.reason);
const size = 100000;
function javascript(n) {
    let sum = 0;
    for (let i = 1; i <= n; i++) sum += i;
    return sum;
}
function measure(fn) {
    for (let i = 0; i < 5; i++) fn(size);
    const samples = [];
    for (let sample = 0; sample < 5; sample++) {
        let calls = 0, result;
        const start = performance.now();
        do {
            result = fn(size);
            calls++;
        } while (performance.now() - start < 100);
        if (result !== javascript(size)) throw new Error('Checksum mismatch');
        samples.push((performance.now() - start) / calls);
    }
    return samples.sort((a, b) => a - b)[2];
}
const interpretedMs = measure(n => vm.call('sum', n));
const compiledMs = measure(compiled);
const javascriptMs = measure(javascript);
console.log(`Node ${process.version}; sum(1..${size}); median of 5 samples after warmup`);
console.table({
    'Lua interpreter': { milliseconds: interpretedMs },
    'Compiled Lua': { milliseconds: compiledMs },
    'JavaScript': { milliseconds: javascriptMs }
});
console.log(`Compiled Lua speedup: ${(interpretedMs / compiledMs).toFixed(1)}x; ${(compiledMs / javascriptMs).toFixed(1)}x native JavaScript time`);
compiled.release();
