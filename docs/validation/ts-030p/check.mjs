import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const here = fileURLToPath(new URL('.', import.meta.url));
const normalize = text => text.replaceAll('\r\n', '\n');
const inventory = execFileSync(process.execPath, [path.join(here, 'inventory.mjs')], { encoding: 'utf8' });
if (normalize(inventory) !== normalize(fs.readFileSync(path.join(here, 'inventory.txt'), 'utf8'))) throw Error('inventory drift');
const matrix = fs.readFileSync(path.join(here, 'matrix.md'), 'utf8');
const expected = { V: 32, E: 34, W: 25, P: 25, L: 10, R: 40, C: 12 };
for (const [prefix, count] of Object.entries(expected)) {
    const ids = [...matrix.matchAll(new RegExp('^\\| (' + prefix + '\\d+) ', 'gm'))].map(match => match[1]);
    if (ids.length !== count || ids.some((id, i) => id !== prefix + (i + 1))) throw Error('row IDs ' + prefix);
}
for (const file of ['README.md', 'matrix.md', '../../compound-assignment.md']) {
    const absolute = path.resolve(here, file);
    const text = fs.readFileSync(absolute, 'utf8');
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
        if (!match[1].startsWith('https:') && !fs.existsSync(path.resolve(path.dirname(absolute), match[1]))) throw Error('link ' + match[1]);
    }
}
console.log('PASS: stable inventory; 178 unique contiguous matrix rows plus explicit variants; local links');
