// Read-only candidate inventory. Host TypeScript arithmetic is deliberately
// included; the migration ledger classifies actual guest-source rejections.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const files = [];
function visit(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
        const relative = directory + '/' + entry.name;
        if (entry.isDirectory()) visit(relative);
        else if (/\.(ts|js|mjs|json)$/.test(relative)) files.push(relative);
    }
}
visit('src');
visit('test');
for (const name of fs.readdirSync(path.join(root, 'tools'))) {
    if (name.endsWith('.mjs')) files.push('tools/' + name);
}
files.push('docs/feature-inventory.md', 'docs/architecture-decisions.md');
const rows = [];
for (const file of files.sort()) {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
        if (/[+\-*/%]=|compound|assignment operator/i.test(line)) rows.push(`${file}:${index + 1}: ${line.trim()}`);
    });
}
console.log(`${files.length} files; ${rows.length} candidate lines`);
console.log(rows.join('\n'));
