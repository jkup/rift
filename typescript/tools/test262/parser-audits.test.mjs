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
  if (driver === 'script-strict-rule-audit') {
    const row = rows.find(row => row.id === 'X02');
    assert.equal(row.text, '"use strict"; {function f(){} function f(){}} `tail`;');
    expected.set(row.id, {kind: 'eligible', sourceUnits: 53, consumedUnits: 53, candidates: [{
      ruleCode: 'duplicate-block-lexical-function', scopeStart: 14, scopeEnd: 45,
      first: {name: 'f', start: 24, end: 25, loc: {line: 1, column: 25}},
      second: {name: 'f', start: 39, end: 40, loc: {line: 1, column: 40}},
    }]});
  }
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
  if (driver === 'script-assignment-target-audit') {
    const exponent = rows.find(row => row.id === 'G0');
    assert.equal(exponent.text, '1e2=7;');
    exponent.expected = {kind: 'eligible', sourceUnits: 6, consumedUnits: 6, candidates: [{
      ruleCode: 'assignment-target',
      target: {text: '1e2', start: 0, end: 3, loc: {line: 1, column: 1}},
      operator: {text: '=', start: 3, end: 4, loc: {line: 1, column: 4}},
    }]};
    const prefix = rows.find(row => row.id === 'U14');
    assert.equal(prefix.text, '++42;');
    prefix.expected = {
      kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'invalid update target', loc: {line: 1, column: 1}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.assignment-target'},
    };
    const template = rows.find(row => row.id === 'G6');
    assert.equal(template.text, '42=7;`late`;');
    template.expected = {kind: 'eligible', sourceUnits: 12, consumedUnits: 12, candidates: [{
      ruleCode: 'assignment-target',
      target: {text: '42', start: 0, end: 2, loc: {line: 1, column: 1}},
      operator: {text: '=', start: 2, end: 3, loc: {line: 1, column: 3}},
    }]};
  }
  if (driver === 'script-lexical-statement-audit') {
    const loop = rows.find(row => row.id === 'excluded-do');
    assert.equal(loop.text, 'do let x; while(false);');
    loop.expected = {kind: 'eligible', sourceUnits: 23, consumedUnits: 23, candidates: [{
      ruleCode: 'lexical-declaration-statement', context: 'do-while-body',
      keyword: {text: 'let', start: 3, end: 6, loc: {line: 1, column: 4}},
    }]};
    for (const [id, text, start] of [
      ['mixed-template-false-false', 'while(false) let x; `x`;', 13],
      ['mixed-template-false-true', '`x`; while(false) let x;', 18],
      ['mixed-template-true-false', '"use strict"; while(false) let x; `x`;', 27],
      ['mixed-template-true-true', '"use strict"; `x`; while(false) let x;', 32],
    ]) {
      const row = rows.find(row => row.id === id);
      assert.equal(row.text, text);
      row.expected = {kind: 'eligible', sourceUnits: text.length, consumedUnits: text.length, candidates: [{
        ruleCode: 'lexical-declaration-statement', context: 'while-body',
        keyword: {text: 'let', start, end: start + 3, loc: {line: 1, column: start + 1}},
      }]};
    }
  }
  for (const lane of ['node', 'native']) for (const order of [variants, variants.toReversed()]) for (const row of rows) {
    const extra = order.map(name => `test/fixtures/${driver}/${name}.js`);
    run(driver, lane, row, extra, (stdout, label) => assert.deepEqual(JSON.parse(stdout).audit, row.expected, label));
  }
});
