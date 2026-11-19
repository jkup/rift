// Documentation inventory only: no guest execution or production-file writes.
// Run from typescript/: node docs/validation/ts-031b-p/audit.mjs
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
const base = 'a87e86c';
const protectedPaths = ['src', 'test', 'tools', 'probes', 'package.json', 'package-lock.json', 'tsconfig.json'];
const changed = git(['diff', base, '--name-only', '--', ...protectedPaths]);
if (changed) throw new Error('Protected paths changed: ' + changed);
const files = git(['ls-files', '--', ...protectedPaths]).split('\n').filter(Boolean);
const fileHashes = files.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }));
const sourceSites = [];
for (const path of files.filter(p => p.startsWith('src/'))) {
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, index) => {
    if (/failure\(|throw new|diagnostic:|\bfail\(/.test(line)) sourceSites.push({ path, line: index + 1, source: line.trim() });
  });
}
if (sourceSites.length !== 95) throw new Error('Construction inventory changed');
const manualThrows = [];
for (const path of files.filter(p => p.startsWith('test/') && p.endsWith('.ts'))) {
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, index) => {
    if (/type: "throw"/.test(line)) manualThrows.push({ path, line: index + 1 });
  });
}
if (manualThrows.length !== 10) throw new Error('Manual throw inventory changed');
const matrix = readFileSync('docs/validation/ts-031b-p/matrix.md', 'utf8');
const ids = [...matrix.matchAll(/^\| ([PRTCV]\d+) \|/gm)].map(m => m[1]);
const groups = { P: 42, R: 38, T: 32, C: 8, V: 4 };
for (const [group, count] of Object.entries(groups)) {
  const expected = Array.from({ length: count }, (_, i) => group + String(i + 1).padStart(2, '0'));
  if (JSON.stringify(ids.filter(id => id.startsWith(group))) !== JSON.stringify(expected)) throw new Error('Matrix gap: ' + group);
}
if (new Set(ids).size !== 124) throw new Error('Duplicate/missing matrix rows');
for (const file of ['docs/structured-engine-outcomes.md', 'docs/validation/ts-031b-p/README.md', 'docs/validation/ts-031b-p/matrix.md']) {
  for (const match of readFileSync(file, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(match[1])) continue;
    if (!existsSync(resolve(dirname(file), match[1].split('#')[0]))) throw new Error('Broken link: ' + match[1]);
  }
}
console.log(JSON.stringify({ base, protectedFilesUnchanged: files.length, matrixRows: ids.length,
  constructionSites: sourceSites, manualThrows, fileHashes }, null, 2));
