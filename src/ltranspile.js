"use strict";

/*
 * Offline Lua -> JavaScript translator.
 *
 * Unlike lnumeric.js (a runtime JIT that guards every operation and falls
 * back to the VM), this module produces source code a developer can read,
 * edit and keep after leaving Lua behind. It never runs Lua: it lexes and
 * parses the source into an AST and prints idiomatic JavaScript. Whatever it
 * cannot translate faithfully is flagged with a `TODO(lua2js)` comment and
 * reported in `warnings`.
 *
 * Mapping choices (see README "Lua to JavaScript"):
 *  - nil is `undefined`; `if x` becomes `truthy(x)` unless x is known boolean
 *  - tables are inferred to be arrays (0-based, `t[i]` -> `t[i - 1]`) or
 *    objects from how they are built and used
 *  - functions returning several values return arrays, inferred per function
 *  - metatables, coroutines, goto (other than `continue`) and Lua patterns
 *    are not translated
 */

const KEYWORDS = new Set(['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while']);
const OPERATORS = ['...', '..', '==', '~=', '<=', '>=', '//', '::', '<<', '>>', '+', '-', '*', '/', '%', '^', '#', '&', '~', '|', '<', '>', '=', '(', ')', '{', '}', '[', ']', ';', ':', ',', '.'];

class LuaSyntaxError extends Error {
    constructor(message, line) {
        super(`line ${line}: ${message}`);
        this.name = 'LuaSyntaxError';
        this.line = line;
    }
}

/* ---------------------------------------------------------------- lexer */

function tokenize(src) {
    const tokens = [];
    const n = src.length;
    let i = 0, line = 1, comments = [];
    const fail = message => { throw new LuaSyntaxError(message, line); };
    const nameRe = /[A-Za-z_][A-Za-z0-9_]*/y;
    const numberRe = /0[xX][\da-fA-F]*(\.[\da-fA-F]*)?([pP][+-]?\d+)?|(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/y;

    function longLevel(pos) {
        if (src[pos] !== '[') return -1;
        let j = pos + 1, level = 0;
        while (src[j] === '=') { level++; j++; }
        return src[j] === '[' ? level : -1;
    }
    function readLong(level, what) {
        const start = i + level + 2;
        const close = `]${'='.repeat(level)}]`;
        const end = src.indexOf(close, start);
        if (end < 0) fail(`unfinished long ${what}`);
        let text = src.slice(start, end);
        i = end + close.length;
        line += (src.slice(start - level - 2, end + close.length).match(/\n/g) || []).length;
        if (text.startsWith('\r\n')) text = text.slice(2); else if (text.startsWith('\n')) text = text.slice(1);
        return text;
    }
    function readString(quote) {
        let out = '';
        i++;
        for (;;) {
            if (i >= n) fail('unfinished string');
            const c = src[i];
            if (c === quote) { i++; return out; }
            if (c === '\n') fail('unfinished string');
            if (c !== '\\') { out += c; i++; continue; }
            const e = src[++i];
            const simple = { a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\', '"': '"', '\'': '\'' };
            if (e in simple) { out += simple[e]; i++; } else if (e === '\n') { out += '\n'; line++; i++; } else if (e === 'x') {
                const hex = src.substr(i + 1, 2);
                if (!/^[\da-fA-F]{2}$/.test(hex)) fail('hexadecimal digit expected');
                out += String.fromCharCode(parseInt(hex, 16));
                i += 3;
            } else if (e === 'z') {
                i++;
                while (i < n && /\s/.test(src[i])) { if (src[i] === '\n') line++; i++; }
            } else if (e === 'u') {
                const m = /^\{([\da-fA-F]+)\}/.exec(src.slice(i + 1, i + 12));
                if (!m) fail('missing { in \\u{xxxx}');
                const cp = parseInt(m[1], 16);
                out += cp > 0x10FFFF ? '�' : String.fromCodePoint(cp);
                i += 1 + m[0].length;
            } else if (/\d/.test(e)) {
                const m = /^\d{1,3}/.exec(src.slice(i, i + 3));
                const code = parseInt(m[0], 10);
                if (code > 255) fail('decimal escape too large');
                out += String.fromCharCode(code);
                i += m[0].length;
            } else fail('invalid escape sequence');
        }
    }
    function hexFloat(raw) {
        const m = /^0[xX]([\da-fA-F]*)(?:\.([\da-fA-F]*))?(?:[pP]([+-]?\d+))?$/.exec(raw);
        const frac = m[2] || '';
        const mantissa = parseInt((m[1] + frac) || '0', 16);
        return mantissa * 2 ** (Number(m[3] || 0) - 4 * frac.length);
    }

    if (src.startsWith('#')) while (i < n && src[i] !== '\n') i++;
    while (i < n) {
        const c = src[i];
        if (c === '\n') { line++; i++; continue; }
        if (/\s/.test(c)) { i++; continue; }
        if (c === '-' && src[i + 1] === '-') {
            const startLine = line, level = longLevel(i + 2);
            if (level >= 0) {
                i += 2;
                comments.push({ text: readLong(level, 'comment'), long: true, line: startLine });
            } else {
                const end = src.indexOf('\n', i);
                const stop = end < 0 ? n : end;
                comments.push({ text: src.slice(i + 2, stop).replace(/\r$/, ''), long: false, line });
                i = stop;
            }
            continue;
        }
        const tokLine = line;
        const push = (t, v, extra) => { tokens.push({ t, v, line: tokLine, comments, ...extra }); comments = []; };
        nameRe.lastIndex = i;
        const nm = nameRe.exec(src);
        if (nm && nm.index === i) {
            i += nm[0].length;
            if (KEYWORDS.has(nm[0])) push(nm[0], nm[0]); else push('name', nm[0]);
            continue;
        }
        if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) {
            numberRe.lastIndex = i;
            const m = numberRe.exec(src);
            const raw = m[0];
            i += raw.length;
            if (/[A-Za-z_]/.test(src[i] || '')) fail(`malformed number near '${raw}${src[i]}'`);
            let value, isInt = false;
            if (/^0[xX]/.test(raw)) {
                if (/[.pP]/.test(raw)) value = hexFloat(raw);
                else { value = Number(BigInt.asIntN(64, BigInt(raw))); isInt = true; }
            } else if (/^\d+$/.test(raw) && BigInt(raw) <= 9223372036854775807n) {
                value = Number(raw);
                isInt = true;
            } else value = Number(raw);
            push('number', raw, { value, isInt });
            continue;
        }
        if (c === '"' || c === '\'') { push('string', null, { value: readString(c) }); continue; }
        if (c === '[') {
            const level = longLevel(i);
            if (level >= 0) { push('string', null, { value: readLong(level, 'string') }); continue; }
        }
        const op = OPERATORS.find(o => src.startsWith(o, i));
        if (!op) fail(`unexpected symbol near '${c}'`);
        i += op.length;
        push(op, op);
    }
    tokens.push({ t: 'eof', v: '<eof>', line, comments });
    return tokens;
}

/* --------------------------------------------------------------- parser */

