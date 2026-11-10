import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDriverResult } from './driver-result.mjs';
import { parseScriptDriverResult } from './script-driver-result.mjs';
import { parseScriptEnvelope } from './script-result.mjs';
import { synthetic, thrown } from './fixtures.mjs';

test('BigInt throws retain primitive identity in both observation protocols', () => {
    const observation = thrown(null, 'bigint');
    const record = synthetic({ observation, body: true });
    assert.equal(record.observation.valueKind, 'bigint');
    const binding = { nonce: 'bigint', mode: 'body-observation', unit: 'test/synthetic.js' };
    const child = { driverVersion: 1, ...binding, stage: 'test', bodyEvaluated: true, location: { line: 1, column: 1 }, observation };
    assert.deepEqual(parseDriverResult(Buffer.from(JSON.stringify(child)), binding), child);
    const rows = JSON.parse(readFileSync(new URL('../../test/fixtures/script-observation-serialization/frozen.json', import.meta.url)));
    const original = rows.find(row => row.child.result.kind === 'throw' && row.child.result.original.valueKind === 'undefined');
    assert(original);
    const current = structuredClone(original);
    current.child.result.original.valueKind = 'bigint';
    current.envelope.observation.original.valueKind = 'bigint';
    assert.deepEqual(parseScriptDriverResult(Buffer.from(JSON.stringify(current.child)), current.binding), current.child);
    assert.deepEqual(parseScriptEnvelope(JSON.stringify(current.envelope), current.binding), current.envelope);
    for (const valueKind of ['BigInt', 'bigint ', 'integer', null]) {
        const bad = structuredClone(current);
        bad.child.result.original.valueKind = valueKind;
        bad.envelope.observation.original.valueKind = valueKind;
        assert.throws(() => parseScriptDriverResult(Buffer.from(JSON.stringify(bad.child)), bad.binding));
        assert.throws(() => parseScriptEnvelope(JSON.stringify(bad.envelope), bad.binding));
    }
    current.child.result.constructor = { outcome: 'available', name: 'BigInt', realmId: 'test', secondary: null };
    assert.throws(() => parseScriptDriverResult(Buffer.from(JSON.stringify(current.child)), current.binding));
});
