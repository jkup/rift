import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScriptDriverResult as childParse } from './script-driver-result.mjs';
import { validateScriptRecord,parseScriptEnvelope,assertScriptContext,inspectScriptEnvelope } from './script-result.mjs';
import { parseEnvelope as oldParse } from './result.mjs';
import { serialized,copy,mutations,envelope,transport,harnessRow,rebind,hash } from '../../docs/validation/ts-035a/controls.mjs';
const rows=serialized();
const parse=(v,b)=>parseScriptEnvelope(JSON.stringify(v),b);
test('T04 exact both-lane child -> composed envelope -> parse/assert/inspect roundtrip',()=>{
 for(const r of rows) {
  const child=childParse(r.bytes,r.binding),v=envelope(child,r);
  assert.deepEqual(v,r.envelope,r.id);
  assert.deepEqual(parse(v,r.binding),v);
  assert.deepEqual(assertScriptContext(v,r.context,r.binding),v);
  assert.deepEqual(inspectScriptEnvelope(JSON.stringify(v),r.context,transport(r),r.binding),v);
  assert.throws(()=>oldParse(JSON.stringify(v)));
 }
});
test('T02/D01 every required nested envelope key/unknown key is rejected',()=>{
 for(const r of rows) for(const [name,v] of mutations(r.envelope)) assert.throws(()=>parse(v,r.binding),r.id+'/'+name);
});
test('T02 both envelope text and byte transports reject duplicate, UTF8, size and versions',()=>{
 for(const r of rows.filter(r=>r.id.endsWith('/normal'))) {
  const json=JSON.stringify(r.envelope);
  for(const x of ['{}',json.slice(0,-1),json+json,json.replace('"runId":','"runId":"extra","runId":'),
   json.replace('"runId":','"\\u0072unId":"extra","runId":'),Buffer.from([0xc0,0xaf]),Buffer.alloc(65537,32)]) {
   assert.throws(()=>parseScriptEnvelope(x,r.binding));
   assert.deepEqual(inspectScriptEnvelope(x,r.context,transport(r),r.binding),{status:'host-fault',reasonCode:'protocol'});
  }
  for(const version of [1,3]) {const v=copy(r.envelope);v.identity.schemaVersion=version;assert.throws(()=>parse(v,r.binding));}
 }
});
test('T03/B01 full boundary independently rejects binding and context drift',()=>{
 for(const r of rows.filter(r=>r.id.endsWith('/normal'))) {
  for(const [name,b] of mutations(r.binding)) assert.throws(()=>parse(r.envelope,b),name);
  for(const edit of [b=>b.sources[0].transformedText='changed',b=>b.variant='non-strict',b=>b.variant='module',b=>b.units[0].ordinal=4,
   b=>b.requestSha256='b'.repeat(64),b=>b.limits.steps++,b=>b.realms[1].profile='legacy',b=>b.sources.push(b.sources[0]),b=>b.preflightId='other']) {
   const b=copy(r.binding);edit(b);assert.throws(()=>parse(r.envelope,b));
  }
  for(const [section,key] of [['identity','sourceSha256'],['identity','engineBuildSha256'],['identity','adapterSha256'],['identity','policySha256'],['inputs','ruleRegistrySha256'],['inputs','capabilityLedgerSha256']]) {
   const context=copy(r.context);context[section][key]='b'.repeat(64);assert.throws(()=>assertScriptContext(r.envelope,context,r.binding));
  }
  const context=copy(r.context);context.identity.variant='non-strict';assert.throws(()=>assertScriptContext(r.envelope,context,r.binding));
  const v=copy(r.envelope);v.classification.status='fail';assert.throws(()=>parse(v,r.binding));
  v.classification=copy(r.envelope.classification);v.classification.reasonCode='forged';assert.throws(()=>parse(v,r.binding));
  v.classification=copy(r.envelope.classification);v.classification.blockers=[{status:'unsupported-feature',reasonCode:'blocked'}];assert.throws(()=>parse(v,r.binding));
  assert.throws(()=>parse(r.envelope,null));
 }
});
test('all child semantic mutations are revalidated by the envelope boundary',()=>{
 for(const r of rows) {
  const edits=[v=>v.evidence.testBodyEvaluated=!v.evidence.testBodyEvaluated,v=>v.evidence.harnessValidated=true,
   v=>v.evidence.operation.unitId='unknown',v=>v.evidence.operation.realmId='unknown',v=>v.evidence.completedUnits=['u0'],v=>v.evidence.preflightId='forged'];
  if(r.child.source) edits.push(v=>v.evidence.source.location.line=99);
  if(r.child.result.kind==='unsupported-operation') edits.push(v=>v.observation.phase='parse',v=>v.observation.capabilityCode='parse.unexpected',v=>v.observation.kind='unsupported-syntax',v=>v.observation.constructor={});
  if(r.child.result.kind==='throw') edits.push(v=>v.observation.original.valueKind='invalid',v=>v.observation.constructor.realmId='unknown');
  for(const edit of edits) {const v=copy(r.envelope);edit(v);assert.throws(()=>parse(v,r.binding),r.id);}
  for(const diagnostic of [null,'',1,{}]) {const v=copy(r.envelope);v.observation.diagnostic=diagnostic;assert.throws(()=>parse(v,r.binding));}
  if(r.child.result.kind==='normal') {const v=copy(r.envelope);v.observation.diagnostic='text';assert.throws(()=>parse(v,r.binding));}
 }
});
function parent(base,observation,status,reasonCode,process={exitCode:null,signal:null,deadlineExpired:false}) {
 const r=copy(base),v=r.envelope;
 v.evidence={...v.evidence,stage:observation.kind==='not-run'?'input':'driver',operation:null,source:null,testBodyEvaluated:false,harnessValidated:false,preflightId:null,completedUnits:[],inspection:null,process};
 v.observation=observation;
 v.classification={status,reasonCode,blockers:[],expectedNegative:null,observedPhase:null,observedConstructorName:null};
 r.context.expectedNegative=null;
 if(observation.kind==='not-run') {v.classification.blockers=[{status,reasonCode}];r.context.blockers=copy(v.classification.blockers);}
 return r;
}
test('D01 all parent-only alternatives retain optional diagnostics and reject malformed arms',()=>{
 for(const base of rows.filter(r=>r.id.endsWith('/normal'))) {
  const alternatives=[parent(base,{kind:'timeout',wallMs:1000},'timeout','deadline',{exitCode:null,signal:'SIGTERM',deadlineExpired:true}),
   parent(base,{kind:'host-fault',faultCode:'crash'},'host-fault','crash',{exitCode:70,signal:null,deadlineExpired:false}),
   parent(base,{kind:'host-fault',faultCode:'protocol'},'host-fault','protocol'),
   parent(base,{kind:'not-run',reasonCode:'blocked'},'unsupported-feature','blocked'),
   parent(base,{kind:'resource-limit',guardCode:'output',count:1025,limit:1024},'resource-limit','output',{exitCode:null,signal:'SIGTERM',deadlineExpired:false})];
  for(const r of alternatives) for(const diagnostic of [undefined,'TypeError: text only']) {
   const v=copy(r.envelope);if(diagnostic!==undefined)v.observation.diagnostic=diagnostic;
   assert.deepEqual(parse(v,r.binding),v);
   assert.deepEqual(assertScriptContext(v,r.context,r.binding),v);
   const facts=transport(r);
   if(v.observation.kind==='resource-limit') Object.assign(facts,{outputBytes:1025,capCount:1025,capKilled:true});
   assert.deepEqual(inspectScriptEnvelope(JSON.stringify(v),r.context,facts,r.binding),v);
   if(v.observation.kind==='not-run') assert.deepEqual(parse(v,null),v);else assert.throws(()=>parse(v,null));
   for(const [name,mutant] of mutations(v)) assert.throws(()=>parse(mutant,r.binding),name);
   for(const bad of [null,'',1,{}]) {const mutant=copy(v);mutant.observation.diagnostic=bad;assert.throws(()=>parse(mutant,r.binding));}
   for(const key of ['evidence','identity','inputs']) {const mutant=copy(v);mutant[key].diagnostic='text';assert.throws(()=>parse(mutant,r.binding));}
  }
 }
});
test('T04 trusted transport priority and cap-kill authenticated roundtrip',()=>{
 for(const base of rows.filter(r=>r.id.endsWith('/normal'))) {
  const json=JSON.stringify(base.envelope),t=transport(base);
  assert.deepEqual(inspectScriptEnvelope(json,base.context,{...t,process:{exitCode:70,signal:null,deadlineExpired:false}},base.binding),{status:'host-fault',reasonCode:'crash'});
  assert.deepEqual(inspectScriptEnvelope('',base.context,{...t,process:{exitCode:70,signal:null,deadlineExpired:true},outputBytes:2000,capCount:1500},base.binding),{status:'timeout',reasonCode:'deadline'});
  assert.deepEqual(inspectScriptEnvelope('',base.context,{...t,process:{exitCode:70,signal:null,deadlineExpired:false},outputBytes:2000,capCount:1500,capKilled:true,crashBeforeCap:true},base.binding),{status:'host-fault',reasonCode:'crash'});
  const r=parent(base,{kind:'resource-limit',guardCode:'output',count:1500,limit:1024},'resource-limit','output',{exitCode:null,signal:'SIGTERM',deadlineExpired:false});
  const cap={...t,process:r.envelope.evidence.process,outputBytes:2000,capCount:1500,capKilled:true};
  assert.deepEqual(inspectScriptEnvelope(JSON.stringify(r.envelope),r.context,cap,r.binding),r.envelope);
  assert.deepEqual(inspectScriptEnvelope('',r.context,cap,r.binding),{status:'resource-limit',reasonCode:'output'});
  assert.deepEqual(inspectScriptEnvelope(JSON.stringify(r.envelope),r.context,{...cap,capKilled:false},r.binding),{status:'host-fault',reasonCode:'crash'});
  assert.deepEqual(inspectScriptEnvelope(JSON.stringify(r.envelope),r.context,t,r.binding),{status:'host-fault',reasonCode:'protocol'});
  for(const patch of [{capCount:1024},{capCount:2001},{capCount:null,capKilled:true},{capCount:-1}]) assert.throws(()=>inspectScriptEnvelope(json,base.context,{...cap,...patch},base.binding));
  const absent=copy(t);delete absent.capCount;assert.throws(()=>inspectScriptEnvelope(json,base.context,absent,base.binding));
  const forged=copy(base.envelope);forged.evidence.capKilled=true;assert.throws(()=>parse(forged,base.binding));
 }
});
test('nonraw reload and observation mode, body provenance and context remain separate',()=>{
 for(const base of rows.filter(r=>r.id.endsWith('/normal'))) {
  const r=harnessRow(base);assert.deepEqual(parse(r.envelope,r.binding),r.envelope);
  const missing=copy(r.envelope);missing.evidence.harnessValidated=false;assert.throws(()=>parse(missing,r.binding));
  for(const completedUnits of [[],['u1','u0','u2'],['u0','u1']]) {const v=copy(r.envelope);v.evidence.completedUnits=completedUnits;assert.throws(()=>parse(v,r.binding));}
  const h=copy(r.envelope);h.evidence.stage='harness';h.evidence.operation={stage:'harness',phase:'body',unitId:'u1',realmId:'test'};h.evidence.testBodyEvaluated=false;h.evidence.completedUnits=['u0','u1'];h.classification.status='harness-error';h.classification.reasonCode='harness';assert.doesNotThrow(()=>parse(h,r.binding));
  const b=copy(base.binding);b.mode='script-observation';rebind(b);
  const v=copy(base.envelope);v.identity.mode=b.mode;v.inputs.requestSha256=b.requestSha256;v.inputs.capabilityLedgerSha256=null;delete v.classification;assert.doesNotThrow(()=>parse(v,b));
  v.classification=copy(base.envelope.classification);assert.throws(()=>parse(v,b));
 }
});
test('retained source text is actually UTF8-decodable; exact line extents in both layers',()=>{
 for(const r of rows.filter(r=>r.id.endsWith('/available'))) {
  for(const location of [{line:1,column:5},{line:2,column:8},{line:1,column:0},{line:4,column:1}]) {
   const c=copy(r.child);c.source.location=location;c.result.original.site=copy(c.source);
   assert.throws(()=>childParse(Buffer.from(JSON.stringify(c)),r.binding));
   assert.throws(()=>parse(envelope(c,r),r.binding));
  }
  const b=copy(r.binding);b.sources[0].transformedText='\ud800';b.units[0].sourceUnits=1;b.units[0].transformedSha256=hash(Buffer.from('\ud800'));rebind(b);
  const c=copy(r.child);c.requestSha256=b.requestSha256;
  assert.throws(()=>childParse(Buffer.from(JSON.stringify(c)),b));
  assert.throws(()=>parse(r.envelope,b));
 }
});
test('syntax allowlist and runtime domain remain disjoint at both boundaries',()=>{
 const codes=['lex.indeterminate-comment','lex.leading-zero','lex.numeric-literal','lex.indeterminate-string-newline','lex.string-escape',
  'lex.indeterminate-string-end','lex.operator','lex.character','parse.expected-token','parse.binding-identifier','parse.duplicate-binding',
  'parse.declaration-statement','parse.return-context','parse.line-terminator','parse.throw-expression','parse.loop-context','parse.duplicate-parameter',
  'parse.property-name','parse.assignment-target','parse.delete-identifier','parse.array-spread','parse.object-key','parse.prototype-literal','parse.unexpected','script.uncertified-conflict'];
 for(const r of rows.filter(r=>r.id.endsWith('/unsupported-syntax'))) {
  for(const capabilityCode of codes) {
   const c=copy(r.child);c.result.capabilityCode=capabilityCode;
   assert.doesNotThrow(()=>childParse(Buffer.from(JSON.stringify(c)),r.binding));
   const v=envelope(c,r);v.classification.reasonCode=capabilityCode;assert.doesNotThrow(()=>parse(v,r.binding));
  }
  for(const capabilityCode of ['runtime.map-species','runtime.splice-species','runtime.json-reviver','runtime.slice-species','runtime.object-to-number','runtime.object-to-string','script.unknown','']) {
   const c=copy(r.child);c.result.capabilityCode=capabilityCode;
   assert.throws(()=>childParse(Buffer.from(JSON.stringify(c)),r.binding));assert.throws(()=>parse(envelope(c,r),r.binding));
  }
 }
});
test('result byte limit is inclusive at exactly 65536 in both decoder paths',()=>{
 for(const r of rows.filter(r=>r.id.endsWith('/normal'))) {
  const child=Buffer.concat([r.bytes,Buffer.alloc(65536-r.bytes.length,32)]);
  assert.deepEqual(childParse(child,r.binding),r.child);
  assert.throws(()=>childParse(Buffer.concat([child,Buffer.from(' ')]),r.binding));
  const json=Buffer.from(JSON.stringify(r.envelope));
  const full=Buffer.concat([json,Buffer.alloc(65536-json.length,32)]);
  assert.deepEqual(parseScriptEnvelope(full,r.binding),r.envelope);
  assert.throws(()=>parseScriptEnvelope(Buffer.concat([full,Buffer.from(' ')]),r.binding));
 }
});
test('approved amendment: same-source raw/non-strict contexts bind distinct request identities',()=>{
 for(const r of rows.filter(r=>r.id.endsWith('/normal'))) {
  const b=copy(r.binding);b.variant='non-strict';b.preflightId='preflight';rebind(b);
  assert.notEqual(b.requestSha256,r.binding.requestSha256);
  assert.deepEqual(b.sources,r.binding.sources);
  const c=copy(r.child);c.requestSha256=b.requestSha256;c.preflightId='preflight';c.harnessValidated=true;
  const v=envelope(c,r);v.identity.variant='non-strict';v.inputs.requestSha256=b.requestSha256;v.inputs.preflightId='preflight';
  assert.doesNotThrow(()=>childParse(Buffer.from(JSON.stringify(c)),b));assert.doesNotThrow(()=>parse(v,b));
  const context={identity:copy(v.identity),inputs:copy(v.inputs),expectedNegative:null,blockers:[]};
  assert.doesNotThrow(()=>assertScriptContext(v,context,b));
  for(const variant of ['raw','module',undefined]) {
   const bad=copy(b);bad.variant=variant;if(variant===undefined)delete bad.variant;rebind(bad);
   const cc=copy(c);cc.requestSha256=bad.requestSha256;
   const vv=copy(v);vv.identity.variant=variant;vv.inputs.requestSha256=bad.requestSha256;
   assert.throws(()=>childParse(Buffer.from(JSON.stringify(cc)),bad));assert.throws(()=>parse(vv,bad));
  }
  b.preflightId=null;rebind(b);c.requestSha256=b.requestSha256;c.preflightId=null;c.harnessValidated=false;
  v.inputs.requestSha256=b.requestSha256;v.inputs.preflightId=null;v.evidence.preflightId=null;v.evidence.harnessValidated=false;
  assert.throws(()=>childParse(Buffer.from(JSON.stringify(c)),b));assert.throws(()=>parse(v,b));
 }
});
test('unlaunched input rejection roundtrips with null binding and unavailable provenance',()=>{
 for(const base of rows.filter(r=>r.id.endsWith('/normal'))) {
  const r=parent(base,{kind:'not-run',reasonCode:'blocked'},'unsupported-feature','blocked');
  const v=r.envelope;
  for(const key of ['corpusRevision','manifestSha256','path','blob','sourceSha256','engineCommit','engineBuildSha256','adapterSha256','policySha256']) v.identity[key]=null;
  for(const key of ['transformedSourceSha256','profileId','capabilityLedgerSha256','host','platform','toolchain','requestSha256','ruleRegistrySha256']) v.inputs[key]=null;
  v.inputs.units=[];v.inputs.realms=[];for(const key of Object.keys(v.inputs.limits))v.inputs.limits[key]=null;
  v.evidence.stdoutSha256=null;v.evidence.stderrSha256=null;v.evidence.elapsedMs=null;
  r.context.identity=copy(v.identity);r.context.inputs=copy(v.inputs);
  assert.deepEqual(parse(v,null),v);
  assert.deepEqual(inspectScriptEnvelope(JSON.stringify(v),r.context,{process:v.evidence.process,outputBytes:0,outputLimit:1024,capCount:null,capKilled:false,crashBeforeCap:false},null),v);
  const launched=copy(v);launched.evidence.process.exitCode=0;assert.throws(()=>parse(launched,null));
 }
});