const BINARY_PRIORITY = {
    'or': [1, 1], 'and': [2, 2],
    '<': [3, 3], '>': [3, 3], '<=': [3, 3], '>=': [3, 3], '~=': [3, 3], '==': [3, 3],
    '|': [4, 4], '~': [5, 5], '&': [6, 6], '<<': [7, 7], '>>': [7, 7],
    '..': [9, 8], '+': [10, 10], '-': [10, 10],
    '*': [11, 11], '/': [11, 11], '//': [11, 11], '%': [11, 11],
    '^': [14, 13]
};
const UNARY_PRIORITY = 12;
const BLOCK_END = new Set(['eof', 'end', 'else', 'elseif', 'until']);

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.p = 0;
    }
    get tok() { return this.tokens[this.p]; }
    fail(message) {
        const t = this.tok;
        throw new LuaSyntaxError(`${message} near '${t.t === 'string' ? t.value : t.v}'`, t.line);
    }
    accept(t) { return this.tok.t === t ? this.tokens[this.p++] : null; }
    expect(t, closing, openLine) {
        if (this.tok.t === t) return this.tokens[this.p++];
        if (closing && openLine !== this.tok.line) this.fail(`'${t}' expected (to close '${closing}' at line ${openLine})`);
        return this.fail(`'${t}' expected`);
    }
    name() { return this.expect('name').v; }

    chunk() {
        const body = this.block();
        if (this.tok.t !== 'eof') this.fail("'<eof>' expected");
        return { type: 'Chunk', body };
    }
    block() {
        const body = [];
        while (!BLOCK_END.has(this.tok.t)) {
            if (this.tok.t === 'return') {
                body.push(this.returnStat());
                break;
            }
            const s = this.statement();
            if (s) body.push(s);
        }
        return body;
    }
    returnStat() {
        const t = this.tokens[this.p++];
        const exprs = BLOCK_END.has(this.tok.t) || this.tok.t === ';' ? [] : this.exprList();
        this.accept(';');
        return { type: 'Return', exprs, line: t.line, comments: t.comments };
    }
    statement() {
        const t = this.tok, line = t.line;
        const node = this.statementBody(t);
        if (node) { node.line = line; node.comments = t.comments; }
        return node;
    }
    statementBody(t) {
        switch (t.t) {
            case ';': this.p++; return null;
            case 'if': return this.ifStat();
            case 'while': {
                this.p++;
                const cond = this.expr();
                this.expect('do');
                const body = this.block();
                this.expect('end', 'while', t.line);
                return { type: 'While', cond, body };
            }
            case 'do': {
                this.p++;
                const body = this.block();
                this.expect('end', 'do', t.line);
                return { type: 'Do', body };
            }
            case 'for': return this.forStat();
            case 'repeat': {
                this.p++;
                const body = this.block();
                this.expect('until', 'repeat', t.line);
                return { type: 'Repeat', body, cond: this.expr() };
            }
            case 'function': {
                this.p++;
                const base = this.name(), fields = [];
                let method = null;
                while (this.accept('.')) fields.push(this.name());
                if (this.accept(':')) method = this.name();
                const func = this.funcBody(t.line);
                if (method) func.params.unshift('self');
                return { type: 'FunctionStat', target: { base, fields, method }, func };
            }
            case 'local': return this.localStat();
            case 'name': {
                const declared = t.v === 'global' ? this.globalStat(t) : undefined;
                return declared === undefined ? this.exprStat() : declared;
            }
            case 'break': this.p++; return { type: 'Break' };
            case 'goto': this.p++; return { type: 'Goto', label: this.name() };
            case '::': {
                this.p++;
                const label = this.name();
                this.expect('::');
                return { type: 'Label', label };
            }
            default: return this.exprStat();
        }
    }
    /* Lua 5.5 `global` declarations. Returns undefined when `global` is a plain identifier. */
    globalStat(t) {
        const next = this.tokens[this.p + 1];
        if (!['function', '<', '*', 'name'].includes(next.t)) return undefined;
        this.p++;
        if (this.accept('function')) {
            const name = this.name();
            return { type: 'FunctionStat', target: { base: name, fields: [], method: null }, func: this.funcBody(t.line) };
        }
        const attrib = () => { if (this.accept('<')) { this.name(); this.expect('>'); } };
        attrib();
        if (this.accept('*')) return null;
        if (this.tok.t === 'name' && this.tok.v === 'none') { this.p++; return null; }
        const names = [];
        do {
            names.push({ type: 'Name', name: this.name(), line: t.line });
            attrib();
        } while (this.accept(','));
        return this.accept('=') ? { type: 'Assign', targets: names, exprs: this.exprList() } : null;
    }
    ifStat() {
        const start = this.tok.line;
        const clauses = [];
        let orelse = null;
        do {
            this.p++;
            const cond = this.expr();
            this.expect('then');
            clauses.push({ cond, body: this.block() });
        } while (this.tok.t === 'elseif');
        if (this.accept('else')) orelse = this.block();
        this.expect('end', 'if', start);
        return { type: 'If', clauses, orelse };
    }
    forStat() {
        const line = this.tok.line;
        this.p++;
        const first = this.name();
        if (this.accept('=')) {
            const start = this.expr();
            this.expect(',');
            const limit = this.expr();
            const step = this.accept(',') ? this.expr() : null;
            this.expect('do');
            const body = this.block();
            this.expect('end', 'for', line);
            return { type: 'NumFor', var: first, start, limit, step, body };
        }
        const names = [first];
        while (this.accept(',')) names.push(this.name());
        this.expect('in');
        const exprs = this.exprList();
        this.expect('do');
        const body = this.block();
        this.expect('end', 'for', line);
        return { type: 'GenFor', names, exprs, body };
    }
    localStat() {
        const line = this.tok.line;
        this.p++;
        if (this.accept('function')) {
            const name = this.name();
            return { type: 'LocalFunction', name, func: this.funcBody(line) };
        }
        const names = [], attribs = [];
        /* Lua 5.5 allows `local <const> a, b` as well as `local a <const>, b`. */
        let shared = null;
        if (this.accept('<')) {
            shared = this.name();
            this.expect('>');
        }
        do {
            names.push(this.name());
            if (shared) attribs.push(shared);
            else if (this.accept('<')) {
                const attrib = this.name();
                if (attrib !== 'const' && attrib !== 'close') this.fail(`unknown attribute '${attrib}'`);
                attribs.push(attrib);
                this.expect('>');
            } else attribs.push(null);
        } while (this.accept(','));
        const exprs = this.accept('=') ? this.exprList() : [];
        return { type: 'Local', names, attribs, exprs };
    }
    exprStat() {
        const e = this.suffixedExpr();
        if (this.tok.t === '=' || this.tok.t === ',') {
            const targets = [e];
            while (this.accept(',')) targets.push(this.suffixedExpr());
            this.expect('=');
            for (const t of targets) if (t.type !== 'Name' && t.type !== 'Index') this.fail('syntax error');
            return { type: 'Assign', targets, exprs: this.exprList() };
        }
        if (e.type !== 'Call' && e.type !== 'MethodCall') this.fail('syntax error');
        return { type: 'CallStat', call: e };
    }
    funcBody(line) {
        const params = [];
        let vararg = false, varargName = null;
        this.expect('(');
        if (this.tok.t !== ')') {
            do {
                if (this.accept('...')) {
                    vararg = true;
                    if (this.tok.t === 'name') varargName = this.name();
                    break;
                }
                params.push(this.name());
            } while (this.accept(','));
        }
        this.expect(')');
        const body = this.block();
        this.expect('end', 'function', line);
        return { type: 'Function', params, vararg, varargName, body, line };
    }
    exprList() {
        const list = [this.expr()];
        while (this.accept(',')) list.push(this.expr());
        return list;
    }
    expr(limit = 0) {
        let left;
        const t = this.tok;
        if (t.t === 'not' || t.t === '-' || t.t === '~' || t.t === '#') {
            this.p++;
            left = { type: 'Unary', op: t.t, e: this.expr(UNARY_PRIORITY), line: t.line };
        } else left = this.simpleExpr();
        for (;;) {
            const op = this.tok.t, pr = BINARY_PRIORITY[op];
            if (!pr || pr[0] <= limit) return left;
            const line = this.tok.line;
            this.p++;
            left = { type: 'Binary', op, l: left, r: this.expr(pr[1]), line };
        }
    }
    simpleExpr() {
        const t = this.tok;
        switch (t.t) {
            case 'number': this.p++; return { type: 'Number', raw: t.v, value: t.value, isInt: t.isInt };
            case 'string': this.p++; return { type: 'String', value: t.value };
            case 'nil': this.p++; return { type: 'Nil' };
            case 'true': this.p++; return { type: 'True' };
            case 'false': this.p++; return { type: 'False' };
            case '...': this.p++; return { type: 'Vararg' };
            case '{': return this.tableExpr();
            case 'function': this.p++; return this.funcBody(t.line);
            default: return this.suffixedExpr();
        }
    }
    primaryExpr() {
        const t = this.tok;
        if (t.t === 'name') { this.p++; return { type: 'Name', name: t.v, line: t.line }; }
        if (t.t === '(') {
            this.p++;
            const e = this.expr();
            this.expect(')', '(', t.line);
            return { type: 'Paren', e };
        }
        return this.fail('unexpected symbol');
    }
    suffixedExpr() {
        let e = this.primaryExpr();
        for (;;) {
            const t = this.tok;
            switch (t.t) {
                case '.': {
                    this.p++;
                    e = { type: 'Index', obj: e, key: { type: 'String', value: this.name() }, dot: true };
                    break;
                }
                case '[': {
                    this.p++;
                    const key = this.expr();
                    this.expect(']');
                    e = { type: 'Index', obj: e, key, dot: false };
                    break;
                }
                case ':': {
                    this.p++;
                    const name = this.name();
                    e = { type: 'MethodCall', obj: e, name, args: this.callArgs(), line: t.line };
                    break;
                }
                case '(': case 'string': case '{':
                    e = { type: 'Call', fn: e, args: this.callArgs(), line: t.line };
                    break;
                default: return e;
            }
        }
    }
    callArgs() {
        const t = this.tok;
        if (t.t === 'string') { this.p++; return [{ type: 'String', value: t.value }]; }
        if (t.t === '{') return [this.tableExpr()];
        this.expect('(');
        const args = this.tok.t === ')' ? [] : this.exprList();
        this.expect(')', '(', t.line);
        return args;
    }
    tableExpr() {
        const open = this.expect('{');
        const items = [];
        while (this.tok.t !== '}') {
            if (this.tok.t === '[') {
                this.p++;
                const key = this.expr();
                this.expect(']');
                this.expect('=');
                items.push({ type: 'Item', kind: 'keyed', key, value: this.expr() });
            } else if (this.tok.t === 'name' && this.tokens[this.p + 1].t === '=') {
                const key = this.tokens[this.p].v;
                this.p += 2;
                items.push({ type: 'Item', kind: 'named', key, value: this.expr() });
            } else items.push({ type: 'Item', kind: 'pos', value: this.expr() });
            if (!this.accept(',') && !this.accept(';')) break;
        }
        this.expect('}', '{', open.line);
        return { type: 'Table', items };
    }
}

function parse(source) {
    return new Parser(tokenize(source)).chunk();
}

/* ------------------------------------------------------------- analysis */

function walk(node, visit) {
    if (Array.isArray(node)) {
        for (const n of node) walk(n, visit);
        return;
    }
    if (!node || typeof node !== 'object') return;
    if (node.type && visit(node) === false) return;
    for (const key of Object.keys(node)) {
        if (key === 'comments') continue;
        const v = node[key];
        if (v && typeof v === 'object') walk(v, visit);
    }
}

function assignsName(nodes, name) {
    let found = false;
    walk(nodes, node => {
        if (node.type === 'Assign' && node.targets.some(t => t.type === 'Name' && t.name === name)) found = true;
        if (node.type === 'FunctionStat' && node.target.base === name && !node.target.fields.length && !node.target.method) found = true;
        return !found;
    });
    return found;
}

function isNamed(node, name) {
    return node && node.type === 'Name' && node.name === name;
}

/* Does `name` look like an array (numeric indexes, #, table.insert, ipairs)
 * rather than an object (string keys) in the statements that follow? */
function tableUsage(match, nodes) {
    const numericVars = new Set();
    walk(nodes, node => {
        if (node.type === 'NumFor') numericVars.add(node.var);
        if (node.type === 'GenFor' && node.exprs.length === 1 && node.exprs[0].type === 'Call' && isNamed(node.exprs[0].fn, 'ipairs')) numericVars.add(node.names[0]);
    });
    let array = false, object = false;
    const numeric = k => k.type === 'Number' || (k.type === 'Binary' && '+-*'.includes(k.op) && (k.l.type === 'Number' || k.r.type === 'Number' || numeric(k.l))) || (k.type === 'Unary' && k.op === '#') || (k.type === 'Name' && numericVars.has(k.name));
    walk(nodes, node => {
        if (node.type === 'Index' && match(node.obj)) {
            if (node.key.type === 'String') object = true; else if (numeric(node.key)) array = true;
        } else if (node.type === 'Unary' && node.op === '#' && match(node.e)) array = true;
        else if (node.type === 'Call' && node.args.length && match(node.args[0])) {
            const f = node.fn;
            if ((f.type === 'Index' && isNamed(f.obj, 'table') && f.key.type === 'String' && ['insert', 'remove', 'concat', 'sort', 'unpack'].includes(f.key.value)) || isNamed(f, 'ipairs')) array = true;
        }
        return true;
    });
    return array && !object ? 'array' : 'object';
}

