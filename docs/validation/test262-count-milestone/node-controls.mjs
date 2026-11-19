import assert from 'node:assert/strict';
import {runSource, classify} from './node-case.mjs';
const cases = [
  ['assert.sameValue(1,1)', {}, 'passed'],
  ['assert.sameValue(1,2)', {}, 'failed'],
  ['assert(false)', {}, 'failed'],
  ['throw new TypeError()', {negative: {phase: 'runtime', type: 'TypeError'}}, 'passed'],
  ['throw new RangeError()', {negative: {phase: 'runtime', type: 'TypeError'}}, 'failed'],
  ['1', {negative: {phase: 'runtime', type: 'TypeError'}}, 'failed'],
  ['throw "TypeError"', {negative: {phase: 'runtime', type: 'TypeError'}}, 'failed'],
  ['return;', {negative: {phase: 'parse', type: 'SyntaxError'}}, 'passed'],
  ['throw new SyntaxError()', {negative: {phase: 'parse', type: 'SyntaxError'}}, 'failed'],
  ['typeof assert === "undefined" || missing()', {flags: ['raw']}, 'passed'],
  ['assert.sameValue(this,undefined)', {flags: ['onlyStrict']}, 'failed'],
  ['1', {flags: ['module']}, 'unsupported-module'],
  ['1', {flags: ['async']}, 'unsupported-async'],
];
for (const [source, metadata, status] of cases) assert.equal(runSource(source, metadata).status, status, source);
assert.equal(classify({operation:{stage:'harness',phase:'body'},result:{kind:'normal'}}, null), 'harness-error');
assert.equal(classify({operation:{stage:'test',phase:'parse'},result:{kind:'unsupported-syntax'}}, {phase:'parse',type:'SyntaxError'}), 'unsupported-syntax');
console.log(`${cases.length + 2} baseline classifier controls passed`);
