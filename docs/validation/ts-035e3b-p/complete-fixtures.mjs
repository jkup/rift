// Complete synthetic protocol requirements; never invokes either producer.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {composeScriptEnvelope,parseScriptEnvelope} from '../../../tools/test262/script-result.mjs';
const here=new URL('./',import.meta.url),read=n=>JSON.parse(readFileSync(new URL(n,here))),sha=b=>createHash('sha256').update(b).digest('hex');
const template=read('retained-codec-literals.json').rows[0],rows=[];
for(const seed of [...read('future-producer-literals.json'),...read('future-resource-literals.json')]){
 const r=structuredClone(seed),q=r.request;
 const units=q.units.map((u,n)=>{const text=u.text,original=q.variant==='strict'&&u.role==='test'?text.slice('"use strict";\n'.length):text,bytes=Buffer.from(original);return {id:u.id,ordinal:n,role:u.role,path:u.role+'/future-'+u.id+'.js',blob:createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'),sourceSha256:sha(bytes),transformedSha256:sha(Buffer.from(text)),byteLength:bytes.length,sourceUnits:text.length};});
 const realms=[{id:'test',profile:'script'}],canonical={requestVersion:2,nonce:q.nonce,mode:q.mode,variant:q.variant,units,realms,limits:q.limits,preflightId:q.preflightId,action:q.action};
 q.requestSha256=sha(JSON.stringify(canonical));r.argv[q.mode==='conformance'?4:3]=q.requestSha256;r.expected.requestSha256=q.requestSha256;
 const binding={nonce:q.nonce,requestSha256:q.requestSha256,mode:q.mode,variant:q.variant,units,realms,preflightId:q.preflightId,action:q.action,limits:q.limits,sources:q.units.map(u=>({unitId:u.id,transformedText:u.text}))};
 const context=structuredClone(template.context),last=units.at(-1);
 Object.assign(context.identity,{runId:'synthetic-future-only',mode:q.mode,lane:r.lane,path:last.path,blob:last.blob,sourceSha256:last.sourceSha256,variant:q.variant});
 Object.assign(context.inputs,{units,transformedSourceSha256:last.transformedSha256,limits:q.limits,requestSha256:q.requestSha256,preflightId:q.preflightId,realms,capabilityLedgerSha256:q.mode==='conformance'?'a'.repeat(64):null});
 const c=r.expected,evidence={stage:c.operation.stage,operation:c.operation,source:c.source,testBodyEvaluated:c.testBodyEvaluated,harnessValidated:c.harnessValidated,preflightId:c.preflightId,completedUnits:c.completedUnits,inspection:c.inspection,process:{exitCode:0,signal:null,deadlineExpired:false},stdoutSha256:sha(''),stderrSha256:sha(''),elapsedMs:0};
 const draft={identity:context.identity,inputs:context.inputs,evidence,observation:c.result};
 const envelope=q.mode==='conformance'?composeScriptEnvelope(JSON.stringify(draft),context,binding):draft;
 assert.deepEqual(parseScriptDriverResult(Buffer.from(JSON.stringify(c)),binding),c);assert.deepEqual(parseScriptEnvelope(JSON.stringify(envelope),binding),envelope);
 if(q.mode==='conformance'){
  const expected=c.result.kind==='resource-limit'?['resource-limit',c.result.guardCode]:q.action==='parse-only'?['host-fault','protocol']:['pass','normal'];
  assert.equal(envelope.classification.status,expected[0]);assert.equal(envelope.classification.reasonCode,expected[1]);
 }
 rows.push({...r,binding,context,envelope,provenance:'unexecuted synthetic full future requirement; classification is data, never admission; engine execution and parent transport still unproved'});
}
writeFileSync(new URL('future-wire-literals.json',here),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({futureFullWire:rows.length,conformanceExecuted:0,parseOnlyNormalIsProtocol:true}));
