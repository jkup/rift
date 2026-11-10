import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScriptDriverResult } from './script-driver-result.mjs';
import { composeScriptEnvelope, parseScriptEnvelope } from './script-result.mjs';
import { rows as frozenRows, copy, envelope } from '../../docs/validation/ts-035a/controls.mjs';

const rows = frozenRows.filter(row => row.id.endsWith('/syntax'));
function accepted(child, row) {
  assert.deepEqual(parseScriptDriverResult(Buffer.from(JSON.stringify(child)), row.binding), child);
  const { classification, ...draft } = envelope(child, row);
  const value = composeScriptEnvelope(JSON.stringify(draft), row.context, row.binding);
  assert.deepEqual(parseScriptEnvelope(JSON.stringify(value), row.binding), value);
}
function rejected(child, row) {
  assert.throws(() => parseScriptDriverResult(Buffer.from(JSON.stringify(child)), row.binding));
  assert.throws(() => parseScriptEnvelope(JSON.stringify(envelope(child, row)), row.binding));
}
test('RegExp literal early errors require the exact parse rule in both codecs', () => {
  assert(rows.length > 0);
  for (const row of rows) {
    const child = copy(row.child);
    child.result.ruleCode = 'regexp-literal';
    accepted(child, row);
    for (const ruleCode of ['regexp', 'RegExp-literal', 'regexp-literal ', 'regexp-pattern', null]) {
      const bad = copy(child); bad.result.ruleCode = ruleCode; rejected(bad, row);
    }
    for (const phase of ['runtime', 'instantiation']) {
      const bad = copy(child); bad.result.phase = phase; rejected(bad, row);
    }
  }
});
test('RegExp syntax limitations remain separate from certified literal errors', () => {
  for (const row of rows) {
    for (const capabilityCode of ['lex.regexp-literal', 'parse.regexp-pattern']) {
      const child = copy(row.child);
      child.result = { kind: 'unsupported-syntax', capabilityCode };
      accepted(child, row);
      const bad = copy(child); bad.result.kind = 'syntax-error'; rejected(bad, row);
    }
    const child = copy(row.child);
    child.result = { kind: 'unsupported-syntax', capabilityCode: 'parse.regexp-patterns' };
    rejected(child, row);
  }
});
