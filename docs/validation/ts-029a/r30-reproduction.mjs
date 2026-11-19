import { Evaluator } from '../../../build/node/src/evaluator.js';
import { Realm } from '../../../build/node/src/realm.js';
import { parse } from '../../../build/node/src/parser.js';
import { normal, UNDEFINED } from '../../../build/node/src/runtime.js';
// Reproduce from typescript/: node docs/validation/ts-029a/r30-reproduction.mjs
// This is an oracle investigation, not a replacement for the frozen assertion.
const realm = new Realm(() => {});
const evaluator = new Evaluator(realm);
let calls = 0;
const rhs = realm.createBuiltin('rhs', 0, (_receiver, _args, _context, _location) => {
    calls++;
    return normal({ kind: 'number', value: 7 });
});
for (const [name, value] of [
    ['p', { kind: 'null' }],
    ['k', { kind: 'string', value: 'x' }],
    ['rhs', { kind: 'object', object: rhs }],
]) realm.global.bindings.set(name, { initialized: true, mutable: true, value });
const source = 'p[k] = rhs();';
const result = evaluator.statement(parse(source).body[0], realm.global, UNDEFINED);
console.log(JSON.stringify({ source, frozenSteps: 6, actualSteps: evaluator.steps, rhsCalls: calls, result }, null, 2));
