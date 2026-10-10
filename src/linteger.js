"use strict";

const { conf } = require("./luaconf-base.js");

const BITS = conf.LUA_INTEGER_BITS === undefined ? 64 : conf.LUA_INTEGER_BITS;
if (BITS !== 32 && BITS !== 64) throw new RangeError("LUA_INTEGER_BITS must be 32 or 64");
const MIN = -(1n << BigInt(BITS - 1));
const MAX = (1n << BigInt(BITS - 1)) - 1n;
const SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/* Small integers retain the historical Number host API. Wide integers are
 * BigInt; every path uses this canonical representation without rounding. */
function canonical(value) {
    return value >= -SAFE && value <= SAFE ? Number(value) : value;
}

function isInteger(value) {
    return (typeof value === "bigint" && value >= MIN && value <= MAX) ||
        (typeof value === "number" && Number.isSafeInteger(value) && value >= MIN && value <= MAX);
}

function wrap(value) {
    return canonical(BigInt.asIntN(BITS, BigInt(value)));
}

function fromFloat(value) {
    if (!Number.isInteger(value) || value < Number(MIN) || value >= -Number(MIN)) return false;
    return canonical(BigInt(value));
}

const add = (a, b) => wrap(BigInt(a) + BigInt(b));
const sub = (a, b) => wrap(BigInt(a) - BigInt(b));
const mul = (a, b) => wrap(BigInt(a) * BigInt(b));
const neg = a => wrap(-BigInt(a));
const band = (a, b) => wrap(BigInt(a) & BigInt(b));
const bor = (a, b) => wrap(BigInt(a) | BigInt(b));
const bxor = (a, b) => wrap(BigInt(a) ^ BigInt(b));
const bnot = a => wrap(~BigInt(a));
const unsigned = a => BigInt.asUintN(BITS, BigInt(a));

function div(a, b) {
    a = BigInt(a); b = BigInt(b);
    let quotient = a / b;
    if (a % b !== 0n && (a < 0n) !== (b < 0n)) quotient--;
    return wrap(quotient);
}

function mod(a, b) {
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