/* True when every value stored into `name[...]` (and its constructor items)
 * is a boolean: reads are then true/false/undefined, which JavaScript already
 * treats like Lua in a condition, so no truthy() call is needed. */
function booleanElements(name, init, nodes) {
    const isBoolean = v => v.type === 'True' || v.type === 'False' || (v.type === 'Binary' && ['==', '~=', '<', '>', '<=', '>='].includes(v.op)) || (v.type === 'Unary' && v.op === 'not');
    const values = init && init.type === 'Table' ? init.items.map(i => i.value) : [];
    walk(nodes, node => {
        if (node.type === 'Assign') node.targets.forEach((t, i) => { if (t.type === 'Index' && isNamed(t.obj, name)) values.push(node.exprs[i] || { type: 'Nil' }); });
        return true;
    });
    return values.length > 0 && values.every(isBoolean);
}

/* ------------------------------------------------------ Lua patterns */

const PATTERN_CLASSES = { a: 'A-Za-z', d: '0-9', l: 'a-z', s: ' \\t\\n\\r\\f\\v', u: 'A-Z', w: 'A-Za-z0-9', x: 'A-Fa-f0-9', p: '!-\\/:-@\\[-`{-~', c: '\\x00-\\x1f\\x7f' };
const regexEscape = c => /[\\^$.*+?()[\]{}|/]/.test(c) ? `\\${c}` : c;
const setEscape = c => /[\\\][^-]/.test(c) ? `\\${c}` : c;

/* Converts a Lua pattern to the source of an equivalent RegExp, or null for
 * what has no equivalent (%b, %f, position captures, negated classes in sets). */
function luaPattern(pattern) {
    let out = '', i = 0, atom = false;
    if (pattern[0] === '^') { out = '^'; i = 1; }
    while (i < pattern.length) {
        const c = pattern[i], n = pattern[i + 1];
        if (c === '%') {
            if (n === undefined || n === 'b' || n === 'f') return null;
            if (/[1-9]/.test(n)) out += `\\${n}`;
            else if (/[A-Za-z]/.test(n) && PATTERN_CLASSES[n.toLowerCase()]) out += `[${n === n.toLowerCase() ? '' : '^'}${PATTERN_CLASSES[n.toLowerCase()]}]`;
            else out += regexEscape(n);
            i += 2; atom = true;
        } else if (c === '[') {
            let j = i + 1, set = '[';
            if (pattern[j] === '^') { set += '^'; j++; }
            for (let first = true; j < pattern.length && (pattern[j] !== ']' || first); first = false) {
                if (pattern[j] === '%') {
                    const m = pattern[j + 1];
                    if (m === undefined) return null;
                    if (/[A-Za-z]/.test(m) && PATTERN_CLASSES[m.toLowerCase()]) {
                        if (m !== m.toLowerCase()) return null;
                        set += PATTERN_CLASSES[m];
                    } else set += setEscape(m);
                    j += 2;
                } else set += setEscape(pattern[j++]);
            }
            if (j >= pattern.length) return null;
            out += `${set}]`;
            i = j + 1; atom = true;
        } else if (c === '(') {
            if (n === ')') return null;
            out += '('; i++; atom = false;
        } else if (c === ')') {
            out += ')'; i++; atom = true;
        } else if (c === '.') {
            out += '[\\s\\S]'; i++; atom = true;
        } else if ((c === '*' || c === '+' || c === '?') && atom) {
            out += c; i++; atom = false;
        } else if (c === '-' && atom) {
            out += '*?'; i++; atom = false;
        } else if (c === '$' && i === pattern.length - 1) {
            out += '$'; i++;
        } else {
            out += regexEscape(c); i++; atom = true;
        }
    }
    return out || '(?:)';
}

const luaReplacement = r => r.replace(/%(.)|\$/g, (m, c) => m === '$' ? '$$$$' : c === '%' ? '%' : c === '0' ? '$&' : /\d/.test(c) ? `$${c}` : m);

/* ----------------------------------------------------------- the emitter */

const PREC = { ASSIGN: 1, COND: 2, OR: 3, AND: 4, BOR: 5, BXOR: 6, BAND: 7, EQ: 8, REL: 9, SHIFT: 10, ADD: 11, MUL: 12, POW: 13, UNARY: 14, MEMBER: 17, PRIMARY: 20 };
const R = (c, p = PREC.PRIMARY, k = 'unknown', op) => ({ c, p, k, op });
const wrap = (r, min) => r.p < min ? `(${r.c})` : r.c;
const IDENT = /^[A-Za-z_$][\w$]*$/;
const ALWAYS_TRUE_KINDS = new Set(['number', 'string', 'array', 'object', 'function']);

