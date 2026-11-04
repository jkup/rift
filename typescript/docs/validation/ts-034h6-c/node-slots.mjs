// Supplemental Node-only forged host metadata. Native tests use authentic slots.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Realm} from '../../../build/node/src/realm.js';
import {GuestObject,normal} from '../../../build/node/src/runtime.js';
import {prepareBoundedScript} from '../../../build/node/src/script-record.js';
import {createScriptSession,evaluateScript} from '../../../build/node/src/script-execution.js';
const r=new Realm(()=>{},'script'),legacy=new Realm(()=>{}),s=createScriptSession();
const prepare=(text)=>{const p=prepareBoundedScript({id:'T',text},r);assert.equal(p.kind,'ready');return p.record;};
evaluateScript(s,prepare('function C(){}'));const c=r.globalObject.getOwnProperty('C').value.object.callable;
const fake={kind:'script-guest',realm:r,record:c.record,scopeId:c.scopeId,environment:c.environment,strict:c.strict,thisMode:c.thisMode,privateEnvironment:null,sourceText:()=>c.sourceText(),inspectFormals:()=>c.inspectFormals()};
const cases=[['malformed',{kind:'bad',realm:r}],['forged',fake],['legacy',{kind:'guest',realm:legacy}],['profile',{...fake,realm:legacy}]];
const results=[];
for(const [name,slot] of cases){let gets=0;const k=new GuestObject(r.functionPrototype,false,slot,slot);k.bootstrapDefine('prototype',{get:{kind:'object',object:r.createBuiltin('get',0,()=>{gets++;return normal();})}});r.globalObject.bootstrapDefine('K',{value:{kind:'object',object:k},writable:true,configurable:true});assert.throws(()=>evaluateScript(s,prepare('new K();')),/invalid Script (constructor metadata|callable brand)/);assert.equal(gets,0);const state=s.inspect();assert.equal(state.active,null);assert.equal(state.calls,0);assert.equal(state.depth,0);results.push({name,prototypeGets:gets,status:'PASS'});}
writeFileSync(import.meta.dirname+'/forged-slot-results.json',JSON.stringify(results,null,2)+'\n');console.log('PASS four forged/malformed/profile slot controls (Node-only)');
