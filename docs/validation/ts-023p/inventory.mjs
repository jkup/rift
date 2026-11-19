// Read-only repository inventory. No imports from or execution of Rift.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative, dirname } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const pattern = /createGuestFunction|kind: ["'](?:guest|builtin)["']|\[object Function\]|name,length,call|const tag =|inherited conversion trace|real inherited method call|retained Function/;
const files = [];
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (/\.(ts|js)$/.test(entry.name)) files.push(path);
  }
}
visit(resolve(root, 'src'));
visit(resolve(root, 'test'));
files.sort();
const lines = ['TS-023P migration inventory at dispatch fec364f; candidates, not automatic edits.'];
for (const path of files) {
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) lines.push(`${relative(root, path).replaceAll('\\', '/')}:${index + 1}: ${line.trim()}`);
  });
}
writeFileSync(resolve(here, 'inventory.txt'), lines.join('\n') + '\n');
console.log(`${files.length} source files inspected; ${lines.length - 1} migration candidates.`);
