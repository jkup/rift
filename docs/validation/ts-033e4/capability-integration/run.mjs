import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { probeVerdict } from '../../../../tools/probe-verdict.mjs';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const prefix = 'docs/validation/ts-033e4/capability-integration/';
const output = join(root, 'build/ts-033e4-capability-integration');
mkdirSync(output, { recursive: true });
const compiler = join(root, 'node_modules/scriptc/bin/scriptc.exe');
const nodeOut = join(output, 'node'), binary = join(output, 'combined.exe'), source = prefix + 'combined.ts';
function run(command, args) {
    const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
    return { command, args, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
const rows = { typecheck: run(process.execPath, ['node_modules/typescript/bin/tsc', '--ignoreConfig', '--strict', '--target', 'ES2024', '--module', 'nodenext', '--types', 'node', '--rootDir', root, '--outDir', nodeOut, source]) };
if (rows.typecheck.status === 0) {
    rows.build = run(compiler, ['build', source, '--tier', 'static-only', '-o', binary]);
    rows.coverage = run(compiler, ['coverage', source, '--explain-dynamic']);
    for (const input of ['seed', 'other']) {
        rows[input] = { node: run(process.execPath, [join(nodeOut, prefix, 'combined.js'), prefix + input + '.txt']) };
        if (rows.build.status === 0) rows[input].native = run(binary, [prefix + input + '.txt']);
    }
}
let sequence = 1;
while (existsSync(new URL(`run-${sequence}.json`, import.meta.url))) sequence++;
writeFileSync(new URL(`run-${sequence}.json`, import.meta.url), JSON.stringify(rows, null, 2) + '\n');
assert.equal(rows.typecheck.status, 0, rows.typecheck.stdout + rows.typecheck.stderr);
for (const [input, property, amount] of [['seed', 'alpha', 7], ['other', 'beta', 11]]) {
    const r = { ...rows[input], build: rows.build, coverage: rows.coverage };
    assert.equal(probeVerdict(r), 'PASS', JSON.stringify(r));
    const expected = `PASS ${property} captured owner two sessions normal guest identity effects=${amount}\nPASS cleanup host identity call-depth limits retained unit A=6/10/78 B=1/1/8 leaf=5 guest=1 host=2\nPASS profile-first exact errors tuple neighbors replay direct denial production closed\nPASS guest code-root unwind snapshot isolation final A=6/11/86 productionRaw=0\n`;
    for (const lane of ['node', 'native']) {
        assert.equal(r[lane].stdout, expected); assert.equal(r[lane].stderr, '');
        assert.equal(r[lane].error, null); assert.equal(r[lane].signal, null);
    }
}
console.log(`PASS two literal inputs Node/native, strict types, static-only and separate zero-dynamic coverage; run-${sequence}.json`);
