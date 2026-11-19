// Design ledger only: no Rift imports, parser invocation or guest execution.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const cases = [
  { id: 'S1', input: '/*lead*/ function /*a*/ f ( x ) { /*b*/ return x; } /*tail*/',
    ranges: [[9, 51, 'function /*a*/ f ( x ) { /*b*/ return x; }']] },
  { id: 'S2', input: 'let f = (function /*a*/ (x) {return x;}) /*tail*/;',
    ranges: [[9, 39, 'function /*a*/ (x) {return x;}']] },
  { id: 'S3', input: '//lead\r\nfunction f() {\r\n//keep\r\n}\r\n',
    ranges: [[8, 33, 'function f() {\r\n//keep\r\n}']] },
  { id: 'S4', input: 'function outer() { function inner() { return 1; } return inner; }',
    ranges: [[0, 65, 'function outer() { function inner() { return 1; } return inner; }'],
      [19, 49, 'function inner() { return 1; }']] },
  { id: 'S5', input: "let f=function(){return 'a\\n\\t\\\\b';};",
    ranges: [[6, 36, "function(){return 'a\\n\\t\\\\b';}"]] },
  { id: 'S6', input: "/*\ud83d\ude00*/let f=function(){return '\ud83d\ude00\ud800x\udc00\u0000';};",
    ranges: [[12, 40, "function(){return '\ud83d\ude00\ud800x\udc00\u0000';}"]] },
  { id: 'S7', input: 'function f(){/*\u2028\u2029*/return 1;}',
    ranges: [[0, 29, 'function f(){/*\u2028\u2029*/return 1;}']] },
  { id: 'S8', input: "function f(){/* } function */return '}';} //tail",
    ranges: [[0, 41, "function f(){/* } function */return '}';}"]] },
  { id: 'S9', input: 'function a(){} /*gap*/ function b(){}',
    ranges: [[0, 14, 'function a(){}'], [23, 37, 'function b(){}']] },
];
const lines = ['TS-023P data-only source ledger; no runtime support tested.'];
for (const row of cases) {
  for (const [start, end, expected] of row.ranges) {
    assert.equal(row.input.slice(start, end), expected, row.id);
    assert.equal(end - start, expected.length, row.id + ' UTF-16 length');
  }
  lines.push(JSON.stringify(row));
}
writeFileSync(new URL('./source-cases.txt', import.meta.url), lines.join('\n') + '\n');
console.log('9 source cases / 11 fixed ranges checked (data only).');
