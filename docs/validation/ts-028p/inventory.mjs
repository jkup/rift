// Candidate audit only: no guest execution, compilation or runtime modification.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
function files(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = resolve(dir, entry.name);
        return entry.isDirectory() ? files(path) : /\.(ts|js|mjs|json)$/.test(path) ? [path] : [];
    });
}
const inputs = [...files(resolve(root, 'src')), ...files(resolve(root, 'test')),
    ...readdirSync(resolve(root, 'tools')).filter(x => x.endsWith('.mjs')).map(x => resolve(root, 'tools', x)),
    resolve(root, 'docs/feature-inventory.md'), resolve(root, 'docs/architecture-decisions.md')].sort();
const hits = [];
for (const path of inputs) {
    readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/property base must be an object|primitiveMember|implicitMember|primitive.*(read|write|member)|getValue\(|putValue\(|invalidBase|BooleanBase|NumberBase|StringBase|SymbolBase/.test(line)) {
            hits.push(`${relative(root, path).replaceAll('\\', '/')}:${i + 1}:${line}`);
        }
    });
}
const output = `${inputs.length} files inspected; ${hits.length} candidate lines.\n${hits.join('\n')}\n`;
writeFileSync(resolve(here, 'inventory.txt'), output);
console.log(output.split('\n')[0]);