const JS_RESERVED = ['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'await', 'async', 'arguments', 'eval', 'undefined', 'NaN', 'Infinity', 'Math', 'String', 'Number', 'Object', 'Array', 'Error', 'console', 'Date', 'performance', 'JSON', 'Symbol', 'Map', 'Set', 'Promise', 'globalThis', 'require', 'module', 'exports', 'process', 'args'];

const HELPERS = {
    truthy: 'function truthy(value) {\n    return value !== undefined && value !== false;\n}',
    and: 'function and(value, rest) {\n    return truthy(value) ? rest() : value;\n}',
    mod: 'function mod(a, b) {\n    const r = a % b;\n    return r !== 0 && (r < 0) !== (b < 0) ? r + b : r;\n}',
    sub: 'function sub(s, i, j = -1) {\n    const n = s.length;\n    if (i < 0) i = Math.max(n + i + 1, 1); else if (i === 0) i = 1;\n    if (j < 0) j = n + j + 1; else if (j > n) j = n;\n    return i > j ? "" : s.slice(i - 1, j);\n}',
    tonumber: 'function tonumber(value, base) {\n    if (typeof value === "number") return value;\n    if (typeof value !== "string") return undefined;\n    const text = value.trim();\n    if (base !== undefined) {\n        const n = parseInt(text, base);\n        return Number.isNaN(n) ? undefined : n;\n    }\n    return text === "" || Number.isNaN(Number(text)) ? undefined : Number(text);\n}',
    type: 'function type(value) {\n    if (value === undefined || value === null) return "nil";\n    return typeof value === "object" ? "table" : typeof value;\n}',
    assert: 'function assert(value, message) {\n    if (!truthy(value)) throw new Error(message === undefined ? "assertion failed!" : message);\n    return value;\n}',
    pcall: 'function pcall(fn, ...args) {\n    try {\n        return [true, fn(...args)];\n    } catch (error) {\n        return [false, error instanceof Error ? error.message : error];\n    }\n}',
    error: 'function error(message) {\n    throw typeof message === "string" ? new Error(message) : message;\n}',
    find: 'function find(s, regex, init = 1) {\n    const re = new RegExp(regex.source, "g");\n    re.lastIndex = init < 0 ? Math.max(s.length + init, 0) : init - 1;\n    const m = re.exec(s);\n    return m ? [m.index + 1, m.index + m[0].length, ...m.slice(1)] : undefined;\n}',
    match: 'function match(s, regex, init = 1) {\n    const re = new RegExp(regex.source, "g");\n    re.lastIndex = init < 0 ? Math.max(s.length + init, 0) : init - 1;\n    const m = re.exec(s);\n    return m ? (m.length > 1 ? m.slice(1) : [m[0]]) : undefined;\n}',
    gmatch: 'function gmatch(s, regex) {\n    const re = new RegExp(regex.source, "g");\n    return () => {\n        const m = re.exec(s);\n        if (!m) return undefined;\n        if (m[0] === "") re.lastIndex++;\n        return m.length > 1 ? m.slice(1) : [m[0]];\n    };\n}',
    gsub: 'function gsub(s, regex, replacement) {\n    const re = new RegExp(regex.source, "g");\n    let count = 0;\n    if (typeof replacement !== "function") {\n        count = (s.match(re) || []).length;\n        return [s.replace(re, replacement), count];\n    }\n    const groups = new RegExp(re.source + "|").exec("").length - 1;\n    const result = s.replace(re, (...m) => {\n        count++;\n        const value = replacement(...(groups ? m.slice(1, 1 + groups) : [m[0]]));\n        return value === undefined || value === false ? m[0] : String(value);\n    });\n    return [result, count];\n}',
    comparator: 'function comparator(lessThan) {\n    return (a, b) => truthy(lessThan(a, b)) ? -1 : truthy(lessThan(b, a)) ? 1 : 0;\n}',
    format: `function format(template, ...values) {
    let index = 0;
    return template.replace(/%([-+ #0]*)(\\d+)?(?:\\.(\\d+))?([a-zA-Z%])/g, (match, flags, width, precision, spec) => {
        if (spec === "%") return "%";
        const value = values[index++];
        const digits = precision === undefined ? undefined : Number(precision);
        let text;
        switch (spec) {
            case "d": case "i": text = String(Math.trunc(Number(value))); break;
            case "f": case "F": text = Number(value).toFixed(digits === undefined ? 6 : digits); break;
            case "e": case "E": text = Number(value).toExponential(digits === undefined ? 6 : digits).replace(/e([+-])(\\d)$/, "e$10$2"); break;
            case "g": case "G": text = String(Number(Number(value).toPrecision(digits || 6))); break;
            case "x": text = Math.trunc(Number(value)).toString(16); break;
            case "X": text = Math.trunc(Number(value)).toString(16).toUpperCase(); break;
            case "o": text = Math.trunc(Number(value)).toString(8); break;
            case "c": text = String.fromCharCode(value); break;
            case "s": text = value === undefined ? "nil" : String(value); if (digits !== undefined) text = text.slice(0, digits); break;
            case "q": text = JSON.stringify(value); break;
            default: throw new Error(\`invalid conversion '\${match}' to 'format'\`);
        }
        if ("dieEfFgG".includes(spec) && Number(value) >= 0) {
            if (flags.includes("+")) text = "+" + text; else if (flags.includes(" ")) text = " " + text;
        }
        if (spec === "E" || spec === "G") text = text.toUpperCase();
        if (width !== undefined && text.length < Number(width)) {
            const pad = Number(width) - text.length;
            if (flags.includes("-")) text += " ".repeat(pad);
            else if (flags.includes("0") && "dieEfFgGxXo".includes(spec)) text = text.replace(/^([+\\- ]?)/, "$1" + "0".repeat(pad));
            else text = " ".repeat(pad) + text;
        }
        return text;
    });
}`
};
const HELPER_DEPS = { assert: ['truthy'], and: ['truthy'], comparator: ['truthy'] };
const HELPER_ORDER = Object.keys(HELPERS);

const MATH_FUNCTIONS = ['floor', 'ceil', 'abs', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'exp'];
const STRING_METHODS = new Set(['upper', 'lower', 'len', 'rep', 'sub', 'reverse', 'format', 'byte', 'find', 'match', 'gmatch', 'gsub']);
const PATTERN_METHODS = new Set(['find', 'match', 'gmatch', 'gsub']);
const MULTI_PATTERN = new Set(['find', 'match', 'gsub']);
/* Globals the translator replaces; every other global is emitted as-is. */
const LIB_ROOTS = new Set(['print', 'tostring', 'tonumber', 'type', 'assert', 'pcall', 'error', 'select', 'ipairs', 'pairs', 'math', 'string', 'table', 'os', 'io', 'require', 'unpack']);

const UNSUPPORTED = new Set(['select', 'ipairs', 'pairs', 'setmetatable', 'getmetatable', 'rawget', 'rawset', 'rawequal', 'rawlen', 'next', 'load', 'loadstring', 'dofile', 'loadfile', 'collectgarbage', 'coroutine', 'utf8', 'debug']);

class Gen {
    constructor(info, ast) {
        this.info = info;
        this.ast = ast;
        this.scopes = [];
        this.fn = null;
        this.loops = [];
        this.helpers = new Set();
        this.warnings = [];
        this.todo = [];
        this.line = 0;
        this.counter = 0;
    }

    /* ---- diagnostics and helpers ---- */
    warn(message) {
        if (!this.todo.includes(message)) this.todo.push(message);
        if (!this.warnings.some(w => w.line === this.line && w.message === message)) this.warnings.push({ line: this.line, message });
    }
    use(name) {
        this.helpers.add(name);
        for (const dep of HELPER_DEPS[name] || []) this.use(dep);
        return name;
    }

    /* ---- scopes ---- */
    pushScope() { this.scopes.push({ vars: new Map(), names: new Set() }); }
    popScope() { this.scopes.pop(); }
    lookup(name) {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            const entry = this.scopes[i].vars.get(name);
            if (entry) return entry;
        }
        return null;
    }
    taken(js) {
        return JS_RESERVED.includes(js) || HELPERS[js] !== undefined || this.info.globals.has(js) || this.scopes.some(s => s.names.has(js));
    }
    /* Allocates a JS identifier that cannot capture or shadow another one in
     * scope (`local x = x` becomes `x2 = x`). */
    declare(key, props = {}) {
        const base = props.base || key;
        let js = base, n = 1;
        while (this.taken(js)) js = `${base}${++n}`;
        const entry = { js, kind: 'unknown', ...props };
        const scope = this.scopes[this.scopes.length - 1];
        scope.vars.set(key, entry);
        scope.names.add(js);
        return entry;
    }
    isGlobal(node) {
        return node.type === 'Name' && !this.lookup(node.name);
    }
    /* Dotted path of a name/index chain ("math.floor"), or null. */
    pathOf(node) {
        if (node.type === 'Name') return node.name;
        if (node.type === 'Index' && node.key.type === 'String') {
            const base = this.pathOf(node.obj);
            return base && `${base}.${node.key.value}`;
        }
        return null;
    }
    libPath(node) {
        let root = node;
        while (root.type === 'Index') root = root.obj;
        return this.isGlobal(root) && LIB_ROOTS.has(root.name) ? this.pathOf(node) : null;
    }

    /* ---- statements ---- */
    chunk(ast) {
        this.pushScope();
        const lines = this.stmts(ast.body);
        this.popScope();
        return lines;
    }
    block(list) {
        this.pushScope();
        const lines = this.stmts(list);
        this.popScope();
        return lines;
    }
    stmts(list) {
        const lines = [];
        list.forEach((s, i) => lines.push(...this.stmt(s, list, i)));
        return lines;
    }
    stmt(s, list, i) {
        const savedTodo = this.todo, savedLine = this.line;
        this.todo = [];
        this.line = s.line;
        const out = this.stmtBody(s, list.slice(i + 1));
        const lead = [];
        for (const c of s.comments || []) lead.push(...this.comment(c));
        for (const m of this.todo) lead.push(`// TODO(lua2js): ${m}`);
        this.todo = savedTodo;
        this.line = savedLine;
        return [...lead, ...out];
    }
    comment(c) {
        if (c.long) return [`/*${c.text.replace(/\*\//g, '* /')}*/`];
        return [`//${c.text}`];
    }
    indent(lines) {
        return lines.map(l => l ? `    ${l}` : l);
    }
    put(text) {
        return text.split('\n');
    }
    stmtBody(s, rest) {
        switch (s.type) {
            case 'Local': return this.localStat(s, rest);
            case 'LocalFunction': return this.localFunction(s);
            case 'Assign': return this.assign(s);
            case 'CallStat': return this.callStat(s.call);
            case 'Do': return ['{', ...this.indent(this.block(s.body)), '}'];
            case 'While': {
                const cond = this.cond(s.cond).c;
                const loop = this.loopBody(s.body);
                return this.loopLines(loop, `while (${cond}) {`);
            }
            case 'Repeat': return this.repeatStat(s);
            case 'If': return this.ifStat(s);
            case 'NumFor': return this.numFor(s);
            case 'GenFor': return this.genFor(s);
            case 'FunctionStat': return this.functionStat(s);
            case 'Return': return this.returnStat(s);
            case 'Break': return ['break;'];
            case 'Goto': return this.gotoStat(s);
            case 'Label':
                this.warn(`label '${s.label}' is not translated (only a trailing "::label::" used with goto as continue is)`);
                return [`// ::${s.label}::`];
            default: throw new Error(`Unsupported statement ${s.type}`);
        }
    }

    loopBody(body, allowContinue = true) {
        const last = body[body.length - 1];
        const label = allowContinue && last && last.type === 'Label' ? last.label : null;
        const entry = { label, jsLabel: null };
        this.loops.push(entry);
        const lines = this.block(label ? body.slice(0, -1) : body);
        this.loops.pop();
        return { lines, entry };
    }
    loopLines(loop, header) {
        if (loop.entry.jsLabel) header = `${loop.entry.jsLabel}: ${header}`;
        return [header, ...this.indent(loop.lines), '}'];
    }
    gotoStat(s) {
        for (let i = this.loops.length - 1; i >= 0; i--) {
            const entry = this.loops[i];
            if (entry.label !== s.label) continue;
            if (i === this.loops.length - 1) return ['continue;'];
            entry.jsLabel = entry.jsLabel || `loop${++this.counter}`;
            return [`continue ${entry.jsLabel};`];
        }
        this.warn(`goto '${s.label}' is not supported (only "goto continue" with a trailing label in a loop is)`);
        return [`// goto ${s.label}`];
    }

    repeatStat(s) {
        /* The condition may use the body's locals, so it is tested inside the
         * loop with a break rather than in a do/while. */
        const entry = { label: null, jsLabel: null };
        this.loops.push(entry);
        this.pushScope();
        const lines = this.stmts(s.body);
        const cond = this.cond(s.cond).c;
        this.popScope();
        this.loops.pop();
        lines.push(`if (${cond}) break;`);
        return this.loopLines({ lines, entry }, 'while (true) {');
    }
    ifStat(s) {
        const lines = [];
        s.clauses.forEach((clause, index) => {
            const cond = this.cond(clause.cond).c;
            const body = this.indent(this.block(clause.body));
            lines.push(`${index ? '} else if' : 'if'} (${cond}) {`, ...body);
        });
        if (s.orelse) lines.push('} else {', ...this.indent(this.block(s.orelse)));
        lines.push('}');
        return lines;
    }

    localStat(s, rest) {
        const exprs = s.exprs;
        const n = s.names.length;
        const last = exprs[exprs.length - 1];
        /* Right-hand sides are generated before the names exist, so that
         * `local x = x` still refers to the outer x. */
        let values;
        let destructure = null;
        if (last && exprs.length < n && this.isMulti(last)) {
            destructure = exprs.length === 1 ? this.rawMulti(last) : `[${[...exprs.slice(0, -1).map(e => this.expr(e).c), this.spread(last)].join(', ')}]`;
        } else values = exprs.map(e => this.expr(e));
        const isConst = [];
        const entries = s.names.map((name, index) => {
            const attrib = s.attribs[index];
            if (attrib === 'close') this.warn('<close> variables are not translated; call the closer manually');
            const value = values && exprs[index];
            let kind = values && values[index] ? values[index].k : 'unknown';
            if (kind === 'nil') kind = 'unknown';
            if (values && value && value.type === 'Table' && value.items.length === 0 && s.names.length === exprs.length) {
                kind = tableUsage(n => isNamed(n, name), rest) === 'array' ? 'array' : 'object';
                values[index] = R(kind === 'array' ? '[]' : '{}', PREC.PRIMARY, kind);
            }
            if (value && value.type === 'Function' && values) this.info.multi.set(name, this.functionMulti(value));
            isConst[index] = attrib === 'const' || !assignsName(rest, name);
            const elements = value && value.type === 'Table' && booleanElements(name, value, rest) ? 'flag' : null;
            return { name, kind, elements };
        });
        const declared = entries.map(e => this.declare(e.name, { kind: e.kind, elements: e.elements }));
        if (destructure) {
            return this.put(`${isConst.every(Boolean) ? 'const' : 'let'} [${declared.map(d => d.js).join(', ')}] = ${destructure};`);
        }
        const lines = [];
        /* One declaration per name so const/let can differ. */
        declared.forEach((d, index) => {
            const keyword = isConst[index] && values[index] ? 'const' : 'let';
            const value = values[index];
            lines.push(...this.put(value ? `${keyword} ${d.js} = ${value.c};` : `let ${d.js};`));
        });
        for (let index = n; index < exprs.length; index++) {
            this.warn('extra expression in local statement is evaluated and discarded');
            lines.push(`${this.expr(exprs[index]).c};`);
        }
        return lines;
    }
    localFunction(s) {
        this.info.multi.set(s.name, this.functionMulti(s.func));
        const entry = this.declare(s.name, { kind: 'function' });
        return this.functionDeclaration(entry.js, s.func);
    }
    functionDeclaration(name, func) {
        const { params, lines } = this.funcBody(func);
        return this.put(`function ${name}(${params.join(', ')}) {\n${this.indent(lines).join('\n')}${lines.length ? '\n' : ''}}`);
    }
    functionStat(s) {
        const { base, fields, method } = s.target;
        const path = [base, ...fields, ...(method ? [method] : [])].join('.');
        this.info.multi.set(path, this.functionMulti(s.func));
        if (!fields.length && !method) {
            const local = this.lookup(base);
            if (local) return this.put(`${local.js} = ${this.funcExpr(s.func).c};`);
            this.info.globals.add(base);
            this.info.functions.add(base);
            return this.functionDeclaration(base, s.func);
        }
        let target = this.nameExpr(base);
        for (const f of [...fields, ...(method ? [method] : [])]) target = R(`${wrap(target, PREC.MEMBER)}${IDENT.test(f) ? `.${f}` : `[${JSON.stringify(f)}]`}`, PREC.MEMBER);
        return this.put(`${target.c} = ${this.funcExpr(s.func, true).c};`);
    }
    returnStat(s) {
        const exprs = s.exprs;
        if (!this.fn) {
            this.warn('top-level return is not translated');
            return [`// return ${exprs.length}`];
        }
        if (this.fn.multi) {
            if (!exprs.length) return ['return [];'];
            if (exprs.length === 1 && this.isMulti(exprs[0])) return this.put(`return ${this.rawMulti(exprs[0])};`);
            return this.put(`return [${this.exprList(exprs).join(', ')}];`);
        }
        return this.put(exprs.length ? `return ${this.expr(exprs[0]).c};` : 'return;');
    }

    assign(s) {
        const { targets, exprs } = s;
        if (targets.length === 1 && exprs.length === 1) {
            const t = targets[0], v = exprs[0];
            if (v.type === 'Nil' && t.type === 'Index') {
                if (t.key.type === 'String') return [`delete ${this.target(t)};`];
                /* t[#t] = nil removes the last element */
                if (t.key.type === 'Unary' && t.key.op === '#' && this.expr(t.key.e).c === this.expr(t.obj).c) return [`${wrap(this.expr(t.obj), PREC.MEMBER)}.pop();`];
                this.warn('assigning nil leaves undefined in the array (Lua would make a hole); use splice() to remove');
            }
            if (v.type === 'Function' && t.type === 'Name') this.info.multi.set(t.name, this.functionMulti(v));
            const tcode = this.target(t);
            const value = t.type === 'Index' && t.key.type === 'String' && v.type === 'Table' && !v.items.length ? this.emptyTable(t.key.value) : this.expr(v);
            if (t.type === 'Name') {
                const entry = this.lookup(t.name);
                if (entry) entry.kind = entry.kind === value.k ? value.k : 'unknown';
                const compound = v.type === 'Binary' && isNamed(v.l, t.name) && (('+-*'.includes(v.op) && v.op.length === 1) || (v.op === '..' && entry && entry.kind === 'string'));
                if (compound) {
                    const operand = this.expr(v.r);
                    return this.put(`${tcode} ${v.op === '..' ? '+' : v.op}= ${wrap(operand, PREC.ASSIGN)};`);
                }
            }
            return this.put(`${tcode} = ${wrap(value, PREC.ASSIGN)};`);
        }
        const tcodes = targets.map(t => this.target(t));
        for (const t of targets) {
            const entry = t.type === 'Name' && this.lookup(t.name);
            if (entry) entry.kind = 'unknown';
        }
        const last = exprs[exprs.length - 1];
        let source;
        if (exprs.length === 1 && this.isMulti(last)) source = this.rawMulti(last);
        else if (this.isMulti(last) && exprs.length < targets.length) source = `[${[...exprs.slice(0, -1).map(e => this.expr(e).c), this.spread(last)].join(', ')}]`;
        else source = `[${exprs.map(e => this.expr(e).c).join(', ')}]`;
        return this.put(`[${tcodes.join(', ')}] = ${source};`);
    }
    target(t) {
        if (t.type === 'Name') {
            const entry = this.lookup(t.name);
            if (entry) return entry.js;
            this.info.globals.add(t.name);
            this.info.assigned.add(t.name);
            return t.name;
        }
        return this.indexExpr(t).c;
    }
    callStat(call) {
        if (call.type === 'Call' && this.isGlobal(call.fn) && call.fn.name === 'error') {
            const arg = call.args.length ? this.expr(call.args[0]) : R('undefined');
            if (arg.k === 'string') return this.put(`throw new Error(${arg.c});`);
            this.use('error');
        }
        const code = this.callExpr(call, false).c;
        return this.put(/^(\{|function)/.test(code) ? `(${code});` : `${code};`);
    }

    numFor(s) {
        const start = this.expr(s.start), limit = this.expr(s.limit);
        let step = 1;
        if (s.step) {
            if (s.step.type === 'Number') step = s.step.value;
            else if (s.step.type === 'Unary' && s.step.op === '-' && s.step.e.type === 'Number') step = -s.step.e.value;
            else step = null;
        }
        const stepCode = step === null ? this.expr(s.step) : null;
        this.pushScope();
        const entry = this.declare(s.var, { kind: 'number' });
        const i = entry.js;
        if (assignsName(s.body, s.var)) this.warn(`loop variable '${s.var}' is assigned in the body; in Lua that only changes a copy`);
        const inits = [`${i} = ${start.c}`];
        let limitCode = limit.c;
        if (!(s.limit.type === 'Number' || (s.limit.type === 'Name' && !assignsName(s.body, s.limit.name)))) {
            limitCode = this.declare(`%limit${this.counter++}`, { base: 'limit' }).js;
            inits.push(`${limitCode} = ${limit.c}`);
        }
        let test, update;
        if (step === null) {
            const stepName = this.declare(`%step${this.counter++}`, { base: 'step' }).js;
            inits.push(`${stepName} = ${stepCode.c}`);
            test = `${stepName} > 0 ? ${i} <= ${limitCode} : ${i} >= ${limitCode}`;
            update = `${i} += ${stepName}`;
        } else {
            test = `${i} ${step > 0 ? '<=' : '>='} ${limitCode}`;
            update = step === 1 ? `${i}++` : step === -1 ? `${i}--` : step > 0 ? `${i} += ${step}` : `${i} -= ${-step}`;
        }
        const loop = this.loopBody(s.body);
        this.popScope();
        return this.loopLines(loop, `for (let ${inits.join(', ')}; ${test}; ${update}) {`);
    }

    genFor(s) {
        const first = s.exprs[0];
        const callee = s.exprs.length === 1 && first.type === 'Call' && first.args.length === 1 && this.isGlobal(first.fn) ? first.fn.name : null;
        if (callee === 'ipairs' || callee === 'pairs') {
            const list = this.expr(first.args[0]);
            if (callee === 'ipairs' || list.k === 'array') return this.ipairsLoop(s, first.args[0], list);
            return this.pairsLoop(s, list);
        }
        return this.iteratorLoop(s);
    }
    ipairsLoop(s, listNode, list) {
        this.pushScope();
        const simple = listNode.type === 'Name';
        const idx = this.declare(s.names[0], { kind: 'number' });
        const inits = [`${idx.js} = 1`];
        let listCode = list.c;
        if (!simple) {
            listCode = this.declare(`%list${this.counter++}`, { base: 'list' }).js;
            inits.push(`${listCode} = ${list.c}`);
        }
        const lines = [];
        if (s.names[1] && s.names[1] !== '_') {
            const v = this.declare(s.names[1]);
            lines.push(`${assignsName(s.body, s.names[1]) ? 'let' : 'const'} ${v.js} = ${listCode}[${idx.js} - 1];`);
        }
        const loop = this.loopBody(s.body);
        loop.lines.unshift(...lines);
        this.popScope();
        return this.loopLines(loop, `for (let ${inits.join(', ')}; ${idx.js} <= ${listCode}.length; ${idx.js}++) {`);
    }
    pairsLoop(s, list) {
        if (list.k !== 'object') this.warn('pairs() becomes Object.entries(): keys are strings and array indexes are 0-based');
        this.pushScope();
        const names = s.names.slice(0, 2).map(n => this.declare(n).js);
        const mutable = s.names.some(n => assignsName(s.body, n));
        const loop = this.loopBody(s.body);
        this.popScope();
        const head = names.length === 1 ? `${names[0]} of Object.keys(${list.c})` : `[${names.join(', ')}] of Object.entries(${list.c})`;
        return this.loopLines(loop, `for (${mutable ? 'let' : 'const'} ${head}) {`);
    }
    iteratorLoop(s) {
        this.warn('generic for: the iterator must return an array of values (or a single value)');
        const first = s.exprs[0];
        const codes = s.exprs.map(e => wrap(this.expr(e), PREC.ASSIGN));
        const gmatch = (first.type === 'MethodCall' && first.name === 'gmatch') || (first.type === 'Call' && this.libPath(first.fn) === 'string.gmatch');
        const multi = gmatch || (first.type === 'Call' && this.isMulti(first));
        this.pushScope();
        const iterate = this.declare('%iterate', { base: 'iterate' }).js;
        const state = codes.length > 1 ? this.declare('%state', { base: 'state' }).js : null;
        const names = s.names.map(n => this.declare(n).js);
        const pattern = names.length > 1 || multi ? `[${names.join(', ')}]` : names[0];
        const loop = this.loopBody(s.body);
        this.popScope();
        const decl = state ? `const ${iterate} = ${codes[0]}, ${state} = ${codes[1]};` : `const ${iterate} = ${codes[0]};`;
        const call = control => state ? `${iterate}(${state}, ${control})` : `${iterate}()`;
        const orEmpty = text => pattern === names[0] ? text : `${text} ?? []`;
        const header = `for (let ${pattern} = ${orEmpty(call(codes[2] || 'undefined'))}; ${names[0]} !== undefined; ${pattern} = ${orEmpty(call(names[0]))}) {`;
        return ['{', ...this.indent([decl, ...this.loopLines(loop, header)]), '}'];
    }

    /* ---- functions ---- */
    functionMulti(func) {
        let multi = false;
        const visit = node => {
            if (node.type === 'Function') return node === func;
            if (node.type === 'Return') {
                if (node.exprs.length > 1 || (node.exprs.length === 1 && this.isMulti(node.exprs[0]))) multi = true;
            }
            return !multi;
        };
        walk(func, visit);
        return multi;
    }
    restParameter(func, params) {
        if (!func.vararg) return;
        if (func.varargName) {
            this.warn(`named vararg '${func.varargName}': it is a plain array here, so '${func.varargName}.n' becomes '${func.varargName}.length'`);
            this.fn.args = this.declare(func.varargName, { kind: 'array' }).js;
        }
        params.push(`...${this.fn.args}`);
    }
    funcBody(func) {
        const saved = { fn: this.fn, loops: this.loops };
        this.fn = { vararg: func.vararg, multi: this.functionMulti(func), args: 'args' };
        this.loops = [];
        this.pushScope();
        const params = func.params.map(p => this.declare(p).js);
        this.restParameter(func, params);
        const lines = this.stmts(func.body);
        const last = func.body[func.body.length - 1];
        if (this.fn.multi && !(last && last.type === 'Return')) lines.push('return [];');
        this.popScope();
        Object.assign(this, saved);
        return { params, lines };
    }
    funcExpr(func, forceFunction = false) {
        const only = func.body.length === 1 && func.body[0].type === 'Return' && func.body[0].exprs.length === 1 && !func.body[0].comments.length;
        if (only && !forceFunction && !this.functionMulti(func)) {
            const saved = { fn: this.fn, loops: this.loops };
            this.fn = { vararg: func.vararg, multi: false, args: 'args' };
            this.loops = [];
            this.pushScope();
            const params = func.params.map(p => this.declare(p).js);
            this.restParameter(func, params);
            const body = this.expr(func.body[0].exprs[0]);
            this.popScope();
            Object.assign(this, saved);
            const code = body.c.startsWith('{') ? `(${body.c})` : body.c;
            return R(`(${params.join(', ')}) => ${code}`, PREC.ASSIGN, 'function');
        }
        const { params, lines } = this.funcBody(func);
        const inner = lines.length ? `\n${this.indent(lines).join('\n')}\n` : '';
        return R(`function (${params.join(', ')}) {${inner}}`, PREC.ASSIGN, 'function');
    }

    /* ---- multiple values ---- */
    isMulti(e) {
        if (e.type === 'Vararg') return true;
        if (e.type === 'Call') {
            const lib = this.libPath(e.fn);
            if (lib === 'table.unpack' || lib === 'unpack' || lib === 'pcall') return true;
            if (lib === 'select') return !(e.args[0] && e.args[0].type === 'String');
            if (lib && lib.startsWith('string.')) return MULTI_PATTERN.has(lib.slice(7));
            if (lib) return false;
            const path = this.pathOf(e.fn);
            return !!path && this.info.multi.get(path) === true;
        }
        if (e.type === 'MethodCall') {
            if (MULTI_PATTERN.has(e.name) && this.expr(e.obj).k !== 'object') return true;
            const base = this.pathOf(e.obj);
            return !!base && this.info.multi.get(`${base}.${e.name}`) === true;
        }
        return false;
    }
    /* JS expression evaluating to the array of all values of a multi expression. */
    rawMulti(e) {
        if (e.type === 'Vararg') return this.varargs();
        if (e.type === 'Call') {
            const lib = this.libPath(e.fn);
            if (lib === 'table.unpack' || lib === 'unpack') return wrap(this.expr(e.args[0]), PREC.ASSIGN);
            if (lib === 'select') {
                const n = this.expr(e.args[0]);
                return `${this.varargs()}.slice(${e.args[0].type === 'Number' ? e.args[0].value - 1 : `${wrap(n, PREC.ADD)} - 1`})`;
            }
        }
        return this.callExpr(e, true).c;
    }
    spread(e) {
        return `...${wrap(R(this.rawMulti(e), PREC.ASSIGN), PREC.COND)}`;
    }
    varargs() {
        if (this.fn && this.fn.vararg) return this.fn.args;
        this.warn('"..." outside a vararg function');
        return '[]';
    }
    exprList(exprs) {
        return exprs.map((e, i) => i === exprs.length - 1 && this.isMulti(e) ? this.spread(e) : wrap(this.expr(e), PREC.ASSIGN));
    }

    /* ---- expressions ---- */
    expr(e) {
        switch (e.type) {
            case 'Nil': return R('undefined', PREC.PRIMARY, 'nil');
            case 'True': return R('true', PREC.PRIMARY, 'boolean');
            case 'False': return R('false', PREC.PRIMARY, 'boolean');
            case 'Number': return this.numberExpr(e);
            case 'String': return R(JSON.stringify(e.value), PREC.PRIMARY, 'string');
            case 'Vararg': return R(this.fn && this.fn.vararg ? `${this.fn.args}[0]` : (this.varargs(), 'undefined'), PREC.MEMBER);
            case 'Function': return this.funcExpr(e);
            case 'Name': return this.nameExpr(e.name);
            case 'Index': return this.indexExpr(e);
            case 'Call': case 'MethodCall': return this.callExpr(e, false);
            case 'Binary': return this.binary(e);
            case 'Unary': return this.unary(e);
            case 'Table': return this.tableExpr(e);
            case 'Paren': return this.expr(e.e);
            default: throw new Error(`Unsupported expression ${e.type}`);
        }
    }
    numberExpr(e) {
        if (!Number.isFinite(e.value)) return R('Infinity', PREC.PRIMARY, 'number');
        if (e.isInt && !Number.isSafeInteger(e.value)) this.warn(`integer ${e.raw} does not fit in a JS number; use BigInt`);
        return R(String(e.value), PREC.PRIMARY, 'number');
    }
    nameExpr(name) {
        const entry = this.lookup(name);
        if (entry) return { ...R(entry.js, PREC.PRIMARY, entry.kind), elements: entry.elements };
        switch (name) {
            case 'print': return R('console.log', PREC.MEMBER, 'function');
            case 'tostring': return R('String', PREC.PRIMARY, 'function');
            case 'tonumber': case 'type': case 'assert': case 'pcall': case 'error': return R(this.use(name), PREC.PRIMARY, 'function');
            default:
                this.info.globals.add(name);
                this.info.read.add(name);
                if (UNSUPPORTED.has(name)) this.warn(`global '${name}' has no direct JavaScript equivalent`);
                return R(name);
        }
    }
    isSimple(node) {
        return node.type === 'Name' || (node.type === 'Index' && this.isSimple(node.obj) && (node.key.type === 'String' || node.key.type === 'Number' || node.key.type === 'Name'));
    }
    indexExpr(e) {
        const lib = this.libPath(e);
        if (lib) {
            const constant = { 'math.pi': 'Math.PI', 'math.huge': 'Infinity', 'math.maxinteger': 'Number.MAX_SAFE_INTEGER', 'math.mininteger': 'Number.MIN_SAFE_INTEGER' }[lib];
            if (constant) {
                if (lib.endsWith('integer')) this.warn('Lua 64-bit integer limits are replaced by the safe-integer limits');
                return R(constant, PREC.MEMBER, 'number');
            }
            const [lib0, fn] = lib.split('.');
            if (lib0 === 'math' && MATH_FUNCTIONS.includes(fn)) return R(`Math.${fn}`, PREC.MEMBER, 'function');
        }
        const obj = this.expr(e.obj);
        const o = wrap(obj, PREC.MEMBER);
        if (e.key.type === 'String') {
            return R(IDENT.test(e.key.value) ? `${o}.${e.key.value}` : `${o}[${JSON.stringify(e.key.value)}]`, PREC.MEMBER);
        }
        const key = this.expr(e.key);
        const kind = obj.elements || 'unknown';
        if (key.k === 'number' || obj.k === 'array') return R(`${o}[${this.adjust(e.key, key)}]`, PREC.MEMBER, kind);
        if (key.k !== 'string' && obj.k !== 'object') this.warn('table index of unknown type: Lua arrays are 1-based; use [key - 1] if it is an array index');
        return R(`${o}[${key.c}]`, PREC.MEMBER, kind);
    }
    /* 1-based Lua index -> 0-based JS index, folding "+ n" and literals. */
    adjust(node, r) {
        if (node.type === 'Number' && Number.isInteger(node.value)) return String(node.value - 1);
        if (node.type === 'Binary' && (node.op === '+' || node.op === '-') && node.r.type === 'Number' && Number.isInteger(node.r.value)) {
            const left = this.expr(node.l);
            const delta = node.op === '+' ? node.r.value - 1 : -node.r.value - 1;
            if (delta === 0) return left.c;
            return `${wrap(left, PREC.ADD)} ${delta > 0 ? '+' : '-'} ${Math.abs(delta)}`;
        }
        return `${wrap(r, PREC.ADD)} - 1`;
    }

    unary(e) {
        switch (e.op) {
            case '-': {
                if (e.e.type === 'Number') {
                    const negated = String(-e.e.value);
                    return R(negated, negated.startsWith('-') ? PREC.UNARY : PREC.PRIMARY, 'number');
                }
                const r = this.expr(e.e);
                const code = wrap(r, PREC.UNARY);
                return R(`-${code.startsWith('-') ? `(${code})` : code}`, PREC.UNARY, 'number');
            }
            case 'not': return R(`!${wrap(this.cond(e.e), PREC.UNARY)}`, PREC.UNARY, 'boolean');
            case '#': {
                const r = this.expr(e.e);
                if (r.k === 'object') this.warn('# on an object has no JavaScript equivalent');
                return R(`${wrap(r, PREC.MEMBER)}.length`, PREC.MEMBER, 'number');
            }
            default: {
                this.warn('bitwise operators work on 32-bit integers in JavaScript');
                return R(`~${wrap(this.expr(e.e), PREC.UNARY)}`, PREC.UNARY, 'number');
            }
        }
    }
    binary(e) {
        const op = e.op;
        if (op === 'and' || op === 'or') return this.logical(e);
        if (op === '..') return this.concat(e);
        if (op === '==' || op === '~=') {
            const [l, r] = [e.l, e.r];
            const mod = l.type === 'Binary' && l.op === '%' && r.type === 'Number' && r.value === 0 ? l : null;
            const sym = op === '==' ? '===' : '!==';
            if (mod) return R(`${wrap(this.expr(mod.l), PREC.MUL)} % ${wrap(this.expr(mod.r), PREC.MUL + 1)} ${sym} 0`, PREC.EQ, 'boolean');
            return R(`${wrap(this.expr(l), PREC.EQ)} ${sym} ${wrap(this.expr(r), PREC.EQ + 1)}`, PREC.EQ, 'boolean');
        }
        const left = this.expr(e.l), right = this.expr(e.r);
        const infix = (js, p, lmin = p, rmin = p + 1, kind = 'number') => R(`${wrap(left, lmin)} ${js} ${wrap(right, rmin)}`, p, kind);
        switch (op) {
            case '+': case '-': return infix(op, PREC.ADD);
            case '*': case '/': return infix(op, PREC.MUL);
            case '^': return infix('**', PREC.POW, PREC.POW + 2, PREC.POW);
            case '<': case '>': case '<=': case '>=': return infix(op, PREC.REL, PREC.REL, PREC.REL + 1, 'boolean');
            case '//': return R(`Math.floor(${wrap(left, PREC.MUL)} / ${wrap(right, PREC.MUL + 1)})`, PREC.MEMBER, 'number');
            case '%': return R(`${this.use('mod')}(${wrap(left, PREC.ASSIGN)}, ${wrap(right, PREC.ASSIGN)})`, PREC.MEMBER, 'number');
            default: {
                this.warn('bitwise operators work on 32-bit integers in JavaScript');
                const js = { '&': ['&', PREC.BAND], '|': ['|', PREC.BOR], '~': ['^', PREC.BXOR], '<<': ['<<', PREC.SHIFT], '>>': ['>>>', PREC.SHIFT] }[op];
                return infix(js[0], js[1]);
            }
        }
    }
    concat(e) {
        const parts = [];
        const collect = n => {
            if (n.type === 'Binary' && n.op === '..') { collect(n.l); collect(n.r); } else parts.push(n);
        };
        collect(e);
        const literal = parts.filter(p => p.type === 'String').length;
        if (literal && literal < parts.length) {
            const text = s => s.replace(/[\\`]/g, '\\$&').replace(/\$\{/g, '\\${').replace(/[\u0000-\u001f]/g, c => ({ '\n': '\\n', '\r': '\\r', '\t': '\\t' })[c] || `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
            return R(`\`${parts.map(p => p.type === 'String' ? text(p.value) : `\${${this.expr(p).c}}`).join('')}\``, PREC.PRIMARY, 'string');
        }
        let isString = false;
        const codes = parts.map((p, i) => {
            const r = this.expr(p);
            const text = r.k === 'string';
            const code = !isString && !text && i < parts.length - 1 ? `String(${r.c})` : wrap(r, i ? PREC.ADD + 1 : PREC.ADD);
            isString = isString || text || i === 0;
            return code;
        });
        return R(codes.join(' + '), PREC.ADD, 'string');
    }
    logical(e) {
        const isAnd = e.op === 'and';
        if (!isAnd && e.l.type === 'Binary' && e.l.op === 'and') {
            const yes = this.expr(e.l.r);
            if (ALWAYS_TRUE_KINDS.has(yes.k)) {
                const test = this.cond(e.l.l), no = this.expr(e.r);
                return R(`${wrap(test, PREC.COND + 1)} ? ${wrap(yes, PREC.ASSIGN)} : ${wrap(no, PREC.ASSIGN)}`, PREC.COND, yes.k === no.k ? yes.k : 'unknown');
            }
        }
        const left = this.expr(e.l), right = this.expr(e.r);
        const kind = left.k === right.k ? left.k : 'unknown';
        const logicalOperand = (r, min, op) => wrap(r.op === '??' || (r.op && op === '??') ? { ...r, p: 0 } : r, min);
        if (left.k === 'boolean') {
            const [js, p] = isAnd ? ['&&', PREC.AND] : ['||', PREC.OR];
            return R(`${logicalOperand(left, p, js)} ${js} ${logicalOperand(right, p + 1, js)}`, p, kind, js);
        }
        if (!isAnd) return R(`${logicalOperand(left, PREC.OR, '??')} ?? ${logicalOperand(right, PREC.OR + 1, '??')}`, PREC.OR, kind, '??');
        if (this.isSimple(e.l)) return R(`${this.use('truthy')}(${left.c}) ? ${wrap(right, PREC.ASSIGN)} : ${left.c}`, PREC.COND, kind);
        return R(`${this.use('and')}(${wrap(left, PREC.ASSIGN)}, () => ${wrap(right, PREC.ASSIGN)})`, PREC.MEMBER, kind);
    }
    /* A JS boolean expression for a Lua condition. */
    cond(e) {
        switch (e.type) {
            case 'Paren': return this.cond(e.e);
            case 'True': return R('true', PREC.PRIMARY, 'boolean');
            case 'False': case 'Nil': return R('false', PREC.PRIMARY, 'boolean');
            case 'Unary':
                if (e.op === 'not') return R(`!${wrap(this.cond(e.e), PREC.UNARY)}`, PREC.UNARY, 'boolean');
                break;
            case 'Binary':
                if (e.op === 'and' || e.op === 'or') {
                    const [js, p] = e.op === 'and' ? ['&&', PREC.AND] : ['||', PREC.OR];
                    return R(`${wrap(this.cond(e.l), p)} ${js} ${wrap(this.cond(e.r), p + 1)}`, p, 'boolean');
                }
                break;
            default:
        }
        const r = this.expr(e);
        if (r.k === 'boolean' || r.k === 'flag') return r;
        if (e.type === 'Number' || e.type === 'String') return R('true', PREC.PRIMARY, 'boolean');
        return R(`${this.use('truthy')}(${r.c})`, PREC.MEMBER, 'boolean');
    }

    /* `{}` stored in a field is an array when that field is used like one anywhere in the file. */
    emptyTable(field) {
        const isArray = tableUsage(n => n.type === 'Index' && n.key.type === 'String' && n.key.value === field, this.ast) === 'array';
        return isArray ? R('[]', PREC.PRIMARY, 'array') : R('{}', PREC.PRIMARY, 'object');
    }
    tableExpr(e) {
        const items = e.items;
        const positional = items.filter(i => i.kind === 'pos');
        const joined = (open, close, parts) => {
            const flat = `${open}${parts.join(', ')}${close}`;
            if (flat.length <= 80 && !flat.includes('\n')) return open === '{' && parts.length ? `{ ${parts.join(', ')} }` : flat;
            return `${open}\n${this.indent(parts.map(p => `${p},`).join('\n').split('\n')).join('\n')}\n${close}`;
        };
        const array = () => {
            const values = items.filter(i => i.kind === 'pos');
            return values.map((item, i) => i === values.length - 1 && this.isMulti(item.value) ? this.spread(item.value) : wrap(this.expr(item.value), PREC.ASSIGN));
        };
        const object = () => items.filter(i => i.kind !== 'pos').map(item => {
            const field = item.kind === 'named' ? item.key : item.key.type === 'String' ? item.key.value : null;
            const value = wrap(field && item.value.type === 'Table' && !item.value.items.length ? this.emptyTable(field) : this.expr(item.value), PREC.ASSIGN);
            if (item.kind === 'named') return `${IDENT.test(item.key) ? item.key : JSON.stringify(item.key)}: ${value}`;
            if (item.key.type === 'String') return `${IDENT.test(item.key.value) ? item.key.value : JSON.stringify(item.key.value)}: ${value}`;
            if (item.key.type === 'Number') this.warn('numeric key in a table constructor becomes an object property (1-based)');
            return `[${this.expr(item.key).c}]: ${value}`;
        });
        if (!items.length) return R('{}', PREC.PRIMARY, 'object');
        if (positional.length === items.length) return R(joined('[', ']', array()), PREC.PRIMARY, 'array');
        if (!positional.length) return R(joined('{', '}', object()), PREC.PRIMARY, 'object');
        this.warn('table mixes array items and keys: translated to an array carrying properties');
        return R(`Object.assign(${joined('[', ']', array())}, ${joined('{', '}', object())})`, PREC.MEMBER, 'array');
    }

    /* ---- calls and library mapping ---- */
    callExpr(e, raw) {
        if (e.type === 'MethodCall') return this.methodCall(e, raw);
        const lib = this.libPath(e.fn);
        if (lib) {
            const mapped = this.libCall(lib, e, raw);
            if (mapped) return mapped;
        }
        const fn = this.expr(e.fn);
        const args = this.exprList(e.args);
        const call = R(`${wrap(fn, PREC.MEMBER)}(${args.join(', ')})`, PREC.MEMBER);
        return !raw && this.isMulti(e) ? R(`${call.c}[0]`, PREC.MEMBER) : call;
    }
    methodCall(e, raw) {
        const recv = this.expr(e.obj);
        if (STRING_METHODS.has(e.name) && recv.k !== 'object') {
            if (recv.k === 'unknown' && e.obj.type !== 'String') this.warn(`':${e.name}' assumed to be a string method; the receiver type is unknown`);
            const mapped = this.stringCall(e.name, recv, e.args, raw);
            if (mapped) return mapped;
        }
        const name = IDENT.test(e.name) ? `.${e.name}` : `[${JSON.stringify(e.name)}]`;
        const args = this.exprList(e.args);
        let call;
        if (this.isSimple(e.obj)) call = R(`${wrap(recv, PREC.MEMBER)}${name}(${[recv.c, ...args].join(', ')})`, PREC.MEMBER);
        else {
            this.pushScope();
            const self = this.declare('%self', { base: 'self' }).js;
            call = R(`(${self} => ${self}${name}(${[self, ...args].join(', ')}))(${recv.c})`, PREC.MEMBER);
            this.popScope();
        }
        return !raw && this.isMulti(e) ? R(`${call.c}[0]`, PREC.MEMBER) : call;
    }
    stringCall(name, recv, argNodes, raw) {
        const s = wrap(recv, PREC.MEMBER);
        const args = argNodes.map(a => this.expr(a));
        const a = i => wrap(args[i], PREC.ASSIGN);
        switch (name) {
            case 'upper': return R(`${s}.toUpperCase()`, PREC.MEMBER, 'string');
            case 'lower': return R(`${s}.toLowerCase()`, PREC.MEMBER, 'string');
            case 'len': return R(`${s}.length`, PREC.MEMBER, 'number');
            case 'rep': return args.length === 1 ? R(`${s}.repeat(${a(0)})`, PREC.MEMBER, 'string') : null;
            case 'reverse': return R(`[...${s}].reverse().join("")`, PREC.MEMBER, 'string');
            case 'byte': return R(`${s}.charCodeAt(${args.length ? this.adjust(argNodes[0], args[0]) : 0})`, PREC.MEMBER, 'number');
            case 'format': return R(`${this.use('format')}(${[recv.c, ...args.map((_, i) => a(i))].join(', ')})`, PREC.MEMBER, 'string');
            case 'sub': {
                const positive = n => n && n.type === 'Number' && Number.isInteger(n.value) && n.value >= 1;
                if (positive(argNodes[0]) && (argNodes.length === 1 || (argNodes[1].type === 'Number' && argNodes[1].value >= 0))) {
                    return R(`${s}.slice(${[argNodes[0].value - 1, ...(argNodes[1] ? [argNodes[1].value] : [])].join(', ')})`, PREC.MEMBER, 'string');
                }
                return R(`${this.use('sub')}(${[recv.c, ...args.map((_, i) => a(i))].join(', ')})`, PREC.MEMBER, 'string');
            }
            default:
                return PATTERN_METHODS.has(name) ? this.patternCall(name, recv, argNodes, raw) : null;
        }
    }
    patternCall(name, recv, argNodes, raw) {
        const pattern = argNodes[0];
        const plain = name === 'find' && argNodes[3] && argNodes[3].type === 'True';
        const source = pattern && pattern.type === 'String' ? (plain ? [...pattern.value].map(regexEscape).join('') || '(?:)' : luaPattern(pattern.value)) : null;
        if (source === null || (name === 'gsub' && argNodes.length > 2)) {
            this.warn(`Lua patterns (string.${name}): this pattern, a non-literal pattern or a replacement limit cannot be converted; rewrite with RegExp`);
            return null;
        }
        /* '/' is already escaped by regexEscape; control characters cannot appear raw in a regex literal */
        const literal = source.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
        const regex = `/${literal}/${name === 'gsub' || name === 'gmatch' ? 'g' : ''}`;
        const args = [recv.c, regex];
        if (name === 'gsub') {
            const repl = argNodes[1];
            if (!repl || repl.type === 'Table') {
                this.warn('string.gsub with a table replacement has no JavaScript equivalent');
                return null;
            }
            args.push(repl.type === 'String' ? JSON.stringify(luaReplacement(repl.value)) : wrap(this.expr(repl), PREC.ASSIGN));
        } else if (name !== 'gmatch' && argNodes[1] && !plain) args.push(wrap(this.expr(argNodes[1]), PREC.ASSIGN));
        const call = `${this.use(name)}(${args.join(', ')})`;
        if (name === 'gmatch') return R(call, PREC.MEMBER, 'function');
        if (raw) return R(name === 'gsub' ? call : `(${call} ?? [])`, name === 'gsub' ? PREC.MEMBER : PREC.PRIMARY);
        return name === 'gsub' ? R(`${call}[0]`, PREC.MEMBER, 'string') : R(`${call}?.[0]`, PREC.MEMBER, 'number');
    }
    libCall(path, e, raw) {
        const argNodes = e.args;
        const args = () => argNodes.map(a => this.expr(a));
        const code = i => wrap(this.expr(argNodes[i]), PREC.ASSIGN);
        const plain = (js, kind) => R(`${js}(${this.exprList(argNodes).join(', ')})`, PREC.MEMBER, kind);
        const [lib, fn] = path.split('.');
        if (lib === 'math' && MATH_FUNCTIONS.includes(fn) && argNodes.length === 1) return plain(`Math.${fn}`, 'number');
        switch (path) {
            case 'print': return plain('console.log');
            case 'tostring': return argNodes.length === 1 ? R(`String(${code(0)})`, PREC.MEMBER, 'string') : null;
            case 'tonumber': case 'type': case 'assert': case 'pcall': case 'error':
                return plain(this.use(path), path === 'type' ? 'string' : 'unknown');
            case 'math.max': case 'math.min': return plain(`Math.${fn}`, 'number');
            case 'math.log':
                if (argNodes.length === 2) {
                    const base = argNodes[1];
                    if (base.type === 'Number' && (base.value === 10 || base.value === 2)) return R(`Math.log${base.value}(${code(0)})`, PREC.MEMBER, 'number');
                    return R(`Math.log(${code(0)}) / Math.log(${code(1)})`, PREC.MUL, 'number');
                }
                return plain('Math.log', 'number');
            case 'math.atan': return argNodes.length === 2 ? plain('Math.atan2', 'number') : plain('Math.atan', 'number');
            case 'math.fmod': return R(`${wrap(this.expr(argNodes[0]), PREC.MUL)} % ${wrap(this.expr(argNodes[1]), PREC.MUL + 1)}`, PREC.MUL, 'number');
            case 'math.tointeger': return plain('Math.trunc', 'number');
            case 'math.random':
                if (!argNodes.length) return R('Math.random()', PREC.MEMBER, 'number');
                if (argNodes.length === 1) return R(`Math.floor(Math.random() * ${wrap(this.expr(argNodes[0]), PREC.MUL + 1)}) + 1`, PREC.ADD, 'number');
                return R(`Math.floor(Math.random() * (${code(1)} - ${code(0)} + 1)) + ${wrap(this.expr(argNodes[0]), PREC.ADD + 1)}`, PREC.ADD, 'number');
            case 'string.char': return plain('String.fromCharCode', 'string');
            case 'table.insert':
                if (argNodes.length === 2) return R(`${wrap(this.expr(argNodes[0]), PREC.MEMBER)}.push(${code(1)})`, PREC.MEMBER);
                if (argNodes.length === 3) return R(`${wrap(this.expr(argNodes[0]), PREC.MEMBER)}.splice(${this.adjust(argNodes[1], this.expr(argNodes[1]))}, 0, ${code(2)})`, PREC.MEMBER);
                return null;
            case 'table.remove': {
                const t = wrap(this.expr(argNodes[0]), PREC.MEMBER);
                return argNodes.length === 1 ? R(`${t}.pop()`, PREC.MEMBER) : R(`${t}.splice(${this.adjust(argNodes[1], this.expr(argNodes[1]))}, 1)[0]`, PREC.MEMBER);
            }
            case 'table.concat': {
                const t = wrap(this.expr(argNodes[0]), PREC.MEMBER);
                return R(`${t}.join(${argNodes.length > 1 ? code(1) : '""'})`, PREC.MEMBER, 'string');
            }
            case 'table.sort': {
                const t = wrap(this.expr(argNodes[0]), PREC.MEMBER);
                const compare = argNodes.length > 1 ? `${this.use('comparator')}(${code(1)})` : '(a, b) => a < b ? -1 : a > b ? 1 : 0';
                return R(`${t}.sort(${compare})`, PREC.MEMBER);
            }
            case 'table.unpack': case 'unpack':
                this.warn('table.unpack outside a call argument list is translated to the array itself');
                return R(this.rawMulti(e), PREC.PRIMARY);
            case 'select':
                if (argNodes[0].type === 'String' && argNodes[0].value === '#') return R(`${this.varargs()}.length`, PREC.MEMBER, 'number');
                return R(`${wrap(R(this.rawMulti(e), PREC.MEMBER), PREC.MEMBER)}[0]`, PREC.MEMBER);
            case 'os.time': return argNodes.length ? null : R('Math.floor(Date.now() / 1000)', PREC.MEMBER, 'number');
            case 'os.clock': return R('performance.now() / 1000', PREC.MUL, 'number');
            case 'io.write': {
                const parts = args().map(a => a.k === 'string' ? wrap(a, PREC.ADD + 1) : `String(${a.c})`);
                return R(`process.stdout.write(${parts.join(' + ') || '""'})`, PREC.MEMBER);
            }
            case 'require': return null;
            default:
                if (lib === 'string' && STRING_METHODS.has(fn) && argNodes.length) {
                    return this.stringCall(fn, this.expr(argNodes[0]), argNodes.slice(1), raw);
                }
                if (path === 'ipairs' || path === 'pairs') this.warn(`${path}() is only translated directly in a for loop`);
                else this.warn(`${path} has no direct JavaScript equivalent`);
                return null;
        }
    }
}

/* -------------------------------------------------------------- driver */

function snapshot(info) {
    return JSON.stringify([[...info.multi], [...info.globals].sort(), [...info.functions].sort()]);
}

/**
 * Translates Lua source to JavaScript.
 * @param {string} source Lua 5.x source.
 * @param {{format?: 'none'|'esm'|'cjs', header?: boolean}} [options]
 * @returns {{code: string, warnings: {line: number, message: string}[], exports: string[], freeGlobals: string[]}}
 */
function transpile(source, options = {}) {
    const format = options.format || 'none';
    const ast = parse(source);
    const info = { multi: new Map(), globals: new Set(), assigned: new Set(), read: new Set(), functions: new Set() };
    let gen, lines;
    /* Locals must avoid every global name and callers must know which
     * functions return arrays, which is only known after a full pass. */
    for (let pass = 0; pass < 6; pass++) {
        const before = snapshot(info);
        gen = new Gen(info, ast);
        lines = gen.chunk(ast);
        if (snapshot(info) === before) break;
    }
    const hoisted = [...info.assigned].filter(n => !info.functions.has(n)).sort();
    const exported = [...new Set([...info.functions, ...info.assigned])].sort();
    const parts = [];
    if (options.header !== false) parts.push('// Translated from Lua by fengari lua2js. Review every TODO(lua2js) before relying on it.');
    const helpers = HELPER_ORDER.filter(h => gen.helpers.has(h));
    if (helpers.length) parts.push(helpers.map(h => HELPERS[h]).join('\n\n'));
    if (hoisted.length) parts.push(`let ${hoisted.join(', ')};`);
    if (lines.length) parts.push(lines.join('\n'));
    if (exported.length && format === 'esm') parts.push(`export { ${exported.join(', ')} };`);
    if (exported.length && format === 'cjs') parts.push(`module.exports = { ${exported.join(', ')} };`);
    const free = [...info.read].filter(n => !info.assigned.has(n) && !info.functions.has(n) && !LIB_ROOTS.has(n)).sort();
    return { code: `${parts.join('\n\n')}\n`, warnings: gen.warnings, exports: exported, freeGlobals: free };
}

module.exports = { transpile, parse, tokenize, LuaSyntaxError };
