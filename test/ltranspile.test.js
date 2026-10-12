"use strict";

const { PyroeisVm } = require('../src/pyroeis-vm.js');
const { transpile, LuaSyntaxError } = require('../src/ltranspile.js');

/* Runs `main()` in Fengari and in the translated JavaScript. */
function both(lua, ...args) {
    const vm = new PyroeisVm();
    vm.run(lua);
    const expected = vm.call('main', ...args);
    const { code } = transpile(lua, { format: 'cjs' });
    const mod = { exports: {} };
    new Function('module', code)(mod);
    return { expected, actual: mod.exports.main(...args), code };
}

function agree(lua, ...args) {
    const { expected, actual, code } = both(lua, ...args);
    try {
        expect(actual).toEqual(expected);
    } catch (error) {
        error.message += `\n--- generated ---\n${code}`;
        throw error;
    }
    return actual;
}

describe('translated programs agree with the Lua VM', () => {
    test('arithmetic, precedence and integer division', () => {
        agree('function main() return 2 + 3 * 4 - (1 + 2) * 2 ^ 3 // 1 + 7 % 3 end');
        agree('function main() local a, b = -7, 3 return a // b * 100 + a % b end');
        agree('function main() local a, b = 7, -3 return a // b * 100 + a % b end');
        agree('function main() return -2 ^ 2 end');
        agree('function main() local x = 5 return -x ^ 2 + (-x) ^ 2 end');
        agree('function main() local n = 6 return n % 2 == 0 and 1 or 0 end');
    });

    test('control flow: while, repeat with body locals, numeric for, nested breaks', () => {
        agree(`function main()
            local s, i = 0, 0
            while i < 10 do i = i + 1 if i == 7 then break end s = s + i end
            repeat local k = s - 1; s = k until k < 10
            for j = 10, 1, -3 do s = s + j end
            for j = 1, 3 do for l = 1, 3 do if l == 2 then break end s = s + j * l end end
            return s
        end`);
    });

    test('shadowing and closures capture per-iteration variables', () => {
        agree(`function main()
            local x = 1
            local x = x + 1
            do local x = x * 10; x = x + 1 end
            local fns = {}
            for i = 1, 3 do fns[#fns + 1] = function() return i * x end end
            local out = 0
            for _, f in ipairs(fns) do out = out * 100 + f() end
            return out
        end`);
    });

    test('Lua truthiness differs from JavaScript for 0 and empty string', () => {
        agree(`function main()
            local function t(v) if v then return "y" else return "n" end end
            return t(0) .. t("") .. t(false) .. t(nil) .. t({}) .. t(1)
        end`);
        agree('function main(v) return (v and "set" or "unset") end', 0);
        agree('function main(v) return (v and "set" or "unset") end', '');
        agree('function main(v) return v and v + 1 end', 0);
        agree('function main(v) return not v end', 0);
    });

    test('multiple returns, destructuring and tail calls', () => {
        agree(`local function two() return 1, 2 end
        local function wrap() return two() end
        local function none() end
        function main()
            local a, b, c = two()
            local d, e = wrap()
            local f = two()
            local g, h = none()
            return a .. b .. (c == nil and "N" or "v") .. d .. e .. f .. (g == nil and "N" or "v") .. (h == nil and "N" or "v") .. (two())
        end`);
        agree(`local function swap(a, b) return b, a end
        function main() local x, y = 1, 2; x, y = swap(x, y); return x * 10 + y end`);
    });

    test('varargs, select and table.unpack', () => {
        agree(`local function sum(...)
            local s = 0
            for _, v in ipairs({...}) do s = s + v end
            return s, select('#', ...)
        end
        function main()
            local total, n = sum(1, 2, 3, 4)
            return total * 10 + n + sum(table.unpack({10, 20}))
        end`);
    });

    test('arrays are 0-based in JavaScript but 1-based indexes are preserved', () => {
        agree(`function main()
            local t = {10, 20, 30}
            t[#t + 1] = 40
            table.insert(t, 50)
            table.insert(t, 1, 5)
            local last = table.remove(t)
            local first = table.remove(t, 1)
            local s = 0
            for i = 1, #t do s = s + t[i] * i end
            return s * 1000 + last + first + t[2] + #t
        end`);
        agree(`function main()
            local words = {"b", "c", "a"}
            table.sort(words)
            local nums = {5, 2, 9, 1}
            table.sort(nums, function(a, b) return a > b end)
            return table.concat(words, ",") .. "|" .. table.concat(nums, ",")
        end`);
    });

    test('objects, methods, nested tables and field arrays', () => {
        agree(`local Stack = {}
        function Stack.new() return {items = {}, size = 0} end
        function Stack.push(s, v) s.items[#s.items + 1] = v; s.size = s.size + 1 end
        function Stack:pop() local v = self.items[#self.items]; self.items[#self.items] = nil; self.size = self.size - 1; return v end
        function main()
            local s = Stack.new()
            Stack.push(s, 3) Stack.push(s, 4) Stack.push(s, 5)
            local top = Stack.pop(s)
            return top * 100 + s.size * 10 + #s.items
        end`);
        agree(`function main()
            local cfg = {name = "x", ["with space"] = 2, nested = {deep = {v = 7}}}
            cfg.extra = cfg.nested.deep.v + cfg["with space"]
            cfg.name = nil
            local keys = 0
            for k, v in pairs(cfg) do keys = keys + 1 end
            return keys * 100 + cfg.extra
        end`);
    });

    test('method calls pass self', () => {
        agree(`local Counter = {n = 0}
        function Counter:inc(by) self.n = self.n + by; return self end
        function main() Counter:inc(2):inc(3) return Counter.n end`);
    });

    test('strings: concatenation, methods, sub, format', () => {
        agree(`function main()
            local s = "Hello"
            local n = 3
            return s .. " " .. n .. "!" .. #s .. s:upper() .. s:lower() .. s:sub(2, 3) .. s:sub(-2) .. ("ab"):rep(2) .. s:reverse() .. s:byte(1)
        end`);
        agree('function main() return string.format("%d|%5d|%-5d|%05d|%s|%5.2f|%x|%%|%3s", 42, 42, 42, 42, "hi", 3.14159, 255, "a") end');
        agree('function main() local a, b = "x", 1 return a .. b .. a end');
    });

    test('generic for with custom iterators and pcall/error', () => {
        agree(`local function range(n)
            local i = 0
            return function() i = i + 1; if i <= n then return i end end
        end
        function main()
            local s = 0
            for v in range(4) do s = s + v end
            local ok, err = pcall(function() error("boom") end)
            return s .. tostring(ok) .. type(err)
        end`);
    });

    test('goto continue, including from an inner loop', () => {
        agree(`function main()
            local s = 0
            for i = 1, 6 do
                for j = 1, 3 do
                    if j == 2 then goto continue end
                    if i == 3 then goto next_i end
                    s = s + i * j
                    ::continue::
                end
                ::next_i::
            end
            return s
        end`);
    });

    test('math library and global state', () => {
        agree(`counter = 0
        function bump(n) counter = counter + n return counter end
        function main()
            bump(2) bump(3)
            return math.floor(7.5) + math.ceil(1.2) + math.max(1, 9, 4) + math.min(3, 2) + math.abs(-4) + math.sqrt(16) + counter
        end`);
    });

    test('recursion and mutual recursion with global functions', () => {
        agree(`function fib(n) if n < 2 then return n end return fib(n - 1) + fib(n - 2) end
        function even(n) if n == 0 then return true end return odd(n - 1) end
        function odd(n) if n == 0 then return false end return even(n - 1) end
        function main() return fib(15) + (even(10) and 1000 or 0) end`);
    });

    test('anonymous functions become arrows and keep semantics', () => {
        const lua = 'function main() local f = function(a, b) return a * b end return f(6, 7) end';
        expect(both(lua).code).toContain('=>');
        agree(lua);
    });

    test('elseif chains, dynamic loop steps and float steps', () => {
        agree(`function main(step)
            local out = 0
            for i = 10, 1, step do out = out * 2 + i end
            for x = 0, 1, 0.25 do out = out + x end
            local n = 15
            if n < 5 then out = out + 1 elseif n < 10 then out = out + 2 elseif n < 20 then out = out + 4 else out = out + 8 end
            return out
        end`, -3);
    });

    test('upvalues shared between closures and swapped multi-assignment', () => {
        agree(`local function counter()
            local n = 0
            return function() n = n + 1; return n end, function() return n end
        end
        function main()
            local inc, get = counter()
            inc() inc() inc()
            local a, b = 1, 2
            a, b = b, a + b
            return get() * 100 + a * 10 + b
        end`);
    });

    test('numeric edge cases: negative modulo, float division, comparisons', () => {
        agree('function main() return (-7 % 3) * 1000 + (7 % -3) * 100 + (7 // 2) * 10 + (7 / 2) end');
        agree('function main() return ("a" < "b" and 1 or 0) + (2 <= 2 and 10 or 0) + (3 ~= 3 and 100 or 0) end');
    });

    test('nested tables and array of objects', () => {
        agree(`function main()
            local people = {{name = "a", age = 30}, {name = "b", age = 20}}
            table.sort(people, function(x, y) return x.age < y.age end)
            local names = {}
            for i, p in ipairs(people) do names[i] = p.name .. p.age end
            return table.concat(names, ";") .. #people
        end`);
    });

    test('boolean tables read like JavaScript conditions without truthy()', () => {
        const lua = `function main(n)
            local sieve = {}
            for i = 2, n do sieve[i] = false end
            local count = 0
            for i = 2, n do
                if not sieve[i] then
                    count = count + 1
                    for j = i * i, n, i do sieve[j] = true end
                end
            end
            return count
        end`;
        expect(both(lua, 100).code).not.toContain('truthy');
        agree(lua, 100);
    });

    test('Lua patterns become RegExp calls: gsub, find, match, gmatch', () => {
        agree(`function main()
            local text = "one 22 three 4444 five"
            local replaced, count = text:gsub("%d+", "<%0>")
            local digits = 0
            for number in text:gmatch("%d+") do digits = digits + #number end
            local total = 0
            for key, value in ("a=1, b=2, c=3"):gmatch("(%w+)=(%w+)") do total = total + tonumber(value) end
            local s, e = text:find("three")
            local word = text:match("(%a+) %d+ five")
            local none = text:find("zzz")
            local upper = (text:gsub("%a+", function(w) return w:upper() end))
            local first, last, cap = string.find("key=value", "(%w+)=")
            return count .. "|" .. replaced .. "|" .. digits .. "|" .. total .. "|" .. s .. "," .. e .. "|" .. word .. "|" .. tostring(none == nil) .. "|" .. upper .. "|" .. first .. last .. cap
        end`);
        agree('function main() local _, n = ("a.b.c"):gsub("%.", "") return n end');
        agree('function main() return (("  trim me  "):gsub("^%s+", ""):gsub("%s+$", "")) end');
        agree('function main() if ("hello"):find("l+") then return 1 end return 0 end');
        agree(String.raw`function main() local r, n = ("a/b\nc"):gsub("[/\n]", "_") return r .. n end`);
        agree('function main() local r = ("a/b"):gsub("/", "%%") return r end');
    });

    test('`or` keeps Lua truth semantics: false, nil, 0 and empty strings', () => {
        const pick = 'function main(a, b) return a or b end';
        for (const a of [false, 0, '', 7]) agree(pick, a, 'fallback');
        agree('function main(a) a = a or "default" return a end', false);
        agree('function main(a) a = a or "default" return a end');
        agree('function main(o) return o.x or o.y or "none" end', { x: false, y: false });
        agree('function main(o) return o.x or o.y or "none" end', { x: false, y: 5 });
        agree('function main(a, b) return (a == b) or "different" end', 1, 2);
        agree('function main() local s = "text" return s or "other" end');
        expect(both(pick, false, 'fallback').code).not.toContain('??');
    });

    test('the nullishOr option emits the shorter a ?? b and documents the difference', () => {
        const { code } = transpile('function main(a, b) return a or b end', { header: false, nullishOr: true });
        expect(code).toContain('a ?? b');
        expect(code).not.toContain('truthy');
        const mod = { exports: {} };
        new Function('module', transpile('function main(a, b) return a or b end', { format: 'cjs', nullishOr: true }).code)(mod);
        expect(mod.exports.main(false, 'fallback')).toBe(false); /* Lua would return 'fallback' */
    });

    test('reserved words and helper names are renamed, not captured', () => {
        agree(`function main()
            local new, class, var, args, mod, truthy = 1, 2, 3, 4, 5, 6
            return new + class + var + args + mod + truthy + (7 % 4)
        end`);
    });
});

