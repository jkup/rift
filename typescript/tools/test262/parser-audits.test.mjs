import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {readFileSync} from 'node:fs';
import {createDriverRunner} from './test-support/driver-runner.mjs';
import {rows as returns} from '../../docs/validation/ts-031c-a/cases.mjs';

const {run, save} = createDriverRunner('parser-audits-');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
after(save);

test('return audit: all 36 literal sources, both hosts', () => {
  assert.equal(returns.length, 36);
  for (const lane of ['node', 'native']) for (const [id, text, candidates, loc] of returns) {
    const expected = Array.isArray(candidates)
      ? `complete ${text.length} ${text.length} ${candidates.length}\n` + candidates.map(row => row.join(' ') + '\n').join('')
      : `blocked ${candidates}\n${loc.join(' ')}\n`;
    run('return-audit', lane, {id, text}, [], stdout => assert.equal(stdout, expected, id));
  }
});

for (const [driver, directory, count] of [
  ['script-strict-rule-audit', 'ts-035d1', 62],
  ['script-strict-parameter-audit', 'ts-035d3', 77],
]) test(`${driver}: complete accepted audit outputs, both hosts`, () => {
  const base = `docs/validation/${directory}`;
  const frozen = json(base + '/frozen.json');
  const rows = Array.isArray(frozen) ? frozen : frozen.rows;
  assert.equal(rows.length, count);
  const snapshots = json(base + '/matrix-results.json');
  const expected = new Map();
  for (const snapshot of snapshots) {
    assert.equal(snapshot.status, 0);
    const audit = JSON.parse(snapshot.stdout).audit;
    if (expected.has(snapshot.id)) assert.deepEqual(audit, expected.get(snapshot.id));
    else expected.set(snapshot.id, audit);
  }
  assert.equal(expected.size, count);
  for (const lane of ['node', 'native']) for (const row of rows) {
    const file = row.id === 'R0' ? `test/fixtures/${driver}/a.js` : row.id === 'R1' ? `test/fixtures/${driver}/b.js` : undefined;
    run(driver, lane, {...row, file}, [], (stdout, label) => assert.deepEqual(JSON.parse(stdout).audit, expected.get(row.id), label));
  }
});

for (const [driver, directory, count, variants] of [
  ['script-assignment-target-audit', 'ts-035d5-p', 102, ['a', 'b']],
  ['script-lexical-statement-audit', 'ts-035d7-p', 140, ['alpha', 'beta']],
]) test(`${driver}: full audit literals, both input orders and hosts`, () => {
  const rows = json(`docs/validation/${directory}/semantic-matrix.json`).rows;
  assert.equal(rows.length, count);
  for (const lane of ['node', 'native']) for (const order of [variants, variants.toReversed()]) for (const row of rows) {
    const extra = order.map(name => `test/fixtures/${driver}/${name}.js`);
    run(driver, lane, row, extra, (stdout, label) => assert.deepEqual(JSON.parse(stdout).audit, row.expected, label));
  }
});
