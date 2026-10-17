"use strict";

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const entry = path.join(__dirname, '..', 'src', 'pyroeis.js');
const NODE_ONLY = ['fs', 'os', 'path', 'crypto', 'child_process'];

/* Runs a script in a fresh Node whose `process` looks like a browser bundler's shim and where
 * any require() of a Node-only module from the library fails, as it would in a bundle. */
function runAsBrowser(body, { shim }) {
    const script = `
        const Module = require('module');
        const forbidden = new Set(${JSON.stringify(NODE_ONLY)});
        const load = Module._load;
        Module._load = function (request, parent) {
            if (forbidden.has(request) && parent && parent.filename.startsWith(${JSON.stringify(path.dirname(entry))})) {
                throw new Error('Node-only module required on the browser path: ' + request);
            }
            return load.apply(this, arguments);
        };
        ${shim ? "Object.defineProperty(process, 'versions', { value: {} }); Object.defineProperty(process, 'platform', { value: 'browser' });" : ''}
        const pyroeis = require(${JSON.stringify(entry)});
        ${body}
    `;
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'browser-compat-')), 'run.js');
    fs.writeFileSync(file, script);
    try {
        return spawnSync(process.execPath, [file], { encoding: 'utf8' });
    } finally {
        fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
}

describe('browser bundles', () => {
    test('a bundler\'s process shim does not make the library require Node-only modules', () => {
        const result = runAsBrowser(`
            const vm = new pyroeis.PyroeisVm();
            console.log(JSON.stringify([vm.run('return 1 + 2'), vm.run('return type(io)'), vm.run('return package.config:sub(1, 1)')]));
        `, { shim: true });
        expect(result.stderr).toBe('');
        expect(result.status).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual([3, 'nil', '/']);
    });

    test('is not detected as Node without process.versions.node, and is on real Node', () => {
        const isnode = require('../src/isnode.js');
        expect(isnode).toBe(true);
        const result = runAsBrowser(`console.log(require(${JSON.stringify(path.join(__dirname, '..', 'src', 'isnode.js'))}));`, { shim: true });
        expect(result.stdout.trim()).toBe('false');
    });

    test('package.json maps the Node-only modules to empty ones for bundlers', () => {
        const pkg = require('../package.json');
        for (const name of NODE_ONLY) expect(pkg.browser[name]).toBe(false);
    });

    test('no source file calls require(\'os\') or tests typeof process directly', () => {
        const sources = [];
        const walk = (dir) => {
            for (const entryName of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entryName.name);
                if (entryName.isDirectory()) walk(full); else if (full.endsWith('.js')) sources.push(full);
            }
        };
        walk(path.join(__dirname, '..', 'src'));
        const offenders = sources.filter((file) => file !== path.join(__dirname, '..', 'src', 'isnode.js') && !file.endsWith('luaconf-base.js'))
            .filter((file) => /typeof process\b|require\(['"]os['"]\)/.test(fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
        expect(offenders.map((file) => path.relative(path.join(__dirname, '..'), file))).toEqual([]);
    });
});
