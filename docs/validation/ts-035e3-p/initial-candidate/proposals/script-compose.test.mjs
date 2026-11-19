import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {composeScriptEnvelope,parseScriptEnvelope,inspectScriptEnvelope} from './script-result.mjs';
const rows=JSON.parse(readFileSync('test/fixtures/script-observation-serialization/frozen.json'));
const copy=structuredClone;
function draft(r){const v=copy(r.envelope);delete v.classification;return v;}
test('compose exact retained literals; no child, native process or authority is created',()=>{
 for(const r of rows){const v=composeScriptEnvelope(JSON.stringify(draft(r)),r.context,r.binding);assert.deepEqual(v,r.envelope,r.id);assert.deepEqual(parseScriptEnvelope(JSON.stringify(v),r.binding),v);assert.notEqual(v.identity,r.context.identity);assert.notEqual(v.classification.blockers,r.context.blockers);}
});
test('compose rejects classification injection, unknown/missing keys, malformed wire and stale context',()=>{
 for(const r of rows){
  assert.throws(()=>composeScriptEnvelope(JSON.stringify(r.envelope),r.context,r.binding));
  for(const key of Object.keys(draft(r))){const v=draft(r);delete v[key];assert.throws(()=>composeScriptEnvelope(JSON.stringify(v),r.context,r.binding));}
  const v=draft(r);v.unknown=true;assert.throws(()=>composeScriptEnvelope(JSON.stringify(v),r.context,r.binding));
  const c=copy(r.context);c.identity.runId+='stale';assert.throws(()=>composeScriptEnvelope(JSON.stringify(draft(r)),c,r.binding));
 }
 const r=rows[0],json=JSON.stringify(draft(r));
 for(const x of ['{}',json.slice(0,-1),json+json,json.replace('"identity":','"identity":{},"identity":'),Buffer.from([0xc0,0xaf]),Buffer.alloc(65537)])assert.throws(()=>composeScriptEnvelope(x,r.context,r.binding));
 assert.throws(()=>composeScriptEnvelope(json,r.context));assert.throws(()=>composeScriptEnvelope(json,r.context,r.binding,1));
});
test('compose all eight statuses and authenticated parent priority; synthetic data only',()=>{
 const base=rows.find(r=>r.id.endsWith('/normal'));assert(base);
 const cases=[
  ['timeout','deadline',{kind:'timeout',wallMs:base.binding.limits.wallMs},{exitCode:70,signal:null,deadlineExpired:true}],
  ['host-fault','crash',{kind:'host-fault',faultCode:'crash'},{exitCode:70,signal:null,deadlineExpired:false}],
  ['resource-limit','output',{kind:'resource-limit',guardCode:'output',count:1025,limit:1024},{exitCode:null,signal:'SIGTERM',deadlineExpired:false}],
  ['harness-error','input',{kind:'not-run',reasonCode:'input'},{exitCode:null,signal:null,deadlineExpired:false}],
  ['unsupported-profile','strict',{kind:'not-run',reasonCode:'strict'},{exitCode:null,signal:null,deadlineExpired:false}],
  ['unsupported-feature','feature',{kind:'not-run',reasonCode:'feature'},{exitCode:null,signal:null,deadlineExpired:false}],
 ];
 const seen=new Set(rows.map(r=>r.envelope.classification.status));
 for(const [status,reasonCode,observation,process] of cases){const r=copy(base),v=draft(r),blocked=status.startsWith('unsupported-');r.context.expectedNegative=null;r.context.blockers=blocked?[{status,reasonCode}]:[];
  v.evidence={...v.evidence,stage:observation.kind==='not-run'?'input':'driver',operation:null,source:null,testBodyEvaluated:false,harnessValidated:false,completedUnits:[],inspection:null,process};v.observation=observation;
  const result=composeScriptEnvelope(JSON.stringify(v),r.context,r.binding);assert.deepEqual(result.classification,{status,reasonCode,blockers:r.context.blockers,expectedNegative:null,observedPhase:null,observedConstructorName:null});seen.add(status);
  const cap=status==='resource-limit';const facts={process,outputBytes:cap?1025:0,outputLimit:1024,capCount:cap?1025:null,capKilled:cap,crashBeforeCap:false};assert.deepEqual(inspectScriptEnvelope(JSON.stringify(result),r.context,facts,r.binding),result);
 }
 assert.deepEqual([...seen].sort(),['fail','harness-error','host-fault','pass','resource-limit','timeout','unsupported-feature','unsupported-profile']);
});
