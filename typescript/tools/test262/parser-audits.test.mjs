import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {readFileSync} from 'node:fs';
import {createDriverRunner} from './test-support/driver-runner.mjs';
import {rows as returns} from '../../docs/validation/ts-031c-a/cases.mjs';

const {run, save} = createDriverRunner('parser-audits-');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
after(save);

function duplicateSloppyFunction(text) {
  return {kind: 'blocked', reason: 'scope-restriction',
    diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate sloppy block functions are unsupported',
      loc: {line: 1, column: text.lastIndexOf('function') + 10}},
    rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.declaration-statement'}};
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
  if (driver === 'script-strict-rule-audit') {
    const row = rows.find(row => row.id === 'X03');
    assert.equal(row.text, '"use strict"; {function f(){} function f(){}} function g(){/x/;}');
    expected.set(row.id, {kind: 'eligible', sourceUnits: 64, consumedUnits: 64, candidates: [{
      ruleCode: 'duplicate-block-lexical-function', scopeStart: 14, scopeEnd: 45,
      first: {name: 'f', start: 24, end: 25, loc: {line: 1, column: 25}},
      second: {name: 'f', start: 39, end: 40, loc: {line: 1, column: 40}},
    }]});
  } else {
    const row = rows.find(row => row.id === 'E07');
    assert.equal(row.text, 'function f(a,a){"use strict";} function g(){/x/;}');
    expected.set(row.id, {kind: 'eligible', sourceUnits: 49, consumedUnits: 49, candidates: [{
      ruleCode: 'duplicate-strict-parameter', functionStart: 0, functionEnd: 30,
      first: {name: 'a', start: 11, end: 12, loc: {line: 1, column: 12}},
      second: {name: 'a', start: 13, end: 14, loc: {line: 1, column: 14}},
    }]});
  }
  if (driver === 'script-strict-parameter-audit') for (const [id, text, column] of [
    ['E08', 'function f(a,a,eval){"use strict";}', 16],
    ['E48', 'function f(a,a,b,eval){"use strict";}', 18],
  ]) {
    assert.equal(rows.find(row => row.id === id).text, text);
    expected.set(id, {kind: 'blocked', reason: 'scope-restriction',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'eval binding or assignment in strict code', loc: {line: 1, column}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.binding-identifier'},
    });
  }
  const duplicateDefault = rows.find(row => row.id === 'P10');
  assert.equal(duplicateDefault.text, '"use strict"; function f(a=1,a){}');
  expected.set(duplicateDefault.id, {
    kind: 'blocked', reason: 'grammar-or-resource',
    diagnostic: {phase: 'parse', name: 'SyntaxError',
      message: 'duplicate default parameter list',
      loc: {line: 1, column: 15}},
    rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'},
  });
  const duplicateRest = rows.find(row => row.id === 'P11');
  assert.equal(duplicateRest.text, '"use strict"; function f(a,...a){}');
  expected.set(duplicateRest.id, {
    kind: 'blocked', reason: 'grammar-or-resource',
    diagnostic: {phase: 'parse', name: 'SyntaxError',
      message: 'duplicate rest parameter list',
      loc: {line: 1, column: 15}},
    rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'},
  });
  if (driver === 'script-strict-rule-audit') {
    const implicit = rows.find(row => row.id === 'D06');
    assert.equal(implicit.text, '"use strict"\n{function f(){} function f(){}}');
    expected.set(implicit.id, {kind: 'eligible', sourceUnits: 44, consumedUnits: 44, candidates: [{
      ruleCode: 'duplicate-block-lexical-function', scopeStart: 13, scopeEnd: 44,
      first: {name: 'f', start: 23, end: 24, loc: {line: 2, column: 11}},
      second: {name: 'f', start: 38, end: 39, loc: {line: 2, column: 26}},
    }]});
    for (const [id, text] of [
      ['B03', '{function f(){} function f(){}}'],
      ['B04', '{"use strict"; function f(){} function f(){}}'],
      ['D02', '("use strict"); {function f(){} function f(){}}'],
      ['D03', '0; "use strict"; {function f(){} function f(){}}'],
      ['D04', '; "use strict"; {function f(){} function f(){}}'],
    ]) {
      assert.equal(rows.find(row => row.id === id).text, text);
      expected.set(id, duplicateSloppyFunction(text));
    }
    const row = rows.find(row => row.id === 'X02');
    assert.equal(row.text, '"use strict"; {function f(){} function f(){}} `tail`;');
    expected.set(row.id, {kind: 'eligible', sourceUnits: 53, consumedUnits: 53, candidates: [{
      ruleCode: 'duplicate-block-lexical-function', scopeStart: 14, scopeEnd: 45,
      first: {name: 'f', start: 24, end: 25, loc: {line: 1, column: 25}},
      second: {name: 'f', start: 39, end: 40, loc: {line: 1, column: 40}},
    }]});
    const escaped = rows.find(row => row.id === 'D05');
    assert.equal(escaped.text, '"use\\x20strict"; {function f(){} function f(){}}');
    expected.set(escaped.id, {
      kind: 'blocked', reason: 'scope-restriction',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate sloppy block functions are unsupported', loc: {line: 1, column: 43}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.declaration-statement'},
    });
  }
  if (driver === 'script-strict-parameter-audit') {
    const implicit = rows.find(row => row.id === 'E22');
    assert.equal(implicit.text, 'function f(a,a){"use strict"\n}');
    expected.set(implicit.id, {kind: 'eligible', sourceUnits: 30, consumedUnits: 30, candidates: [{
      ruleCode: 'duplicate-strict-parameter', functionStart: 0, functionEnd: 30,
      first: {name: 'a', start: 11, end: 12, loc: {line: 1, column: 12}},
      second: {name: 'a', start: 13, end: 14, loc: {line: 1, column: 14}},
    }]});
    const block = rows.find(row => row.id === 'E27');
    assert.equal(block.text, 'function f(a,a){"use strict";} {function g(){}}');
    expected.set(block.id, {kind: 'eligible', sourceUnits: 47, consumedUnits: 47, candidates: [{
      ruleCode: 'duplicate-strict-parameter', functionStart: 0, functionEnd: 30,
      first: {name: 'a', start: 11, end: 12, loc: {line: 1, column: 12}},
      second: {name: 'a', start: 13, end: 14, loc: {line: 1, column: 14}},
    }]});
    const defaultBody = rows.find(row => row.id === 'E10');
    assert.equal(defaultBody.text, 'function f(a,a=1){"use strict";}');
    expected.set(defaultBody.id, {
      kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate default parameter list', loc: {line: 1, column: 1}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'},
    });
    const pattern = rows.find(row => row.id === 'E38');
    assert.equal(pattern.text, 'function f({a},a){"use strict";}');
    expected.set(pattern.id, {
      kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate default parameter list', loc: {line: 1, column: 1}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'},
    });
    const arrow = rows.find(row => row.id === 'E39');
    assert.equal(arrow.text, 'let f=(a,a)=>a;');
    expected.set(arrow.id, {
      kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate arrow parameter: a', loc: {line: 1, column: 7}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'},
    });
    const row = rows.find(row => row.id === 'E40');
    assert.equal(row.text, 'let f={m(a,a){"use strict";}};');
    expected.set(row.id, {
      kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate method parameter', loc: {line: 1, column: 8}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'},
    });
  }
  if (driver === 'script-strict-rule-audit') {
    const row = rows.find(row => row.id === 'X01');
    assert.equal(row.text, '"use strict"; {function f(){} function f(){}} class C {}');
    expected.set(row.id, {kind: 'eligible', sourceUnits: 56, consumedUnits: 56, candidates: [{
      ruleCode: 'duplicate-block-lexical-function', scopeStart: 14, scopeEnd: 45,
      first: {name: 'f', start: 24, end: 25, loc: {line: 1, column: 25}},
      second: {name: 'f', start: 39, end: 40, loc: {line: 1, column: 40}},
    }]});
  } else for (const [id, text, start, end, first] of [
    ['P12', '"use strict"; function f(a,a){} function g(){class C {}}', 14, 31, 25],
    ['E01', 'function f(a,a){"use strict";} class C {}', 0, 30, 11],
    ['E11', 'function f(a,a){"use strict"; function g(){class C {}}}', 0, null, 11],
  ]) {
    assert.equal(rows.find(row => row.id === id).text, text);
    expected.set(id, {kind: 'eligible', sourceUnits: text.length, consumedUnits: text.length, candidates: [{
      ruleCode: 'duplicate-strict-parameter', functionStart: start, functionEnd: end ?? text.length,
      first: {name: 'a', start: first, end: first + 1, loc: {line: 1, column: first + 1}},
      second: {name: 'a', start: first + 2, end: first + 3, loc: {line: 1, column: first + 3}},
    }]});
  }
  for (const [id, text] of [
    ['P04', 'function f(a,a){}'], ['P06', 'function f(a,a){("use strict");}'],
    ['P07', 'function f(a,a){0; "use strict";}'], ['P09', 'function f(a,a){"use\\x20strict";}'],
  ]) {
    assert.equal(rows.find(row => row.id === id).text, text);
    expected.set(id, {kind: 'none', sourceUnits: text.length, consumedUnits: text.length});
  }
  if (driver === 'script-strict-rule-audit') {
    for (const [id, text, name, column] of [
      ['P01', '"use strict"; function f(a,a){}', 'a', 28],
      ['P02', 'function f(a,a){"use strict";}', 'a', 14],
      ['P03', '"use strict"; function o(){function f(a,a){}}', 'a', 41],
      ['P08', '"use strict"; var f=function(a,a){};', 'a', 32],
      ['P12', '"use strict"; function f(a,a){} function g(){class C {}}', 'a', 28],
      ['P14', '"use strict"; function f(a,a){} function g(b,b){}', 'a', 28],
      ['P15', 'function f(a,a){} function g(b,b){"use strict";}', 'b', 32],
      ['X09', '"use strict"; {function f(){} function f(){}} function g(a,a){}', 'a', 60],
    ]) {
      assert.equal(rows.find(row => row.id === id).text, text);
      expected.set(id, {kind: 'blocked', reason: 'scope-restriction',
        diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate parameter: ' + name, loc: {line: 1, column}},
        rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'}});
    }
    assert.equal(rows.find(row => row.id === 'P13').text, 'function f(a,a){"use strict";');
    expected.set('P13', {kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: "expected '}', found '<eof>'", loc: {line: 1, column: 30}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.expected-token'}});
    expected.set('L06', {kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'syntax nesting limit exceeded', loc: {line: 1, column: 159}},
      rejection: {kind: 'resource-limit', guardCode: 'parse-depth', count: 129, limit: 128}});
    expected.set('S21', {kind: 'blocked', reason: 'scope-restriction',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate parameter: param', loc: {line: 23, column: 29}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'}});
  } else {
    for (const [id, text] of [
      ['E21', 'function f(a,a){; "use strict";}'], ['E23', 'function f(a,a){{"use strict";}}'],
      ['E50', 'function f(a,a){"use\\nstrict";}'],
    ]) {
      assert.equal(rows.find(row => row.id === id).text, text);
      expected.set(id, {kind: 'none', sourceUnits: text.length, consumedUnits: text.length});
    }
    expected.set('S21-raw', {kind: 'none', sourceUnits: 655, consumedUnits: 655});
    for (const [id, text, start, end, first, name] of [
      ['P15', 'function f(a,a){} function g(b,b){"use strict";}', 18, 48, 29, 'b'],
      ['E12', 'function f(a,a){"use strict";} function g(b,b){}', 0, 30, 11, 'a'],
      ['E33', 'function f(a,a){"use strict";} try{}catch(e){var e;}', 0, 30, 11, 'a'],
      ['E13', 'var f=function(a,a){}; function g(b,b){"use strict";}', 23, 53, 34, 'b'],
      ['E14', 'function f(a,a){"use strict";} var g=function(b,b){};', 0, 30, 11, 'a'],
      ['E15', 'function outer(){function f(a,a){} function g(b,b){"use strict";}}', 35, 65, 46, 'b'],
      ['E37', 'var f=function named(a,a){"use strict";};', 6, 40, 21, 'a'],
    ]) {
      assert.equal(rows.find(row => row.id === id).text, text);
      expected.set(id, {kind: 'eligible', sourceUnits: text.length, consumedUnits: text.length, candidates: [{
        ruleCode: 'duplicate-strict-parameter', functionStart: start, functionEnd: end,
        first: {name, start: first, end: first + 1, loc: {line: 1, column: first + 1}},
        second: {name, start: first + 2, end: first + 3, loc: {line: 1, column: first + 3}},
      }]});
    }
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
    for (const [id, text] of [['G8', '42=7;class C{}'], ['G10', '42=7;function f(){class C{}}']]) {
      const row = rows.find(row => row.id === id);
      assert.equal(row.text, text);
      row.expected = {kind: 'eligible', sourceUnits: text.length, consumedUnits: text.length, candidates: [{
        ruleCode: 'assignment-target', target: {text: '42', start: 0, end: 2, loc: {line: 1, column: 1}},
        operator: {text: '=', start: 2, end: 3, loc: {line: 1, column: 3}},
      }]};
    }
    for (const [id, text] of [['SL0', '42=7;function f(a,a){}'], ['SL1', 'function f(a,a){}42=7;']]) {
      const row = rows.find(row => row.id === id), start = text.indexOf('42');
      assert.equal(row.text, text);
      row.expected = {kind: 'eligible', sourceUnits: text.length, consumedUnits: text.length, candidates: [{
        ruleCode: 'assignment-target', target: {text: '42', start, end: start + 2, loc: {line: 1, column: start + 1}},
        operator: {text: '=', start: start + 2, end: start + 3, loc: {line: 1, column: start + 3}},
      }]};
    }
    for (const [id, text] of [['M7-0', '"use strict";42=7;function f(a,a){}'], ['M7-1', '"use strict";function f(a,a){}42=7;']]) {
      const row = rows.find(row => row.id === id);
      assert.equal(row.text, text);
      row.expected = {kind: 'blocked', reason: 'scope-restriction',
        diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate parameter: a', loc: {line: 1, column: text.indexOf('(a,a)') + 4}},
        rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'}};
    }
    const pattern = rows.find(row => row.id === 'U8');
    assert.equal(pattern.text, '[a]=b;');
    pattern.expected = {kind: 'none', sourceUnits: 6, consumedUnits: 6};
    const newline = rows.find(row => row.id === 'U13');
    assert.equal(newline.text, '42\n++;');
    newline.expected = {kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'unsupported or unexpected syntax: ;', loc: {line: 2, column: 3}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.unexpected'}};
    const block = rows.find(row => row.id === 'SL2');
    assert.equal(block.text, '42=7;{function single(){}}');
    block.expected = {kind: 'eligible', sourceUnits: 26, consumedUnits: 26, candidates: [{
      ruleCode: 'assignment-target',
      target: {text: '42', start: 0, end: 2, loc: {line: 1, column: 1}},
      operator: {text: '=', start: 2, end: 3, loc: {line: 1, column: 3}},
    }]};
    for (const literal of ['1e2', '.5', '0x2']) {
      const row = rows.find(row => row.text === literal + '=7;');
      assert.ok(row);
      const end = literal.length;
      row.expected = {kind: 'eligible', sourceUnits: end + 3, consumedUnits: end + 3, candidates: [{
        ruleCode: 'assignment-target',
        target: {text: literal, start: 0, end, loc: {line: 1, column: 1}},
        operator: {text: '=', start: end, end: end + 1, loc: {line: 1, column: end + 1}},
      }]};
    }
    const prefix = rows.find(row => row.id === 'U14');
    assert.equal(prefix.text, '++42;');
    prefix.expected = {
      kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'invalid update target', loc: {line: 1, column: 1}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.assignment-target'},
    };
    for (const [id, text, operator] of [['G4', '42**=7;', '**='], ['G5', '42&&=7;', '&&=']]) {
      const assignment = rows.find(row => row.id === id);
      assert.equal(assignment.text, text);
      assignment.expected = {kind: 'eligible', sourceUnits: text.length, consumedUnits: text.length, candidates: [{
        ruleCode: 'assignment-target',
        target: {text: '42', start: 0, end: 2, loc: {line: 1, column: 1}},
        operator: {text: operator, start: 2, end: 5, loc: {line: 1, column: 3}},
      }]};
    }
    const sequence = rows.find(row => row.id === 'G15');
    assert.equal(sequence.text, '(42,43)=7;');
    sequence.expected = {
      kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'invalid assignment target', loc: {line: 1, column: 1}},
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
    for (const [id, text] of [
      ['mixed-parameter-true-false', '"use strict"; while(false) let x; function f(a,a){}'],
      ['mixed-parameter-true-true', '"use strict"; function f(a,a){} while(false) let x;'],
      ['mixed-strict-parameter-false-false', 'while(false) let x; function f(a,a){"use strict";}'],
      ['mixed-strict-parameter-false-true', 'function f(a,a){"use strict";} while(false) let x;'],
      ['mixed-strict-parameter-true-false', '"use strict"; while(false) let x; function f(a,a){"use strict";}'],
      ['mixed-strict-parameter-true-true', '"use strict"; function f(a,a){"use strict";} while(false) let x;'],
    ]) {
      const row = rows.find(row => row.id === id);
      assert.equal(row.text, text);
      row.expected = {kind: 'blocked', reason: 'scope-restriction',
        diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'duplicate parameter: a', loc: {line: 1, column: text.indexOf('(a,a)') + 4}},
        rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.duplicate-parameter'}};
    }
    const classStatement = rows.find(row => row.id === 'excluded-class');
    assert.equal(classStatement.text, 'if(false) class C{}');
    classStatement.expected = {kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'declarations require a block', loc: {line: 1, column: 11}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.declaration-statement'}};
    const arrayBinding = rows.find(row => row.id === 'excluded-let-array');
    assert.equal(arrayBinding.text, 'if(false) let [x]=a;');
    arrayBinding.expected = {kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'pattern declarations require a block', loc: {line: 1, column: 11}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.declaration-statement'}};
    const objectBinding = rows.find(row => row.id === 'excluded-let-object');
    assert.equal(objectBinding.text, 'while(false) let {x}=a;');
    objectBinding.expected = {kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'pattern declarations require a block', loc: {line: 1, column: 14}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.declaration-statement'}};
    const implicit = rows.find(row => row.id === 'excluded-missing-semicolon');
    assert.equal(implicit.text, 'if(false) let x');
    implicit.expected = {kind: 'eligible', sourceUnits: 15, consumedUnits: 15, candidates: [{
      ruleCode: 'lexical-declaration-statement', context: 'if-consequent',
      keyword: {text: 'let', start: 10, end: 13, loc: {line: 1, column: 11}},
    }]};
    const labelled = rows.find(row => row.id === 'excluded-label');
    assert.equal(labelled.text, 'label: let x;');
    labelled.expected = {kind: 'blocked', reason: 'grammar-or-resource',
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: 'labelled declarations are unsupported', loc: {line: 1, column: 8}},
      rejection: {kind: 'unsupported-syntax', capabilityCode: 'parse.declaration-statement'}};
    for (const [id, text] of [
      ['mixed-strict-block-false-false', 'while(false) let x; {function f(){}function f(){}}'],
      ['mixed-strict-block-false-true', '{function f(){}function f(){}} while(false) let x;'],
    ]) {
      const row = rows.find(row => row.id === id);
      assert.equal(row.text, text);
      row.expected = duplicateSloppyFunction(text);
    }
    const escaped = rows.find(row => row.id === 'directive-escaped');
    assert.equal(escaped.text, '"use\\x20strict"; while(false) let x;');
    escaped.expected = {kind: 'eligible', sourceUnits: 36, consumedUnits: 36, candidates: [{
      ruleCode: 'lexical-declaration-statement', context: 'while-body',
      keyword: {text: 'let', start: 30, end: 33, loc: {line: 1, column: 31}},
    }]};
    for (const [id, text] of [['excluded-const-list', 'const x=1;'], ['excluded-const-block', '{const x=1;}'], ['excluded-for-const', 'for(const x of a){}'], ['excluded-for-let', 'for(let x=0;x<1;x++){}'], ['excluded-for-in', 'for(let x in a){}']]) {
      const row = rows.find(row => row.id === id);
      assert.equal(row.text, text);
      row.expected = {kind: 'none', sourceUnits: text.length, consumedUnits: text.length};
    }
    const loop = rows.find(row => row.id === 'excluded-do');
    assert.equal(loop.text, 'do let x; while(false);');
    loop.expected = {kind: 'eligible', sourceUnits: 23, consumedUnits: 23, candidates: [{
      ruleCode: 'lexical-declaration-statement', context: 'do-while-body',
      keyword: {text: 'let', start: 3, end: 6, loc: {line: 1, column: 4}},
    }]};
    for (const [id, text, start] of [
      ['mixed-sloppy-block-false-false', 'while(false) let x; {function f(){}}', 13],
      ['mixed-sloppy-block-false-true', '{function f(){}} while(false) let x;', 30],
      ['mixed-template-false-false', 'while(false) let x; `x`;', 13],
      ['mixed-template-false-true', '`x`; while(false) let x;', 18],
      ['mixed-template-true-false', '"use strict"; while(false) let x; `x`;', 27],
      ['mixed-template-true-true', '"use strict"; `x`; while(false) let x;', 32],
      ['mixed-parameter-false-false', 'while(false) let x; function f(a,a){}', 13],
      ['mixed-parameter-false-true', 'function f(a,a){} while(false) let x;', 31],
      ['mixed-class-false-false', 'while(false) let x; class C{}', 13],
      ['mixed-class-false-true', 'class C{} while(false) let x;', 23],
      ['mixed-class-true-false', '"use strict"; while(false) let x; class C{}', 27],
      ['mixed-class-true-true', '"use strict"; class C{} while(false) let x;', 37],
      ['mixed-nested-invalid-false-false', 'while(false) let x; let g=function(){class C{}};', 13],
      ['mixed-nested-invalid-false-true', 'let g=function(){class C{}}; while(false) let x;', 42],
      ['mixed-nested-invalid-true-false', '"use strict"; while(false) let x; let g=function(){class C{}};', 27],
      ['mixed-nested-invalid-true-true', '"use strict"; let g=function(){class C{}}; while(false) let x;', 56],
      ['mixed-const-false-false', 'while(false) let x; const y=1;', 13],
      ['mixed-const-false-true', 'const y=1; while(false) let x;', 24],
      ['mixed-const-true-false', '"use strict"; while(false) let x; const y=1;', 27],
      ['mixed-const-true-true', '"use strict"; const y=1; while(false) let x;', 38],
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
