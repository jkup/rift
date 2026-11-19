import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '../../..'), results = [];
try {
    for (const lane of ['node', 'native']) for (const [file, expected] of [['a', 'caller|7|left'], ['b', 'arguments|11|right']]) {
        const input = `fixtures/script-restricted-properties/${file}.txt`;
        const r = spawnSync(lane === 'node' ? process.execPath : join(root, 'build/native/script-restricted-properties.exe'),
            lane === 'node' ? ['build/node/test/script-restricted-properties.js', input] : [input],
            { cwd: root, encoding: 'utf8', timeout: 30000 });
        results.push({ lane, input, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr });
        assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(r.signal, null); assert.equal(r.error, undefined);
        assert.equal(r.stdout, `R29 PASS\nR30 dispatch projection PASS ${expected}\nR31 PASS\nR32 PASS\nR35 guarded invocation PASS\n`); assert.equal(r.stderr, '');
        console.log(`${lane} ${expected}: accessor controls PASS`);
    }
} finally { writeFileSync(join(import.meta.dirname, 'restricted-results.json'), JSON.stringify(results, null, 2) + '\n'); }
