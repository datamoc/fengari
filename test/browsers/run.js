"use strict";

/*
 * Runs the browser bundle in real Chromium and Firefox through Playwright.
 *   npm run test:browsers
 * Browsers come from `npx playwright-core install chromium firefox`. Behind a proxy, set
 * HTTPS_PROXY for that command. Locally a browser that cannot start is skipped; with CI=true
 * (or PYROEIS_REQUIRE_BROWSERS=1) it is a failure. PYROEIS_CHROME_PATH points Chromium at an
 * installed Chrome. This is not a Jest test: Jest would load it without a browser.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { chromium, firefox } = require("playwright-core");
const { buildBrowser } = require("../../tools/build-browser.js");

const require_all = process.env.CI === "true" || process.env.PYROEIS_REQUIRE_BROWSERS === "1";
const entry = path.join(__dirname, "..", "..", "src", "pyroeis.js");

/* [Lua source, expected result of vm.run] */
const CASES = [
    ["return 1 + 2", 3],
    ["return 2^10", 1024],
    ["return string.format('%5.2f|%x', 3.14159, 255)", " 3.14|ff"],
    /* "\1#" and "\18\3" used to share one table key */
    ["local t = {}; t['\\1#'] = 1; t['\\18\\3'] = 2; return t['\\1#'] * 10 + t['\\18\\3']", 12],
    /* longer than the chunk size luaS_hash feeds to String.fromCharCode.apply */
    ["local a, b = ('x'):rep(20000) .. 'a', ('x'):rep(20000) .. 'b'; local t = {[a] = 1, [b] = 2}; return t[a] * 10 + t[b]", 12],
    ["return #'\\xe9\\xff\\0' + ('\\xe9'):byte()", 3 + 233],
    ["return type(io), type(os.getenv)", "nil"],
    ["local co = coroutine.wrap(function(a) local b = coroutine.yield(a + 1); return b * 2 end); return co(1) + co(10)", 22],
];

async function runIn(name, type, options, bundle) {
    let browser;
    try {
        browser = await type.launch(options);
    } catch (e) {
        if (require_all) throw e;
        console.log(`SKIP ${name}: cannot start (${e.message.split("\n")[0]})`);
        return false;
    }
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", e => errors.push(e.message));
        await page.setContent("<!doctype html><title>pyroeis</title>");
        await page.addScriptTag({ content: bundle });
        const results = await page.evaluate(cases => {
            const vm = new Pyroeis.PyroeisVm();
            return cases.map(([src]) => {
                try { return vm.run(src); } catch (e) { return "ERROR " + e.message; }
            });
        }, CASES);
        assert.deepStrictEqual(errors, []);
        CASES.forEach(([src, expected], i) => assert.strictEqual(results[i], expected, `${name}: ${src}`));
        console.log(`PASS ${name} ${browser.version()}: ${CASES.length} cases`);
        return true;
    } finally {
        await browser.close();
    }
}

(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pyroeis-browsers-"));
    try {
        const out = path.join(dir, "pyroeis.bundle.js");
        buildBrowser(entry, out, "Pyroeis", "pyroeis browser test bundle", ["Fengari"]);
        const bundle = fs.readFileSync(out, "utf8");
        const chromeOptions = process.env.PYROEIS_CHROME_PATH ? { executablePath: process.env.PYROEIS_CHROME_PATH } : {};
        const ran = [
            await runIn("chromium", chromium, chromeOptions, bundle),
            await runIn("firefox", firefox, {}, bundle)
        ];
        if (!ran.some(Boolean)) throw new Error("no browser could run the tests");
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
