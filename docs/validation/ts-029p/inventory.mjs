// Textual candidate audit, not guest execution or semantic completeness proof.
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
        if (/property base must be an object|property is not writable|putValue\(|internalSet\(|writeOnly|primitive.*(write|assignment)|write.*primitive|object-only|W6\/W7|W13|W14|W15|primitive-reads-write|direct read once per consumption|^\s+set\(|super\.set\(/i.test(line)) {
            hits.push(`${relative(root, path).replaceAll('\\', '/')}:${i + 1}:${line}`);
        }
    });
}
const output = `${inputs.length} files inspected; ${hits.length} candidate lines.\n${hits.join('\n')}\n`;
writeFileSync(resolve(here, 'inventory.txt'), output);
console.log(output.split('\n')[0]);
