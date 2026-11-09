import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {readFileSync} from 'node:fs';
import {createDriverRunner} from './test-support/driver-runner.mjs';
import {constPlanExpectation} from './test-support/const-plan-migrations.mjs';

const {run, save} = createDriverRunner('script-inspection-');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
after(save);

test('Script metadata: 136 accepted snapshots and detached source invariants in both hosts', () => {
  const node = json('docs/validation/ts-033a/metadata-node.json');
  const native = json('docs/validation/ts-033a/metadata-native.json');
  assert.equal(node.length, 136);
  assert.equal(native.length, 136);
  for (const snapshot of node) {
    const expected = JSON.parse(snapshot.stdout).metadata;
    const other = native.find(row => row.id === snapshot.id);
    assert.equal(snapshot.status, 0);
    assert.equal(other.status, 0);
    assert.deepEqual(JSON.parse(other.stdout).metadata, expected);
    for (const lane of ['node', 'native']) {
      run('script-metadata', lane, expected.unit, ['summary'], (stdout, label) =>
        assert.deepEqual(JSON.parse(stdout).metadata, expected, label));
    }
  }
});

function defaultPlanExpectation(record) {
  const {unit} = record.plan;
  if (unit.id !== 'L08-default') return record;
  assert.equal(unit.text, '"use strict";function f(a=1){}');
  const scope = {strict: true, catchParameter: null, lexicalDeclarations: [], lexicalNames: []};
  return {plan: {kind: 'complete', goal: 'Script', unit, consumedUnits: 30,
    strictness: {ownStrict: true, inheritedStrict: false, strict: true,
      directives: [{start: 0, end: 12, statementEnd: 13, loc: {line: 1, column: 1}, raw: '"use strict"', useStrict: true}]},
    scopes: [
      {...scope, id: 0, kind: 'script', parent: null, start: 0, end: 30,
        formals: [], varDeclarations: [0], varNames: ['f']},
      {...scope, id: 1, kind: 'function', parent: 0, start: 13, end: 30,
        formals: [{name: 'a', start: 24, end: 25, loc: {line: 1, column: 25}}], varDeclarations: [], varNames: []},
    ],
    declarations: [{id: 0, kind: 'function', site: {name: 'f', start: 22, end: 23, loc: {line: 1, column: 23}},
      scope: 0, variableScope: 0, functionScope: 1, initializer: null}],
    functions: [{scope: 1, declaration: 0, start: 13, end: 30,
      strictness: {ownStrict: false, inheritedStrict: true, strict: true, directives: []}}]}, winners: [[0], []]};
}

function argumentsPlanExpectation(record) {
  const {unit} = record.plan;
  if (unit.id !== 'reserved') return record;
  assert.equal(unit.text, '"use strict";var arguments;');
  return {plan: {kind: 'blocked', goal: 'Script', unit,
    rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.binding-identifier'},
    diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'arguments binding or assignment in strict code',
      loc: {line: 1, column: 18}}}, winners: []};
}

test('Script declarations: 135 plans, 71 historical literals, seven const and one default migration in both hosts', () => {
  const snapshots = json('docs/validation/ts-034h6-c/replays/plans-results.json');
  const literals = json('fixtures/script-declarations/literal.json');
  assert.equal(literals.length, 71);
  const expected = new Map();
  for (const snapshot of snapshots) {
    assert.equal(snapshot.status, 0);
    const {plan, winners} = JSON.parse(snapshot.stdout);
    const record = {plan, winners};
    if (expected.has(snapshot.id)) assert.deepEqual(record, expected.get(snapshot.id));
    else expected.set(snapshot.id, record);
  }
  assert.equal(expected.size, 135);
  for (const row of literals) {
    const snapshot = expected.get(row.id);
    assert.equal(snapshot.plan.unit.text, row.text);
    if (row.expected) {
      const {unit, ...plan} = snapshot.plan;
      // H1 added catchParameter to all scopes; its accepted replay projects null
      // onto the original non-catch literals without changing the old fixtures.
      const literal = {...row.expected, scopes: row.expected.scopes.map(scope => ({...scope, catchParameter: null}))};
      assert.deepEqual(plan, literal, row.id + ' literal plan');
      assert.deepEqual(snapshot.winners[0], row.winners, row.id + ' literal winners');
    }
  }
  assert.equal([...expected.values()].filter(record => constPlanExpectation(record) !== record).length, 7);
  assert.equal([...expected.values()].filter(record => defaultPlanExpectation(record) !== record).length, 1);
  assert.equal([...expected.values()].filter(record => argumentsPlanExpectation(record) !== record).length, 1);
  for (const lane of ['node', 'native']) for (const record of expected.values()) {
    run('script-declarations', lane, record.plan.unit, [], (stdout, label) => {
      const {plan, winners} = JSON.parse(stdout);
      assert.deepEqual({plan, winners}, argumentsPlanExpectation(defaultPlanExpectation(constPlanExpectation(record))), label);
    });
  }
});

test('Script serializer: all 154 frozen ASCII records from both runtime inputs and hosts', () => {
  const rows = json('test/fixtures/script-observation-serialization/frozen.json');
  assert.equal(rows.length, 154);
  for (const input of ['alpha', 'beta']) {
    const selected = rows.filter(row => row.id.startsWith(input + '/'));
    assert.equal(selected.length, 77);
    for (const lane of ['node', 'native']) {
      run('script-observation-serialization', lane,
        {id: input, text: input, file: `test/fixtures/script-observation-serialization/${input}.txt`}, [], (stdout, label) => {
          assert.equal(stdout, selected.map(row => row.ascii + '\n').join(''), label);
          assert.equal(/[^\x00-\x7f]/.test(stdout), false, label + ' ASCII');
          assert.deepEqual(stdout.trimEnd().split('\n').map(line => JSON.parse(line)), selected.map(row => row.child), label);
        });
    }
  }
});
