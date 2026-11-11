import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScriptDriverResult } from './script-driver-result.mjs';
import { composeScriptEnvelope, parseScriptEnvelope } from './script-result.mjs';
import { rows, copy, envelope } from '../../docs/validation/ts-035a/controls.mjs';

test('private-name errors require the exact parse rule at both protocol boundaries', () => {
  const syntax = rows.filter(row => row.id.endsWith('/syntax'));
  assert(syntax.length > 0);
  for (const row of syntax) {
    const child = copy(row.child);
    child.result.ruleCode = 'private-name';
    assert.deepEqual(parseScriptDriverResult(Buffer.from(JSON.stringify(child)), row.binding), child);
    const { classification, ...draft } = envelope(child, row);
    const result = composeScriptEnvelope(JSON.stringify(draft), row.context, row.binding);
    assert.deepEqual(parseScriptEnvelope(JSON.stringify(result), row.binding), result);
    for (const change of [
      { ruleCode: 'private' }, { ruleCode: 'Private-name' }, { ruleCode: 'private-name ' },
      { ruleCode: null }, { phase: 'runtime' }, { phase: 'instantiation' },
    ]) {
      const bad = copy(child);
      Object.assign(bad.result, change);
      assert.throws(() => parseScriptDriverResult(Buffer.from(JSON.stringify(bad)), row.binding));
      assert.throws(() => parseScriptEnvelope(JSON.stringify(envelope(bad, row)), row.binding));
    }
  }
});