describe('PyroeisVm.toJs', () => {
    test('translates without running the source', () => {
        const { code, exports } = PyroeisVm.toJs('function twice(x) return x * 2 end', { format: 'cjs', header: false });
        expect(code).toContain('function twice(x)');
        expect(exports).toEqual(['twice']);
    });
});

describe('output shape', () => {
    test('is readable: const, template literals, member access, no register noise', () => {
        const { code } = transpile('local p = {x = 1}\nlocal n = "v" .. p.x .. "!"\nreturn n', { header: false });
        expect(code).toContain('const p = { x: 1 };');
        expect(code).toContain('`v${p.x}!`');
    });

    test('comments cannot break out into code', () => {
        for (const terminator of ['\r', '\n'.replace('\n', String.fromCharCode(0x2028)), String.fromCharCode(0x2029)]) {
            const { code } = transpile(`-- harmless${terminator}globalThis.LUA2JS_INJECTED = 1;\nlocal x = 1`, { header: false });
            delete globalThis.LUA2JS_INJECTED;
            new Function(code)();
            expect(globalThis.LUA2JS_INJECTED).toBeUndefined();
        }
        const { code } = transpile('--[[ a */ globalThis.LUA2JS_INJECTED = 1; /* ]]\nlocal x = 1', { header: false });
        new Function(code)();
        expect(globalThis.LUA2JS_INJECTED).toBeUndefined();
    });

    test('keeps comments and exports for ES modules', () => {
        const { code, exports } = transpile('-- adds\nfunction add(a, b) return a + b end', { format: 'esm', header: false });
        expect(code).toContain('// adds');
        expect(code).toContain('function add(a, b) {');
        expect(code).toContain('export { add };');
        expect(exports).toEqual(['add']);
    });

    test('flags constructs that need a human', () => {
        const { code, warnings } = transpile('local o = setmetatable({}, {__index = base})\nlocal a, b = s:find("%b()")\nlocal n = 1 << 3', { header: false });
        expect(code).toContain('TODO(lua2js)');
        const text = warnings.map(w => w.message).join('\n');
        expect(text).toMatch(/setmetatable/);
        expect(text).toMatch(/patterns/);
        expect(text).toMatch(/32-bit/);
    });

    test('reports free globals the host must provide', () => {
        const { freeGlobals } = transpile('host.log(print_it, x)\nlocal ok = x', { header: false });
        expect(freeGlobals).toEqual(['host', 'print_it', 'x']);
    });

    test('reports syntax errors with the line number', () => {
        expect(() => transpile('local x = 1\nlocal = 2')).toThrow(LuaSyntaxError);
        expect(() => transpile('local x = 1\nif x then')).toThrow(/line 2/);
    });
});

