/*
** Benchmark definitions: each algorithm exists twice, as a Lua chunk (run by
** Fengari) and as a plain JavaScript function. Both take one size parameter
** and return a numeric checksum so the page can verify they computed the
** same thing. All arithmetic is exact in both languages (integers < 2^53,
** IEEE doubles for the float benchmark).
*/
(function(root, factory) {
    if (typeof module === "object" && module.exports) module.exports = factory();
    else root.BENCHMARKS = factory();
})(typeof self !== "undefined" ? self : this, function() {
    "use strict";

    return [
        {
            id: "expression",
            title: "Simple numeric expression",
            what: "parameters and floating-point arithmetic",
            size: 100000,
            lua: `function run(n) return (n + 0.5) * 1.25 - 3.0 end`,
            js: function run(n) {
                return (n + 0.5) * 1.25 - 3.0;
            }
        },
        {
            id: "sum",
            title: "Integer sum",
            what: "a complete numeric loop",
            size: 100000,
            lua: `
function run(n)
  local sum = 0
  for i = 1, n do sum = sum + i end
  return sum
end`,
            js: function run(n) {
                let sum = 0;
                for (let i = 1; i <= n; i++) sum += i;
                return sum;
            }
        },
        {
            id: "nested",
            title: "Nested numeric loops",
            what: "integer loop controls and float accumulation",
            size: 300,
            lua: `
function run(n)
  local sum = 0.0
  for i = 1, n do
    for j = 1, n do sum = sum + (i * j) / 2.0 end
  end
  return sum
end`,
            js: function run(n) {
                let sum = 0.0;
                for (let i = 1; i <= n; i++) {
                    for (let j = 1; j <= n; j++) sum += (i * j) / 2.0;
                }
                return sum;
            }
        },
        {
            id: "fib",
            title: "Recursive Fibonacci",
            what: "function calls and integer arithmetic",
            size: 24,
            lua: `
local function fib(n)
  if n < 2 then return n end
  return fib(n - 1) + fib(n - 2)
end

function run(n) return fib(n) end`,
            js: function run(n) {
                function fib(k) {
                    if (k < 2) return k;
                    return fib(k - 1) + fib(k - 2);
                }
                return fib(n);
            }
        },
        {
            id: "sieve",
            title: "Sieve of Eratosthenes",
            what: "array reads and writes in tight loops",
            size: 150000,
            lua: `
function run(n)
  local composite = {}
  for i = 2, n do composite[i] = false end
  local count = 0
  for i = 2, n do
    if not composite[i] then
      count = count + 1
      for j = i * i, n, i do composite[j] = true end
    end
  end
  return count
end`,
            js: function run(n) {
                const composite = new Array(n + 1).fill(false);
                let count = 0;
                for (let i = 2; i <= n; i++) {
                    if (!composite[i]) {
                        count++;
                        for (let j = i * i; j <= n; j += i) composite[j] = true;
                    }
                }
                return count;
            }
        },
        {
            id: "mandelbrot",
            title: "Mandelbrot set",
            what: "floating-point arithmetic",
            size: 80,
            lua: `
function run(n)
  local inside = 0
  for py = 0, n - 1 do
    for px = 0, n - 1 do
      local cr = 2.0 * px / n - 1.5
      local ci = 2.0 * py / n - 1.0
      local zr, zi = 0.0, 0.0
      local k = 0
      while k < 50 and zr * zr + zi * zi <= 4.0 do
        zr, zi = zr * zr - zi * zi + cr, 2.0 * zr * zi + ci
        k = k + 1
      end
      if k == 50 then inside = inside + 1 end
    end
  end
  return inside
end`,
            js: function run(n) {
                let inside = 0;
                for (let py = 0; py < n; py++) {
                    for (let px = 0; px < n; px++) {
                        const cr = 2.0 * px / n - 1.5;
                        const ci = 2.0 * py / n - 1.0;
                        let zr = 0.0, zi = 0.0;
                        let k = 0;
                        while (k < 50 && zr * zr + zi * zi <= 4.0) {
                            const next = zr * zr - zi * zi + cr;
                            zi = 2.0 * zr * zi + ci;
                            zr = next;
                            k++;
                        }
                        if (k === 50) inside++;
                    }
                }
                return inside;
            }
        },
        {
            id: "matmul",
            title: "Matrix multiplication",
            what: "nested tables / arrays",
            size: 50,
            lua: `
function run(n)
  local a, b, c = {}, {}, {}
  for i = 1, n do
    a[i], b[i], c[i] = {}, {}, {}
    for j = 1, n do
      a[i][j] = (i * j) % 7 + 1
      b[i][j] = (i + j) % 5 + 1
    end
  end
  for i = 1, n do
    local ai, ci = a[i], c[i]
    for j = 1, n do
      local sum = 0
      for k = 1, n do sum = sum + ai[k] * b[k][j] end
      ci[j] = sum
    end
  end
  local checksum = 0
  for i = 1, n do
    for j = 1, n do checksum = (checksum + c[i][j] * (i + j)) % 1000003 end
  end
  return checksum
end`,
            js: function run(n) {
                const a = [], b = [], c = [];
                for (let i = 1; i <= n; i++) {
                    a[i] = []; b[i] = []; c[i] = [];
                    for (let j = 1; j <= n; j++) {
                        a[i][j] = (i * j) % 7 + 1;
                        b[i][j] = (i + j) % 5 + 1;
                    }
                }
                for (let i = 1; i <= n; i++) {
                    const ai = a[i], ci = c[i];
                    for (let j = 1; j <= n; j++) {
                        let sum = 0;
                        for (let k = 1; k <= n; k++) sum += ai[k] * b[k][j];
                        ci[j] = sum;
                    }
                }
                let checksum = 0;
                for (let i = 1; i <= n; i++) {
                    for (let j = 1; j <= n; j++) checksum = (checksum + c[i][j] * (i + j)) % 1000003;
                }
                return checksum;
            }
        },
        {
            id: "sort",
            title: "Sort pseudo-random integers",
            what: "standard library sort with a comparison function",
            size: 15000,
            lua: `
function run(n)
  local values, x = {}, 12345
  for i = 1, n do
    x = (x * 48271) % 2147483647
    values[i] = x
  end
  table.sort(values, function(p, q) return p < q end)
  local checksum = 0
  for i = 1, n do checksum = (checksum + values[i] * (i % 10 + 1)) % 1000003 end
  return checksum
end`,
            js: function run(n) {
                const values = [];
                let x = 12345;
                for (let i = 0; i < n; i++) {
                    x = (x * 48271) % 2147483647;
                    values.push(x);
                }
                values.sort((p, q) => p - q);
                let checksum = 0;
                for (let i = 1; i <= n; i++) checksum = (checksum + values[i - 1] * (i % 10 + 1)) % 1000003;
                return checksum;
            }
        },
        {
            id: "strings",
            title: "String building and search",
            what: "string library: concatenation, gsub / split",
            size: 40000,
            lua: `
function run(n)
  local parts = {}
  for i = 1, n do parts[i] = tostring(i) end
  local text = table.concat(parts, ",")
  local _, sevens = text:gsub("7", "")
  return sevens + #text
end`,
            js: function run(n) {
                const parts = [];
                for (let i = 1; i <= n; i++) parts.push(String(i));
                const text = parts.join(",");
                return text.split("7").length - 1 + text.length;
            }
        },
        {
            id: "collatz",
            title: "Collatz longest chain",
            what: "integer loops with branches",
            size: 5000,
            lua: `
function run(n)
  local best, bestLength = 1, 1
  for start = 1, n do
    local x, length = start, 1
    while x ~= 1 do
      if x % 2 == 0 then x = x // 2 else x = 3 * x + 1 end
      length = length + 1
    end
    if length > bestLength then best, bestLength = start, length end
  end
  return best * 1000 + bestLength
end`,
            js: function run(n) {
                let best = 1, bestLength = 1;
                for (let start = 1; start <= n; start++) {
                    let x = start, length = 1;
                    while (x !== 1) {
                        x = x % 2 === 0 ? x / 2 : 3 * x + 1;
                        length++;
                    }
                    if (length > bestLength) { best = start; bestLength = length; }
                }
                return best * 1000 + bestLength;
            }
        }
    ];
});
