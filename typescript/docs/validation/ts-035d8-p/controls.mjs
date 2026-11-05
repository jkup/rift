import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Realm} from '../../../build/node/src/realm.js';
import {prepareBoundedScript} from '../../../build/node/src/script-record.js';
import {createScriptSession,evaluateScript} from '../../../build/node/src/script-execution.js';
import {observeScripts} from '../../../build/node/src/script-observation.js';
const here=new URL('./',import.meta.url),matrix=JSON.parse(readFileSync(new URL('semantic-matrix.json',here))),copy=structuredClone;
const get=id=>matrix.rows.find(r=>r.id===id),future=(row,current)=>{const v=copy(current);v.rejection={kind:'syntax-error',ruleCode:'lexical-declaration-statement'};v.diagnostic=copy(row.futurePreparation.diagnostic);return v;};
const prefixRows=[],budgetRows=[],profileRows=[],metadataRows=[],historyRows=[],readyRows=[],oracleMutations=[];
let orderNegatives=0;
for(const id of ['R0','R1'])for(const action of ['parse-only','execute'])for(const role of ['test','harness']){
 const row=get(id);
 for(const count of [0,1,2]){
  const units=Array.from({length:count},(_,i)=>({id:'u'+i,role:'harness',text:i===0?'0;':'1;'}));units.push({id:'u'+count,role,text:row.text});if(role==='harness')units.push({id:'u'+(count+1),role:'test',text:'throw 19;'});
  const request={nonce:'D7-prefix',requestSha256:'a'.repeat(64),action,preflightId:'preflight',steps:10000,calls:64,units};
  const current=observeScripts(request),expected=copy(current);expected.result={kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:'lexical-declaration-statement'};expected.source.location=copy(row.expected.candidates[0].keyword.loc);
  assert.deepEqual(current.completedUnits,Array.from({length:count},(_,i)=>'u'+i));assert.equal(current.operation.unitId,'u'+count);assert.equal(current.testBodyEvaluated,false);
  prefixRows.push({id,paths:units.map(()=> 'harness/repeated.js'),request,current,expected});
  for(let i=0;i<units.length;i++)for(const wrong of ['bad','u99',i?'u0':'u1']){const r=copy(request);r.units[i].id=wrong;assert.throws(()=>observeScripts(r),/^Error: invalid Script occurrence order$/);orderNegatives++;}
 }
 for(const steps of [0,1,10000])for(const calls of [0,1,64]){const c=row.contexts.find(c=>c.request.action===action&&c.request.units[0].role===role),request={...copy(c.request),steps,calls};const current=observeScripts(request);assert.deepEqual(current,c.current);budgetRows.push({id,request,current,expected:c.expected});}
}
for(const realmId of ['A','B'])for(const profile of ['legacy','script'])for(const text of [get('R0').text,'x'.repeat(100001),'@']){
 const realm=new Realm(()=>{throw Error('effect');},profile),current=prepareBoundedScript({id:'profile',text},realm);if(profile==='legacy')assert.deepEqual(current,{kind:'profile-rejected',reason:'realm'});
 profileRows.push({realmId,profile,text,current,expected:profile==='script'&&text===get('R0').text?future(get('R0'),current):current});
}
for(const id of ['R0','R1','effects'])for(const realmId of ['A','B'])for(const seeded of [false,true])for(const count of [0,1,2]){
 const row=get(id);let prints=0;const realm=new Realm(()=>prints++,'script'),session=createScriptSession({maxSteps:10000,maxCalls:64});let seed=null,evaluation=null,completion=null,value=null;
 if(seeded){seed=prepareBoundedScript({id:'history',text:'let sentinel = 41; throw 3;'},realm);assert.equal(seed.kind,'ready');evaluation=evaluateScript(session,seed.record);completion=evaluation.completion;value=completion.value;assert.deepEqual(value,{kind:'number',value:3});}
 for(let i=0;i<count;i++){const p=prepareBoundedScript({id:'u'+i,text:i?'1;':'0;'},realm);assert.equal(p.kind,'ready');assert.equal(evaluateScript(session,p.record).completion.type,'normal');}
 let guestCalls=0;const context={realm,call:()=>{guestCalls++;throw Error('unexpected guest call');},tick:()=>{throw Error('unexpected tick');}};
 const bindingBefore=seeded?realm.globalEnvironment.getBindingValue('sentinel',context,{line:1,column:1}):null;
 const before=session.inspect(),keys=realm.globalObject.ownPropertyKeys(),descriptors=keys.map(k=>realm.globalObject.getOwnProperty(k)),lexical=realm.globalEnvironment.hasLexicalDeclaration('sentinel');
 if(seeded&&count===0){assert.equal(before.lastAbrupt.record,seed.record);assert.equal(before.lastAbrupt.realm,realm);assert.deepEqual(before.lastAbrupt.loc,{line:1,column:20});}else assert.equal(before.lastAbrupt,null);
 const unit={id:'same',text:row.text},current=prepareBoundedScript(unit,realm);unit.id='changed';unit.text='throw 19;';assert.equal(current.unit.id,'same');assert.equal(current.unit.text,row.text);
 const after=session.inspect();assert.equal(after.steps,before.steps);assert.equal(after.calls,before.calls);assert.equal(after.depth,before.depth);assert.equal(after.active,null);
 if(before.lastAbrupt===null)assert.equal(after.lastAbrupt,null);else{assert.equal(after.lastAbrupt.record,before.lastAbrupt.record);assert.equal(after.lastAbrupt.realm,realm);assert.equal(after.lastAbrupt.unitId,before.lastAbrupt.unitId);assert.deepEqual(after.lastAbrupt.loc,before.lastAbrupt.loc);}
 assert.equal(prints,0);assert.equal(realm.globalEnvironment.hasLexicalDeclaration('sentinel'),lexical);assert.deepEqual(realm.globalObject.ownPropertyKeys(),keys);
 for(let i=0;i<keys.length;i++){const a=descriptors[i],b=realm.globalObject.getOwnProperty(keys[i]);assert.deepEqual(a,b);if(a.kind==='data')assert.equal(a.value,b.value);else {assert.equal(a.get,b.get);assert.equal(a.set,b.set);}}
 for(const name of ['alpha','beta','x','touched'])assert.equal(realm.globalEnvironment.hasLexicalDeclaration(name),false);
 if(seeded){assert.equal(evaluation.completion,completion);assert.equal(completion.value,value);const bindingAfter=realm.globalEnvironment.getBindingValue('sentinel',context,{line:1,column:1});assert.equal(bindingBefore.value,bindingAfter.value);assert.deepEqual(bindingAfter.value,{kind:'number',value:41});}assert.equal(guestCalls,0);
 const snap=s=>({steps:s.steps,calls:s.calls,depth:s.depth,active:s.active,lastAbrupt:s.lastAbrupt===null?null:{recordIdentity:'seed.record',realmIdentity:realmId,unitId:s.lastAbrupt.unitId,loc:s.lastAbrupt.loc}});
 historyRows.push({id,realmId,seeded,prefixCount:count,seed:seeded?'let sentinel = 41; throw 3;':null,current,expected:future(row,current),before:snap(before),after:snap(after),savedCompletion:completion,identityAssertions:'actual record/Realm/completion/value/descriptor identity checks; snapshots and loc copied, never compared by identity'});
}
for(const variant of ['raw','strict','non-strict'])for(const negative of [null,{phase:'parse',type:'SyntaxError'},{phase:'runtime',type:'TypeError'}])for(const id of ['while-sloppy','while-strict','mixed-class-false-false','valid-ready']){
 const row=get(id),unit={id:'same',text:row.text},realm=new Realm(()=>{},'script'),current=prepareBoundedScript(unit,realm);metadataRows.push({variant,negative,unit:copy(unit),current:current.kind==='ready'?row.current.preparation:current,expected:row.expected.kind==='eligible'?future(row,current):current.kind==='ready'?row.current.preparation:current});
}
for(const action of ['parse-only','execute']){const request={nonce:'ready',requestSha256:'a'.repeat(64),action,preflightId:null,steps:10000,calls:64,units:[{id:'u0',role:'test',text:'let x; x=7; x;'}]},expected=observeScripts(request);assert.equal(expected.result.kind,'normal');assert.equal(expected.testBodyEvaluated,action==='execute');readyRows.push({request,expected});}
const readyRealm=new Realm(()=>{},'script'),ready=prepareBoundedScript({id:'ready',text:'let x; x=7; x;'},readyRealm);assert.equal(ready.kind,'ready');const readyCompletion=evaluateScript(createScriptSession({maxSteps:10000,maxCalls:64}),ready.record);assert.deepEqual(readyCompletion.completion,{type:'normal',value:{kind:'number',value:7}});
for(const r of matrix.rows)for(const c of r.contexts)if(r.expected.kind==='eligible')for(const code of ['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter','assignment-target','wrong-location']){const wrong=copy(c.expected);if(code==='wrong-location')wrong.source.location.column++;else wrong.result.ruleCode=code;assert.notDeepEqual(wrong,c.expected);oracleMutations.push({id:r.id+'/'+code,expected:c.expected,wrong});}
const limits={sourceUnits:100000,parseDepth:128,steps:[0,1,10000],calls:[0,1,64],evaluationDepth:256,wallMs:[0,1000],outputBytes:[0,65536,65537],priority:'profile then whole lex/source guard, same-parser grammar/depth then collector global veto; parent deadline/cap/crash overrides child bytes'};
writeFileSync(new URL('future-controls.json',here),JSON.stringify({claim:'Current accepted D7 probes and future full literals. Harmless prefixes/seed/ready only execute; lexical rejected bodies never execute. Both hosts remain future obligations.',prefixRows,budgetRows,profileRows,metadataRows,historyRows,readyRows,readyCompletion,oracleMutations,limits},null,2)+'\n');
writeFileSync(new URL('control-audit.json',here),JSON.stringify({prefixes:prefixRows.length,budgets:budgetRows.length,profiles:profileRows.length,metadata:metadataRows.length,history:historyRows.length,ready:readyRows.length,oracle:oracleMutations.length,orderNegatives},null,2)+'\n');
console.log(JSON.stringify({prefixes:prefixRows.length,history:historyRows.length,orderNegatives,oracle:oracleMutations.length}));
