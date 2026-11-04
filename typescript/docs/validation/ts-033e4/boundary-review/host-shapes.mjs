// Node-only invalid host values. Not native evidence and not arbitrary-code isolation.
import assert from 'node:assert/strict';
import {prepare,materialize} from '../../../../build/ts-033e4-boundary-review/provenance-node/docs/validation/ts-033e4/boundary-review/record-facade.js';
import {createSession,evaluate} from '../../../../build/ts-033e4-boundary-review/provenance-node/docs/validation/ts-033e4/boundary-review/session-facade.js';
const a=prepare('same',7),b=prepare('same',11),f=materialize(a),s=createSession();
const Session=Object.getPrototypeOf(s).constructor;
const Record=Object.getPrototypeOf(a).constructor;
const Callable=Object.getPrototypeOf(f).constructor;
for(const fake of [{},Object.create(Object.getPrototypeOf(s))])assert.throws(()=>evaluate(fake,a,f));
for(const fake of [{},a.inspect(),new Record(),Object.create(Object.getPrototypeOf(a))])assert.throws(()=>evaluate(s,fake,f));
assert.throws(()=>new Session({}));
assert.throws(()=>new Callable(a,{}));
assert.throws(()=>Record.read(a,{}));
assert.throws(()=>Callable.read(f,a,{}));
assert.throws(()=>evaluate(s,b,f));
assert.equal(s.inspect(),0);
assert.equal(evaluate(s,a,f),7);assert.equal(s.inspect(),1);
console.log('PASS Node-only fake/shell/copied-record/recovered-constructor/key negatives; authentic neighbor');
