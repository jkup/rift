// Documentation consistency only; does not execute guest source or the runtime.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url));
const inventory = resolve(here, 'inventory.txt');
execFileSync(process.execPath, [resolve(here, 'inventory.mjs')]);
const first = readFileSync(inventory, 'utf8');
execFileSync(process.execPath, [resolve(here, 'inventory.mjs')]);
if (first !== readFileSync(inventory, 'utf8')) throw new Error('inventory drift');
if (!first.startsWith('133 files inspected; 131 candidate lines.\n')) throw new Error('candidate count drift');
const matrix = readFileSync(resolve(here, 'matrix.md'), 'utf8');
const ids = [...matrix.matchAll(/^\| ([VEKFRC])(\d+) /gm)].map(m => m[1] + m[2]);
const expected = Object.entries({ V: 36, E: 38, K: 20, F: 12, R: 30, C: 10 })
    .flatMap(([prefix, count]) => Array.from({ length: count }, (_, i) => prefix + (i + 1)));
if (JSON.stringify(ids) !== JSON.stringify(expected)) throw new Error('missing, repeated or unordered row ID');
for (const file of ['README.md', 'matrix.md', '../../property-assignment.md']) {
    const path = resolve(here, file);
    for (const match of readFileSync(path, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
        const link = match[1];
        if (!link.startsWith('https:') && !existsSync(resolve(dirname(path), link.split('#')[0]))) {
            throw new Error('missing local link: ' + link);
        }
    }
}
console.log('PASS: repeatable 133-file/131-candidate inventory; 146 unique contiguous matrix rows; local document links');
