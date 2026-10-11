#!/usr/bin/env node
"use strict";

const fs = require('fs');
const { transpile, LuaSyntaxError } = require('./ltranspile.js');

const USAGE = `Usage: lua2js <file.lua | -> [-o out.js] [--format none|esm|cjs] [--no-header] [--quiet]

Translates Lua source to readable JavaScript for migrating a codebase.
Review every "TODO(lua2js)" comment in the output: it marks a construct the
translator could not convert faithfully.`;

function main(argv) {
    const options = { format: 'none' };
    let input = null, output = null, quiet = false;
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '-o' || arg === '--output') output = argv[++i];
        else if (arg === '--format') options.format = argv[++i];
        else if (arg === '--no-header') options.header = false;
        else if (arg === '--quiet') quiet = true;
        else if (arg === '-h' || arg === '--help') { console.log(USAGE); return 0; }
        else if (input === null) input = arg;
        else { console.error(`Unexpected argument '${arg}'\n${USAGE}`); return 2; }
    }
    if (input === null || !['none', 'esm', 'cjs'].includes(options.format)) { console.error(USAGE); return 2; }
    let result;
    try {
        result = transpile(fs.readFileSync(input === '-' ? 0 : input, 'utf8'), options);
    } catch (error) {
        if (!(error instanceof LuaSyntaxError)) throw error;
        console.error(`${input === '-' ? '<stdin>' : input}:${error.message}`);
        return 1;
    }
    if (output) fs.writeFileSync(output, result.code); else process.stdout.write(result.code);
    if (!quiet) {
        for (const w of result.warnings) console.error(`${input}:${w.line}: ${w.message}`);
        if (result.freeGlobals.length) console.error(`Free globals to provide from the host: ${result.freeGlobals.join(', ')}`);
        console.error(`${result.warnings.length} item(s) need review.`);
    }
    return 0;
}

process.exitCode = main(process.argv.slice(2));
