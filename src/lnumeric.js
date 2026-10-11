"use strict";

const { OpCodes, ISK, INDEXK } = require('./lopcodes.js');
const integer = require('./linteger.js');
const FALLBACK = Symbol('numeric compiler fallback');
const cache = new WeakMap();
const MIN_SAFE = Math.max(Number.MIN_SAFE_INTEGER, Number(integer.MIN));
const MAX_SAFE = Math.min(Number.MAX_SAFE_INTEGER, Number(integer.MAX));

function safe(value) {
    if (!Number.isSafeInteger(value) || value < MIN_SAFE || value > MAX_SAFE) throw FALLBACK;
    return value === 0 ? 0 : value;
}

/* Only pure bytecode is accepted: restarting in the VM after a guard fails
 * cannot repeat a host call, write a table or change an upvalue. */
function compileNumeric(proto) {
    if (cache.has(proto)) return cache.get(proto);
    let result;
    try {
        result = generate(proto);
    } catch (error) {
        if (error !== FALLBACK && !(error instanceof EvalError)) throw error;
        result = { fn: null, source: null, reason: error === FALLBACK ? 'Unsupported numeric bytecode' : 'Dynamic JavaScript compilation is unavailable' };
    }
    cache.set(proto, result);
    return result;
}

function generate(proto) {
    if (proto.is_vararg || proto.p.length || proto.code.length > 10000) throw FALLBACK;
    const value = index => `r${index}`;
    const type = index => `t${index}`;
    function constant(index) {
        const k = proto.k[index];
        if (!k || !k.ttisnumber() || typeof k.value !== 'number' || !Number.isFinite(k.value)) throw FALLBACK;
        if (k.ttisinteger()) safe(k.value);
        return { v: Object.is(k.value, -0) ? '-0' : String(k.value), t: String(k.ttisinteger()) };
    }
    function operand(index) {
        return ISK(index) ? constant(INDEXK(index)) : { v: value(index), t: type(index) };
    }
    function region(start, end, depth = 0) {
        if (depth > 100) throw FALLBACK;
        const lines = [];
        for (let pc = start; pc < end; pc++) {
            const i = proto.code[pc];
            const a = value(i.A), ta = type(i.A);
            const op = OpCodes[i.opcode];
            switch (op) {
                case 'MOVE':
                    lines.push(`${a}=${value(i.B)}; ${ta}=${type(i.B)};`);
                    break;
                case 'LOADK': {
                    const k = constant(i.Bx);
                    lines.push(`${a}=${k.v}; ${ta}=${k.t};`);
                    break;
                }
                case 'LOADNIL':
                    for (let r = i.A; r <= i.A + i.B; r++) lines.push(`${value(r)}=undefined; ${type(r)}=false;`);
                    break;
                case 'ADD': case 'SUB': case 'MUL': case 'DIV': case 'POW': {
                    const b = operand(i.B), c = operand(i.C);
                    const symbols = { ADD: '+', SUB: '-', MUL: '*', DIV: '/', POW: '**' };
                    lines.push(`numeric(${b.v}); numeric(${c.v});`);
                    // Capture operands before writing A (A can alias B or C).
                    lines.push(`v=(${b.v})${symbols[op]}(${c.v}); flag=${op === 'DIV' || op === 'POW' ? 'false' : `${b.t} && ${c.t}`};`);
                    lines.push(`${a}=flag ? safe(v) : v; ${ta}=flag;`);
                    break;
                }
                case 'UNM':
                    lines.push(`numeric(${value(i.B)}); v=-${value(i.B)}; flag=${type(i.B)}; ${a}=flag ? safe(v) : v; ${ta}=flag;`);
                    break;
                case 'FORPREP': {
                    const last = pc + 1 + i.sBx;
                    const loop = proto.code[last];
                    if (last <= pc || last >= end || OpCodes[loop.opcode] !== 'FORLOOP' || loop.A !== i.A || last + 1 + loop.sBx !== pc + 1) throw FALLBACK;
                    const limit = value(i.A + 1), step = value(i.A + 2), visible = value(i.A + 3);
                    lines.push(`if (!(${ta} && ${type(i.A + 1)} && ${type(i.A + 2)}) || ${step}===0) throw fallback;`);
                    lines.push(`safe(${a}); safe(${limit}); safe(${step});`);
                    // A separate JS counter preserves the hidden loop state even
                    // when Lua assigns to its visible iteration variable.
                    lines.push(`for (let j${pc}=${a}; ${step}>0 ? j${pc}<=${limit} : j${pc}>=${limit}; j${pc}=safe(j${pc}+${step})) {`);
                    lines.push(`${a}=j${pc}; ${visible}=j${pc}; ${type(i.A + 3)}=true;`);
                    lines.push(...region(pc + 1, last, depth + 1));
                    lines.push('}');
                    pc = last;
                    break;
                }
                case 'RETURN':
                    if (i.B === 0) throw FALLBACK;
                    lines.push(i.B === 1 ? 'return [undefined, false];' : `return [${a}, ${ta}];`);
                    break;
                default:
                    throw FALLBACK;
            }
        }
        return lines;
    }
    const declarations = [];
    for (let r = 0; r < proto.maxstacksize; r++) {
        declarations.push(`r${r}=${r < proto.numparams ? `args[${r}]` : 'undefined'}`, `t${r}=${r < proto.numparams ? `types[${r}]` : 'false'}`);
    }
    const source = `"use strict";\nreturn function(args, types) {\nlet ${declarations.join(',')}, v, flag;\n${region(0, proto.code.length).join('\n')}\n};`;
    const numeric = value => { if (typeof value !== 'number') throw FALLBACK; };
    const fn = new Function('safe', 'numeric', 'fallback', source)(safe, numeric, FALLBACK);
    return { fn, source, reason: null };
}

module.exports = { compileNumeric, FALLBACK, MIN_SAFE, MAX_SAFE };
