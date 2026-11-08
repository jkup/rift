import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {scratchRoot} from './test-support/environment.mjs';
import {rows as returns} from '../../docs/validation/ts-031c-a/cases.mjs';

const output = mkdtempSync(join(scratchRoot, 'parser-audits-'));
const results = [];
const json = path => JSON.parse(readFileSync(path, 'utf8'));
after(() => writeFileSync(join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n'));

function run(driver, lane, row, extra, check) {
  const file = row.file ?? join(output, results.length + '.js');
  if (row.file) assert.equal(readFileSync(file, 'utf8'), row.text, row.id + ' runtime input');
  else writeFileSync(file, row.text);
  const args = [file, row.id, ...extra];
  const command = lane === 'node' ? process.execPath : `build/native/${driver}${process.platform === 'win32' ? '.exe' : ''}`;
  const childArgs = lane === 'node' ? [`build/node/test/${driver}.js`, ...args] : args;
  const child = spawnSync(command, childArgs, {encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024});
  const label = `${driver}/${lane}/${row.id}`;
  results.push({driver, lane, id: row.id, file, extra, status: child.status, signal: child.signal, error: child.error?.message ?? null});
  try {
    assert.equal(child.error, undefined, label);
    assert.equal(child.signal, null, label);
    assert.equal(child.status, 0, label + ': ' + child.stderr);
    assert.equal(child.stderr, '', label);
    check(child.stdout, label);
  } catch (error) {
    writeFileSync(join(output, `failure-${results.length}.txt`), (child.stdout ?? '') + (child.stderr ?? ''));
    throw error;
  }
}

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
