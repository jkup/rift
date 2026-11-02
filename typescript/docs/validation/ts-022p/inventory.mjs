// Read-only source inventory; not a compiler probe or runtime semantic test.
// Run from any directory. Output is retained beside this script.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative, dirname } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const patterns = /\[object Array\]|arrayPrototype|missing methods|initial keys|original root keys|inherited default|inherited conversion trace|const tag =|for \(const source of|bothObjects|nullRoot/;
const files = [];
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (/\.(ts|js)$/.test(entry.name)) files.push(path);
  }
}
visit(resolve(root, 'test'));
files.sort();
const lines = ['TS-022P source inventory; matches are review candidates, not automatic migrations.'];
for (const path of files) {
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, index) => {
    if (patterns.test(line)) lines.push(`${relative(root, path).replaceAll('\\', '/')}:${index + 1}: ${line.trim()}`);
  });
}
writeFileSync(resolve(here, 'inventory.txt'), lines.join('\n') + '\n');
console.log(`Inventoried ${files.length} test source files; ${lines.length - 1} candidate lines.`);
