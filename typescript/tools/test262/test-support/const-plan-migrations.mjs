import assert from 'node:assert/strict';

// Current expectations for seven const tails; historical snapshots stay frozen.
export function constPlanExpectation(record) {
  const {unit} = record.plan;
  const {id, text} = unit;
  const loc = start => ({line: 1, column: start + 1});
  const site = start => ({name: 'x', start, end: start + 1, loc: loc(start)});
  const blocked = (capabilityCode, message, start) => ({
    plan: {kind: 'blocked', goal: 'Script', unit,
      rejection: {kind: 'unsupported-syntax', capabilityCode},
      diagnostic: {phase: 'parse', name: 'SyntaxError', message, loc: loc(start)}},
    winners: [],
  });
  if (id === 'L08-const') {
    assert.equal(text, '"use strict";const x=1;');
    return {plan: {kind: 'complete', goal: 'Script', unit, consumedUnits: 23,
      strictness: {ownStrict: true, inheritedStrict: false, strict: true,
        directives: [{start: 0, end: 12, statementEnd: 13, loc: loc(0), raw: '"use strict"', useStrict: true}]},
      scopes: [{id: 0, kind: 'script', parent: null, start: 0, end: 23, strict: true,
        formals: [], catchParameter: null, lexicalDeclarations: [0], varDeclarations: [], lexicalNames: ['x'], varNames: []}],
      declarations: [{id: 0, kind: 'const', site: site(19), scope: 0, variableScope: 0,
        functionScope: null, initializer: {start: 21, end: 22}}], functions: []}, winners: [[]]};
  }
  if (id === 'T01' || id === 'T01-nested') {
    assert.equal(text, id === 'T01' ? '"use strict";let x; let x; const tail=0;'
      : '"use strict";let x; var x; function f(){const tail=0;}');
    const kind = id === 'T01' ? 'duplicate-lexical' : 'lexical-var';
    return {plan: {kind: 'conflict', goal: 'Script', unit, consumedUnits: text.length,
      conflict: {kind, scope: 0, first: site(17), second: site(24)},
      diagnostic: {phase: 'parse', name: 'SyntaxError', message: kind + ': x', loc: loc(24)}}, winners: []};
  }
  if (id === 'non-strict-tail') {
    assert.equal(text, 'let x;let x;{function f(){}}const y=1;');
    return blocked('parse.declaration-statement', 'non-strict block function planning is unsupported', text.indexOf('function'));
  }
  if (['R04-binary-unsupported', 'R04-member-unsupported', 'R04-call-unsupported'].includes(id)) {
    assert.ok(text.includes('function(){const tail;}'));
    assert.equal(text.indexOf('const'), text.lastIndexOf('const'));
    return blocked('parse.expected-token', 'const requires an initializer', text.indexOf('const'));
  }
  return record;
}
