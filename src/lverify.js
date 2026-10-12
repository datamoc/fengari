"use strict";

/*
** Structural check of a function prototype read from a binary chunk.
**
** Lua's own undump trusts binary chunks ("malformed binary chunks can crash the interpreter"). Here a
** forged chunk can also stall the VM inside a single instruction, which no count hook can interrupt,
** or raise JavaScript exceptions that cross the Lua engine. This check rejects the operands that
** would address a register, constant, upvalue, prototype or jump target that does not exist.
** It does not prove the chunk is semantically valid; it keeps every operand inside the frame.
** The check never runs on source code compiled by the parser.
*/

const { OpCodes, OpCodesI: OP, ISK, INDEXK } = require('./lopcodes.js');

/* Returns a description of the first problem found in `f` (not its children), or null. */
function verifyProto(f) {
    const code = f.code, n = code.length, ms = f.maxstacksize;
    const nk = f.k.length, nup = f.upvalues.length, np = f.p.length;
    if (n === 0 || code[n - 1].opcode !== OP.OP_RETURN) return "function does not end with a return";
    if (f.numparams > ms) return "more parameters than stack slots";
    const reg = x => x < ms;
    const rk = x => ISK(x) ? INDEXK(x) < nk : x < ms;
    const target = (pc, sBx) => pc + 1 + sBx >= 0 && pc + 1 + sBx < n;
    const next = (pc, op) => pc + 1 < n && code[pc + 1].opcode === op;
    for (let pc = 0; pc < n; pc++) {
        const i = code[pc], A = i.A, B = i.B, C = i.C;
        let ok;
        switch (i.opcode) {
            case OP.OP_MOVE: case OP.OP_UNM: case OP.OP_BNOT: case OP.OP_NOT: case OP.OP_LEN:
                ok = reg(A) && reg(B); break;
            case OP.OP_LOADK: ok = reg(A) && i.Bx < nk; break;
            case OP.OP_LOADKX: ok = reg(A) && next(pc, OP.OP_EXTRAARG) && code[pc + 1].Ax < nk; break;
            case OP.OP_LOADBOOL: ok = reg(A) && (C === 0 || pc + 2 < n); break;
            case OP.OP_LOADNIL: ok = reg(A) && A + B < ms; break;
            case OP.OP_GETUPVAL: case OP.OP_SETUPVAL: ok = reg(A) && B < nup; break;
            case OP.OP_GETTABUP: ok = reg(A) && B < nup && rk(C); break;
            case OP.OP_GETTABLE: ok = reg(A) && reg(B) && rk(C); break;
            case OP.OP_SETTABUP: ok = A < nup && rk(B) && rk(C); break;
            case OP.OP_SETTABLE: ok = reg(A) && rk(B) && rk(C); break;
            case OP.OP_NEWTABLE: case OP.OP_TBC: ok = reg(A); break;
            case OP.OP_SELF: ok = reg(A) && A + 1 < ms && reg(B) && rk(C); break;
            case OP.OP_ADD: case OP.OP_SUB: case OP.OP_MUL: case OP.OP_MOD: case OP.OP_POW: case OP.OP_DIV:
            case OP.OP_IDIV: case OP.OP_BAND: case OP.OP_BOR: case OP.OP_BXOR: case OP.OP_SHL: case OP.OP_SHR:
                ok = reg(A) && rk(B) && rk(C); break;
            case OP.OP_CONCAT: ok = reg(A) && reg(B) && reg(C) && B <= C; break;
            case OP.OP_JMP: ok = A <= ms && target(pc, i.sBx); break;
            case OP.OP_EQ: case OP.OP_LT: case OP.OP_LE: ok = rk(B) && rk(C) && next(pc, OP.OP_JMP); break;
            case OP.OP_TEST: ok = reg(A) && next(pc, OP.OP_JMP); break;
            case OP.OP_TESTSET: ok = reg(A) && reg(B) && next(pc, OP.OP_JMP); break;
            case OP.OP_CALL: ok = reg(A) && (B === 0 || A + B - 1 < ms) && (C <= 1 || A + C - 2 < ms); break;
            case OP.OP_TAILCALL: ok = reg(A) && (B === 0 || A + B - 1 < ms); break;
            case OP.OP_RETURN: ok = B === 0 ? reg(A) : B === 1 || A + B - 2 < ms; break;
            case OP.OP_FORLOOP: case OP.OP_FORPREP: ok = A + 3 < ms && target(pc, i.sBx); break;
            case OP.OP_TFORCALL: ok = A + 2 + C < ms && C >= 1 && next(pc, OP.OP_TFORLOOP); break;
            case OP.OP_TFORLOOP: ok = A + 1 < ms && target(pc, i.sBx); break;
            case OP.OP_SETLIST: ok = reg(A) && (B === 0 || A + B < ms) && (C !== 0 || next(pc, OP.OP_EXTRAARG)); break;
            case OP.OP_CLOSURE: ok = reg(A) && i.Bx < np; break;
            case OP.OP_VARARG: ok = f.is_vararg && reg(A) && (B <= 1 || A + B - 2 < ms); break;
            case OP.OP_EXTRAARG: ok = pc > 0 && (code[pc - 1].opcode === OP.OP_LOADKX || code[pc - 1].opcode === OP.OP_SETLIST); break;
            default: return `invalid opcode ${i.opcode} at instruction ${pc + 1}`;
        }
        if (!ok) return `invalid operand in ${OpCodes[i.opcode]} at instruction ${pc + 1}`;
    }
    return null;
}

/* Checks the upvalue descriptors of the children of `f`, once all of its fields are loaded. */
function verifyChildren(f) {
    for (const child of f.p) {
        for (const u of child.upvalues) {
            if (u.instack ? u.idx >= f.maxstacksize : u.idx >= f.upvalues.length) return "invalid upvalue descriptor";
        }
    }
    return null;
}

module.exports = { verifyProto, verifyChildren };
