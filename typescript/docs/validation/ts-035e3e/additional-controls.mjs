import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { describeScriptHostServices as describe } from '../../../tools/test262/script-host-services.mjs';

const literals = JSON.parse(readFileSync(new URL('../ts-035e3e-p/descriptor-literals.json', import.meta.url)));
let freshObjects = 0;
function objects(value, result = new Set()) {
  if (value && typeof value === 'object') {
    assert.ok(Object.isFrozen(value));
    result.add(value);
    for (const item of Object.values(value)) objects(item, result);
  }
  return result;
}
const allPrior = new Set();
for (const row of literals) {
  for (let call = 0; call < 2; call++) {
    const actual = describe(...row.args);
    assert.deepEqual(actual, row.expected);
    const current = objects(actual);
    for (const object of current) {
      assert.ok(!allPrior.has(object), 'no object shared across calls or variants');
      allPrior.add(object);
      freshObjects++;
    }
    // Explicitly cover the nested structures named by the task as well as the
    // complete recursive traversal above.
    assert.ok(current.has(actual.data.sourceSnapshot));
    assert.ok(current.has(actual.data.sourceSnapshot[0]));
    assert.ok(current.has(actual.data.realms));
    assert.ok(current.has(actual.data.realms[0].globals));
    assert.ok(current.has(actual.data.realms[0].globals[0]));
  }
}
let getters = 0, calls = 0, errors = 0;
const hostile = {};
for (const key of [Symbol.toPrimitive, 'valueOf', 'toString']) {
  Object.defineProperty(hostile, key, { get() {
    getters++;
    return () => { calls++; throw new Error('coercion must not run'); };
  } });
}
const cases = [
  [[hostile, null], 'purpose'], [[hostile, hostile], 'purpose'],
  [['main', hostile], 'control'], [['conformance-preflight-v1', hostile], 'control'],
  [[hostile], 'arguments'], [[hostile, hostile, hostile], 'arguments'],
  [[new String('main'), null], 'purpose'],
  [['conformance-preflight-v1', new String('B09')], 'control'],
];
for (const [args, code] of cases) {
  assert.throws(() => describe(...args), { message: 'script-host-services/' + code });
  errors++;
  assert.equal(getters, 0);
  assert.equal(calls, 0);
}
const result = { variants: literals.length, calls: 40, freshObjects, boundaryErrors: errors,
  coercionGetterReads: getters, coercionHookCalls: calls };
writeFileSync(new URL('additional-results.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
