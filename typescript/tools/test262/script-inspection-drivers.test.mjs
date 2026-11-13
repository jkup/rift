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

function declarationListPlanExpectation(record) {
  const {unit} = record.plan;
  if (unit.id !== 'G02-let-list') return record;
  assert.equal(unit.text, '"use strict";let x,y;');
  return {plan: {kind: 'complete', goal: 'Script', unit, consumedUnits: 21,
    strictness: {ownStrict: true, inheritedStrict: false, strict: true,
      directives: [{start: 0, end: 12, statementEnd: 13, loc: {line: 1, column: 1}, raw: '"use strict"', useStrict: true}]},
    scopes: [{id: 0, kind: 'script', parent: null, start: 0, end: 21, strict: true,
      formals: [], catchParameter: null, lexicalDeclarations: [0, 1], varDeclarations: [], lexicalNames: ['x', 'y'], varNames: []}],
    declarations: [['x', 17], ['y', 19]].map(([name, start], id) => ({id, kind: 'let',
      site: {name, start, end: start + 1, loc: {line: 1, column: start + 1}},
      scope: 0, variableScope: 0, functionScope: null, initializer: null})), functions: []}, winners: [[]]};
}

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

function blockFunctionPlanExpectation(record) {
  const {unit} = record.plan;
  if (unit.id === 'non-strict-veto') {
    assert.equal(unit.text, 'let x;let x;{function f(){}}');
    const site = start => ({name: 'x', start, end: start + 1, loc: {line: 1, column: start + 1}});
    return {plan: {kind: 'conflict', goal: 'Script', unit, consumedUnits: unit.text.length,
      conflict: {kind: 'duplicate-lexical', scope: 0, first: site(4), second: site(10)},
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate-lexical: x', loc: {line: 1, column: 11}}}, winners: []};
  }
  if (unit.id !== 'L10' && unit.id !== 'block-directive') return record;
  assert.equal(unit.text, unit.id === 'L10' ? '{function f(){}}' : '{"use strict";function f(){}}');
  const start = unit.id === 'L10' ? 1 : 14, end = unit.text.length;
  const strictness = {ownStrict: false, inheritedStrict: false, strict: false, directives: []};
  const scope = {strict: false, formals: [], catchParameter: null, varDeclarations: [], varNames: []};
  return {plan: {kind: 'complete', goal: 'Script', unit, consumedUnits: end, strictness,
    scopes: [
      {...scope, id: 0, kind: 'script', parent: null, start: 0, end, lexicalDeclarations: [], lexicalNames: []},
      {...scope, id: 1, kind: 'block', parent: 0, start: 0, end, lexicalDeclarations: [0], lexicalNames: ['f']},
      {...scope, id: 2, kind: 'function', parent: 1, start: start + 12, end: end - 1, lexicalDeclarations: [], lexicalNames: []},
    ],
    declarations: [{id: 0, kind: 'function', site: {name: 'f', start: start + 9, end: start + 10,
      loc: {line: 1, column: start + 10}}, scope: 1, variableScope: 0, functionScope: 2, initializer: null}],
    functions: [{scope: 2, declaration: 0, start, end: end - 1, strictness}], legacyBlockFunctions: [0]}, winners: [[], [], []]};
}

function semicolonPlanExpectation(record) {
  const {unit} = record.plan;
  if (unit.id !== 'var-no-semicolon') return record;
  assert.equal(unit.text, '"use strict";var x');
  return {plan: {kind: 'complete', goal: 'Script', unit, consumedUnits: 18,
    strictness: {ownStrict: true, inheritedStrict: false, strict: true,
      directives: [{start: 0, end: 12, statementEnd: 13, loc: {line: 1, column: 1}, raw: '"use strict"', useStrict: true}]},
    scopes: [{id: 0, kind: 'script', parent: null, start: 0, end: 18, strict: true,
      formals: [], catchParameter: null, lexicalDeclarations: [], varDeclarations: [0], lexicalNames: [], varNames: ['x']}],
    declarations: [{id: 0, kind: 'var', site: {name: 'x', start: 17, end: 18, loc: {line: 1, column: 18}},
      scope: 0, variableScope: 0, functionScope: null, initializer: null}], functions: []}, winners: [[]]};
}

function objectBindingPlanExpectation(record) {
  const {unit} = record.plan;
  if (unit.id !== 'L08-pattern') return record;
  assert.equal(unit.text, '"use strict";var {x}=o;');
  return {plan: {kind: 'complete', goal: 'Script', unit, consumedUnits: 23,
    strictness: {ownStrict: true, inheritedStrict: false, strict: true,
      directives: [{start: 0, end: 12, statementEnd: 13, loc: {line: 1, column: 1}, raw: '"use strict"', useStrict: true}]},
    scopes: [{id: 0, kind: 'script', parent: null, start: 0, end: 23, strict: true,
      formals: [], catchParameter: null, lexicalDeclarations: [], varDeclarations: [0], lexicalNames: [], varNames: ['x']}],
    declarations: [{id: 0, kind: 'var', site: {name: 'x', start: 18, end: 19, loc: {line: 1, column: 19}},
      scope: 0, variableScope: 0, functionScope: null, initializer: {start: 21, end: 22}}], functions: []}, winners: [[]]};
}

test('Script declarations: 135 plans and 71 historical literals with explicit feature migrations in both hosts', () => {
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
  assert.equal([...expected.values()].filter(record => objectBindingPlanExpectation(record) !== record).length, 1);
  assert.equal([...expected.values()].filter(record => constPlanExpectation(record) !== record).length, 7);
  assert.equal([...expected.values()].filter(record => defaultPlanExpectation(record) !== record).length, 1);
  assert.equal([...expected.values()].filter(record => argumentsPlanExpectation(record) !== record).length, 1);
  assert.equal([...expected.values()].filter(record => semicolonPlanExpectation(record) !== record).length, 1);
  assert.equal([...expected.values()].filter(record => blockFunctionPlanExpectation(record) !== record).length, 3);
  assert.equal([...expected.values()].filter(record => declarationListPlanExpectation(record) !== record).length, 1);
  for (const lane of ['node', 'native']) for (const record of expected.values()) {
    run('script-declarations', lane, record.plan.unit, [], (stdout, label) => {
      const {plan, winners} = JSON.parse(stdout);
      assert.deepEqual({plan, winners}, declarationListPlanExpectation(objectBindingPlanExpectation(semicolonPlanExpectation(blockFunctionPlanExpectation(argumentsPlanExpectation(defaultPlanExpectation(constPlanExpectation(record))))))), label);
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
