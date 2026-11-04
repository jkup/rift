// Reflective host-shape controls are Node-only, not claimed as native syntax.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Realm } from '../../../../build/node/src/realm.js';
import { Evaluator } from '../../../../build/node/src/evaluator.js';
import { prepareStrictScript } from '../../../../build/node/src/script-record.js';
import { createScriptSession, evaluateScript } from '../../../../build/node/src/script-execution.js';
import { normal, UNDEFINED } from '../../../../build/node/src/runtime.js';
const r = new Realm(() => {}, 'script'), legacy = new Realm(() => {});
const session = createScriptSession(), record = prepareStrictScript({id:'boundary',text:'"use strict";probe();'},r).record;
const loc = {line:1,column:1}; let retained; let raw = 0;
const leaf = {kind:'object',object:r.createBuiltin('leaf',0,()=>{raw++;return normal();})};
const probe = r.createBuiltin('probe',0,(_receiver,_args,c,l)=>{
    retained=c;
    const clones=[{...c},new Proxy(c,{}),{realm:legacy,call:c.call,tick:c.tick}];
    const call=c.call,tick=c.tick;
    for(const clone of clones){clone.call(leaf,UNDEFINED,[],l);clone.tick(l);}
    call(leaf,UNDEFINED,[],l);tick(l);
    for(const receiver of [null,undefined,{},clones[0],clones[1]]){
        call.call(receiver,leaf,UNDEFINED,[],l);tick.call(receiver,l);
        call.bind(receiver)(leaf,UNDEFINED,[],l);tick.bind(receiver)(l);
    }
    assert.throws(()=>leaf.object.callable.invoke(UNDEFINED,[],c,l),/Script execution unavailable/);
    for(const clone of clones.slice(0,2))assert.throws(()=>leaf.object.callable.invoke(UNDEFINED,[],clone,l),/Script execution unavailable/);
    assert.throws(()=>leaf.object.callable.invoke(UNDEFINED,[],clones[2],l),/cross-profile callable invocation/);
    return normal();
});
r.defineScriptGlobal('probe',{value:{kind:'object',object:probe},writable:true,configurable:true});
for(const fake of [{}, {...session}, Object.create(Object.getPrototypeOf(session))])assert.throws(()=>evaluateScript(fake,record));
for(const fake of [{},record.inspect(),Object.create(Object.getPrototypeOf(record)),new record.constructor()])assert.throws(()=>evaluateScript(session,fake));
assert.deepEqual(session.inspect(),{steps:0,calls:0,depth:0,active:null,lastAbrupt:null});
assert.throws(()=>new session.constructor({}, {maxSteps:100,maxCalls:64}),/invalid Script session constructor/);
assert.throws(()=>new Evaluator(r),/legacy Realm required/);
assert.throws(()=>new (Object.getPrototypeOf(Evaluator))(r,100,64,{}),/legacy Realm required/);
assert.equal(evaluateScript(session,record).completion.type,'normal');
assert.equal(raw,14);
assert.throws(()=>retained.call(leaf,UNDEFINED,[],loc),/inactive Script session/);
assert.throws(()=>retained.tick(loc),/inactive Script session/);
assert.throws(()=>leaf.object.callable.invoke(UNDEFINED,[],retained,loc),/Script execution unavailable/);
assert.deepEqual(Object.keys(session),[]);
assert.deepEqual(Object.keys(record),[]);
assert.deepEqual(Object.getOwnPropertyNames(Object.getPrototypeOf(session)).sort(),['constructor','inspect']);
writeFileSync(new URL('node-boundary-results.json',import.meta.url),JSON.stringify({status:'PASS',lane:'Node only',raw,controls:['fake sessions and records before ticks','recovered constructors denied','copied spread proxy detached rebound capabilities','profile-first exact diagnostics','idle callbacks and stale direct invocation','no context or AST properties']},null,2)+'\n');
console.log('PASS Node-only reflective boundary and capability forwarding controls');
