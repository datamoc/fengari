"use strict";

const integer = require("../src/linteger.js");

/* Reference: the same operations in plain BigInt, wrapped to the build's integer size. */
const wrapRef = v => integer.canonical(BigInt.asIntN(integer.BITS, v));
const floorDiv = (a, b) => { const q = a / b; return a % b !== 0n && (a < 0n) !== (b < 0n) ? q - 1n : q; };
const floorMod = (a, b) => { const r = a % b; return r !== 0n && (r < 0n) !== (b < 0n) ? r + b : r; };
const ops = {
    add: (a, b) => wrapRef(a + b),
    sub: (a, b) => wrapRef(a - b),
    mul: (a, b) => wrapRef(a * b),
    div: (a, b) => wrapRef(floorDiv(a, b)),
    mod: (a, b) => integer.canonical(floorMod(a, b)),
    band: (a, b) => wrapRef(a & b),
    bor: (a, b) => wrapRef(a | b),
    bxor: (a, b) => wrapRef(a ^ b)
};

const MAX = integer.MAX, MIN = integer.MIN;
const EDGES = [0n, 1n, -1n, 2n, -2n, 7n, -7n, 2n ** 31n - 1n, -(2n ** 31n), 2n ** 31n, 2n ** 53n - 1n, -(2n ** 53n - 1n),
    2n ** 53n, -(2n ** 53n), 2n ** 53n + 1n, 3037000499n, 3037000500n, MAX, MIN, MAX - 1n, MIN + 1n]
    .filter(v => v >= MIN && v <= MAX);

describe("linteger Number fast paths agree with BigInt", () => {
    for (const [name, ref] of Object.entries(ops)) {
        test(name, () => {
            for (const a of EDGES) for (const b of EDGES) {
                if ((name === "div" || name === "mod") && b === 0n) continue;
                const got = integer[name](integer.canonical(a), integer.canonical(b));
                expect(Object.is(got, ref(a, b))).toBe(true);  /* Object.is: a stray -0 fails */
            }
        });
    }

    test("neg and bnot", () => {
        for (const a of EDGES) {
            expect(Object.is(integer.neg(integer.canonical(a)), wrapRef(-a))).toBe(true);
            expect(Object.is(integer.bnot(integer.canonical(a)), wrapRef(~a))).toBe(true);
        }
    });

    test("never produces negative zero", () => {
        expect(Object.is(integer.mul(0, -5), 0)).toBe(true);
        expect(Object.is(integer.neg(0), 0)).toBe(true);
        expect(Object.is(integer.mod(-4, 2), 0)).toBe(true);
        expect(Object.is(integer.div(0, -5), 0)).toBe(true);
        expect(Object.is(integer.wrap(-0), 0)).toBe(true);
        expect(Object.is(integer.fromFloat(-0), 0)).toBe(true);
    });

    test("overflow wraps and division by zero still throws", () => {
        expect(integer.add(integer.canonical(MAX), 1)).toBe(integer.canonical(MIN));
        expect(integer.mul(integer.canonical(MAX), 2)).toBe(-2);
        expect(() => integer.div(1, 0)).toThrow(RangeError);
        expect(() => integer.mod(1, 0)).toThrow(RangeError);
    });
});
