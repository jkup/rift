import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../../../../', import.meta.url));
const checks = [];
for (const [name, args] of [['typecheck', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']], ['runner', ['--test', 'tools/probe-verdict.test.mjs']]]) {
    const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120000 });
    checks.push({ name, command: process.execPath, args, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout ?? '', stderr: r.stderr ?? '' });
}
writeFileSync(new URL('checks.json', import.meta.url), JSON.stringify(checks, null, 2) + '\n');
for (const row of checks) { assert.equal(row.status, 0, row.stdout + row.stderr); assert.equal(row.error, null); assert.equal(row.signal, null); }
console.log('PASS repository typecheck and unchanged runner regression tests');
