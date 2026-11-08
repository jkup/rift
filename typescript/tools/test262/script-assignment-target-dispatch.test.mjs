import assert from 'node:assert/strict';
import test from 'node:test';
import {writeFileSync} from 'node:fs';
import {createDispatchDriver} from './test-support/dispatch-driver.mjs';
const {output,read,observe,results}=createDispatchDriver('script-assignment-target-dispatch','fixtures/script-assignment-target-dispatch','docs/validation/ts-035d6-p');
import {parseScriptDriverResult} from './script-driver-result.mjs';
import {parseScriptEnvelope,assertScriptContext} from './script-result.mjs';
test('D6 actual both-host producer and serializer bytes match all 256 frozen wire literals',()=>{
 try{for(const row of read('wire-matrix.json').rows){
 const b=row.binding,lane=row.context.identity.lane;
 const request={nonce:b.nonce,requestSha256:b.requestSha256,action:b.action,preflightId:b.preflightId,steps:b.limits.steps,calls:b.limits.calls,units:b.units.map(u=>({id:u.id,role:u.role,text:b.sources.find(s=>s.unitId===u.id).transformedText}))};
 const bytes=observe(lane,request,b.mode,row.child.result.diagnostic===undefined?'plain':'diagnostic',row.child.result.ruleCode);
 assert.equal(bytes,row.ascii,row.id);assert.deepEqual(JSON.parse(bytes),row.child,row.id);assert.deepEqual(parseScriptDriverResult(Buffer.from(bytes),b),row.child);
 const child=JSON.parse(bytes),envelope=structuredClone(row.envelope);for(const key of ['operation','source','testBodyEvaluated','harnessValidated','preflightId','completedUnits','inspection'])envelope.evidence[key]=child[key];envelope.observation=child.result;
 assert.deepEqual(parseScriptEnvelope(JSON.stringify(envelope),b),row.envelope);assert.deepEqual(assertScriptContext(envelope,row.context,b),row.envelope);
 }assert.equal(results.length,256);}finally{writeFileSync(output+'/wire-results.json',JSON.stringify(results,null,2)+'\n');}
});
