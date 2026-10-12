"use strict";

const { conf } = require("./luaconf-base.js");

const BITS = conf.LUA_INTEGER_BITS === undefined ? 64 : conf.LUA_INTEGER_BITS;
if (BITS !== 32 && BITS !== 64) throw new RangeError("LUA_INTEGER_BITS must be 32 or 64");
const MIN = -(1n << BigInt(BITS - 1));
const MAX = (1n << BigInt(BITS - 1)) - 1n;
const SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/* Small integers retain the historical Number host API. Wide integers are
 * BigInt; every path uses this canonical representation without rounding.
 *
 * Most Lua integers are small, so every operation first tries plain Number
 * arithmetic and falls back to BigInt when a result leaves [LO, HI]. LO and HI
 * are the integers that are both exactly representable as a double and valid
 * in this build. A double operation whose exact result lies in that range is
 * exact, and rounding is monotonic, so an inexact result always lands outside
 * it and takes the BigInt path. Fast paths add 0 to results that could be -0. */
const LO = Math.max(Number(MIN), -Number.MAX_SAFE_INTEGER);
const HI = Math.min(Number(MAX), Number.MAX_SAFE_INTEGER);

function canonical(value) {
    return value >= -SAFE && value <= SAFE ? Number(value) : value;
}

function isInteger(value) {
    if (typeof value === "number") return value >= LO && value <= HI && Number.isInteger(value);
    return typeof value === "bigint" && value >= MIN && value <= MAX;
}

function wrap(value) {
    if (typeof value === "number" && value >= LO && value <= HI && Number.isInteger(value)) return value + 0;
    return canonical(BigInt.asIntN(BITS, BigInt(value)));
}

function fromFloat(value) {
    if (!Number.isInteger(value) || value < Number(MIN) || value >= -Number(MIN)) return false;
    if (value >= LO && value <= HI) return value + 0;
    return canonical(BigInt(value));
}

const isNum = (a, b) => typeof a === "number" && typeof b === "number";

function add(a, b) {
    if (isNum(a, b)) {
        const r = a + b;
        if (r >= LO && r <= HI) return r;
    }
    return wrap(BigInt(a) + BigInt(b));
}

function sub(a, b) {
    if (isNum(a, b)) {
        const r = a - b;
        if (r >= LO && r <= HI) return r;
    }
    return wrap(BigInt(a) - BigInt(b));
}

function mul(a, b) {
    if (isNum(a, b)) {
        const r = a * b;
        if (r >= LO && r <= HI) return r + 0;
    }
    return wrap(BigInt(a) * BigInt(b));
}

function neg(a) {
    if (typeof a === "number") {
        const r = 0 - a;
        if (r >= LO && r <= HI) return r;
    }
    return wrap(-BigInt(a));
}

/* JavaScript bitwise operators work on int32; for operands that fit, sign extension
 * makes the 32-bit result the same as the 64-bit (or 32-bit) two's complement one. */
const isInt32 = a => typeof a === "number" && (a | 0) === a;
const band = (a, b) => isInt32(a) && isInt32(b) ? a & b : wrap(BigInt(a) & BigInt(b));
const bor = (a, b) => isInt32(a) && isInt32(b) ? a | b : wrap(BigInt(a) | BigInt(b));
const bxor = (a, b) => isInt32(a) && isInt32(b) ? a ^ b : wrap(BigInt(a) ^ BigInt(b));
const bnot = a => isInt32(a) ? ~a : wrap(~BigInt(a));
const unsigned = a => BigInt.asUintN(BITS, BigInt(a));

function div(a, b) {
    if (isNum(a, b) && b !== 0) {
        /* the double quotient is within 2^-53 relative of the true one, and a non-integer
         * quotient is at least 1/|b| from an integer, so floor() is right for |a| < 2^53 */
        const q = Math.floor(a / b);
        if (q >= LO && q <= HI) return q + 0;
    }
    a = BigInt(a); b = BigInt(b);
    let quotient = a / b;
    if (a % b !== 0n && (a < 0n) !== (b < 0n)) quotient--;
    return wrap(quotient);
}

function mod(a, b) {
    if (isNum(a, b) && b !== 0) {
        let r = a % b;
        if (r !== 0 && (r < 0) !== (b < 0)) r += b;
        return r + 0;
    }
    a = BigInt(a); b = BigInt(b);
    let remainder = a % b;
    if (remainder !== 0n && (remainder < 0n) !== (b < 0n)) remainder += b;
    return canonical(remainder);
}

function shift(a, count) {
    count = BigInt(count);
    if (count >= BigInt(BITS) || count <= -BigInt(BITS)) return 0;
    return wrap(count < 0n ? unsigned(a) >> -count : unsigned(a) << count);
}

module.exports = { BITS, SIZE: BITS / 8, MIN, MAX, canonical, isInteger, wrap, fromFloat,
    add, sub, mul, neg, band, bor, bxor, bnot, unsigned, div, mod, shift };
