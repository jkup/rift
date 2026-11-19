import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '../../..'), results = [];
try {
    for (const lane of ['node', 'native']) for (const [file, expected] of [['a', 'seed|7'], ['b', 'other|11']]) {
        const input = `fixtures/property-accessors/${file}.txt`;
        const r = spawnSync(lane === 'node' ? process.execPath : join(root, 'build/native/property-accessors.exe'),
            lane === 'node' ? ['build/node/test/property-accessors.js', input] : [input],
            { cwd: root, encoding: 'utf8', timeout: 30000 });
        results.push({ lane, input, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr });
        assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(r.signal, null); assert.equal(r.error, undefined);
        assert.equal(r.stdout, `R01-R28 R33-R34 PASS ${expected}\n`); assert.equal(r.stderr, '');
        console.log(`${lane} ${expected}: accessor controls PASS`);
    }
} finally { writeFileSync(join(import.meta.dirname, 'host-results.json'), JSON.stringify(results, null, 2) + '\n'); }
