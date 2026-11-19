import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {composeScriptEnvelope} from '../../../tools/test262/script-result.mjs';
const rows=JSON.parse(readFileSync(new URL('../../../test/fixtures/script-observation-serialization/frozen.json',import.meta.url)));
const controls=[];
function draft(row){const v=structuredClone(row.envelope);delete v.classification;return JSON.stringify(v);}
for(const row of rows){
 const input=draft(row),context=structuredClone(row.context),binding=structuredClone(row.binding);
 const before=JSON.stringify({context,binding});
 const output=composeScriptEnvelope(Buffer.from(input),context,binding);
 assert.deepEqual(output,row.envelope,row.id);assert.equal(JSON.stringify({context,binding}),before);
 assert.notEqual(output.classification.blockers,context.blockers);
 if(context.expectedNegative){assert.notEqual(output.classification.expectedNegative,context.expectedNegative);context.expectedNegative.type='changed';assert.deepEqual(output,row.envelope);}
 context.blockers.push({status:'unsupported-feature',reasonCode:'feature'});assert.deepEqual(output,row.envelope);
 for(const section of ['identity','inputs'])for(const key of Object.keys(row.context[section])){
  const changed=structuredClone(row.context);changed[section][key]=changed[section][key]===null?'changed':null;
  assert.throws(()=>composeScriptEnvelope(input,changed,row.binding));controls.push({id:row.id,kind:'context',section,key});
 }
 for(const key of Object.keys(row.binding)){
  const changed=structuredClone(row.binding);delete changed[key];assert.throws(()=>composeScriptEnvelope(input,row.context,changed));controls.push({id:row.id,kind:'binding-missing',key});
 }
 for(const key of ['expectedNegative','blockers']){
  const changed=structuredClone(row.context);delete changed[key];assert.throws(()=>composeScriptEnvelope(input,changed,row.binding));controls.push({id:row.id,kind:'context-missing',key});
 }
 const wrongMode=JSON.parse(input);wrongMode.identity.mode='script-observation';assert.throws(()=>composeScriptEnvelope(JSON.stringify(wrongMode),row.context,row.binding));
}
// Mirror the already accepted unlaunched/null-provenance decoder case at the
// constructor boundary, where no transport or binding may be invented.
const unlaunched=structuredClone(rows.find(r=>r.id.endsWith('/normal')));
const v=unlaunched.envelope;
v.evidence={...v.evidence,stage:'input',operation:null,source:null,testBodyEvaluated:false,harnessValidated:false,preflightId:null,completedUnits:[],inspection:null,process:{exitCode:null,signal:null,deadlineExpired:false},stdoutSha256:null,stderrSha256:null,elapsedMs:null};
v.observation={kind:'not-run',reasonCode:'blocked'};
v.classification={status:'unsupported-feature',reasonCode:'blocked',blockers:[{status:'unsupported-feature',reasonCode:'blocked'}],expectedNegative:null,observedPhase:null,observedConstructorName:null};
for(const key of ['corpusRevision','manifestSha256','path','blob','sourceSha256','engineCommit','engineBuildSha256','adapterSha256','policySha256'])v.identity[key]=null;
for(const key of ['transformedSourceSha256','profileId','capabilityLedgerSha256','host','platform','toolchain','requestSha256','ruleRegistrySha256'])v.inputs[key]=null;
v.inputs.units=[];v.inputs.realms=[];for(const key of Object.keys(v.inputs.limits))v.inputs.limits[key]=null;
unlaunched.context={identity:structuredClone(v.identity),inputs:structuredClone(v.inputs),expectedNegative:null,blockers:structuredClone(v.classification.blockers)};
assert.deepEqual(composeScriptEnvelope(draft(unlaunched),unlaunched.context,null),v);
const launched=JSON.parse(draft(unlaunched));launched.evidence.process.exitCode=0;
assert.throws(()=>composeScriptEnvelope(JSON.stringify(launched),unlaunched.context,null));
const result={provenance:'Actual installed constructor, retained synthetic literals; no transport or authority',literalRows:rows.length,detachmentRows:rows.length,nullBindingPositive:1,nullBindingLaunchedNegative:1,negativeControls:controls.length,controls};
writeFileSync(new URL('constructor-controls.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({literalRows:rows.length,detachmentRows:rows.length,negativeControls:controls.length}));