describe('lua2js command', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const { spawnSync } = require('child_process');
    const cli = path.join(__dirname, '..', 'src', 'lua2js.js');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lua2js-'));
    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
    const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

    test('writes the output file and lists what needs review', () => {
        const input = path.join(dir, 'in.lua');
        const output = path.join(dir, 'out.js');
        fs.writeFileSync(input, 'function f(t) return setmetatable(t, {}) end');
        const result = run(input, '-o', output, '--format', 'esm');
        expect(result.status).toBe(0);
        expect(fs.readFileSync(output, 'utf8')).toContain('export { f };');
        expect(result.stderr).toMatch(/setmetatable/);
        expect(result.stderr).toMatch(/1 item\(s\) need review/);
    });

    test('--nullish-or switches `or` to ??', () => {
        const input = path.join(dir, 'or.lua');
        fs.writeFileSync(input, 'function f(a, b) return a or b end');
        expect(run(input, '--quiet', '--no-header').stdout).toContain('truthy(a) ? a : b');
        expect(run(input, '--quiet', '--no-header', '--nullish-or').stdout).toContain('a ?? b');
    });

    test('prints to stdout and stays quiet with --quiet', () => {
        const input = path.join(dir, 'p.lua');
        fs.writeFileSync(input, 'print(1 + 1)');
        const result = run(input, '--quiet', '--no-header');
        expect(result.stdout).toBe('console.log(1 + 1);\n');
        expect(result.stderr).toBe('');
    });

    test('exits 1 on a syntax error and 2 on bad usage', () => {
        const input = path.join(dir, 'bad.lua');
        fs.writeFileSync(input, 'local = 1');
        const bad = run(input);
        expect(bad.status).toBe(1);
        expect(bad.stderr).toMatch(/line 1/);
        expect(run().status).toBe(2);
        expect(run(input, '--format', 'amd').status).toBe(2);
    });
});
