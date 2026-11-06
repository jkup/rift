// Offline, bounded: no production producer import, guest, build, or child process.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareScriptSelection,inspectScriptSelection} from '../../../tools/test262/script-plan.mjs';
import * as ledger from '../../../tools/test262/script-ledger.mjs';
import {frozenManifest,REVISION} from '../../../tools/test262/input.mjs';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {composeScriptEnvelope,parseScriptEnvelope,inspectScriptEnvelope} from '../../../tools/test262/script-result.mjs';
const here=fileURLToPath(new URL('./',import.meta.url)),out=mkdtempSync(resolve(here,'run-'));
const read=n=>JSON.parse(readFileSync(resolve(here,n))),save=(n,v)=>writeFileSync(resolve(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
async function pure(path,name){const js=stripTypeScriptTypes(readFileSync(resolve(here,path),'utf8'));writeFileSync(resolve(out,name),js,{flag:'wx'});return import(pathToFileURL(resolve(out,name)));}
const request=await pure('proposals/script-producer-request.ts','request.mjs');
const initial=await pure('initial-candidate/script-producer-request.ts','initial-request.mjs');
const future=read('future-producer-literals.json'),bad=read('argv-negatives.json');let positives=0;
for(const r of future.filter(r=>r.request.mode==='conformance')){
 const p=request.parseScriptProducerArguments(r.argv);
 assert.deepEqual(p,{request:{...r.request,units:r.request.units.map(u=>({...u,text:''}))},resultPath:'RESULT',sourcePaths:r.request.units.map(u=>'SOURCE-'+u.id)});
 request.validateScriptProducerRequest(r.request);positives++;
}
for(const r of bad)assert.throws(()=>request.parseScriptProducerArguments(r.argv),{message:r.error});
const strict=structuredClone(future.find(r=>r.request.mode==='conformance'&&r.request.variant==='strict').request);strict.units.at(-1).text='0;';
initial.validateScriptProducerRequest(strict);
assert.throws(()=>request.validateScriptProducerRequest(strict),{message:'script-producer/strict-transform'});
save('strict-transform-reduction.json',{claim:'pure validation, no guest executed',request:strict,initial:'accepted mislabeled strict source',corrected:'script-producer/strict-transform'});
const shapes=[];const base=structuredClone(future.find(r=>r.request.mode==='conformance'&&r.request.variant==='raw').request);
for(const section of ['', 'limits','units.0'])for(const operation of ['delete','extra']){
 const original=section==='limits'?base.limits:section==='units.0'?base.units[0]:base;
 for(const key of operation==='delete'?Object.keys(original):['unknown']){
  const candidate=structuredClone(base),part=section==='limits'?candidate.limits:section==='units.0'?candidate.units[0]:candidate;
  if(operation==='delete')delete part[key];else part[key]=true;
  let error;try{request.validateScriptProducerRequest(candidate);}catch(e){error=e.message;}
  assert(error);shapes.push({section,operation,key,candidate,error});
 }
}
save('request-shapes.json',shapes);
const retained=read('retained-codec-literals.json').rows;
for(const r of retained){assert.deepEqual(parseScriptDriverResult(Buffer.from(r.ascii),r.binding),r.child);assert.deepEqual(parseScriptEnvelope(JSON.stringify(r.envelope),r.binding),r.envelope);const draft=structuredClone(r.envelope);delete draft.classification;assert.deepEqual(composeScriptEnvelope(JSON.stringify(draft),r.context,r.binding),r.envelope);}
// Each actual decoder sees complete candidate bytes and full original binding.
// Optional diagnostic deletion is allowed by the schema, so is not a negative.
const malformed=[];
function objects(v,path=[]){if(v===null||typeof v!=='object')return [];let a=Array.isArray(v)?[]:[path];for(const k of Object.keys(v))a.push(...objects(v[k],[...path,k]));return a;}
for(const r of retained.filter((r,i)=>i<77))for(const section of ['child','binding'])for(const path of objects(r[section])){
 const original=path.reduce((o,k)=>o[k],r[section]);
 for(const key of [...Object.keys(original).filter(k=>k!=='diagnostic'),'__unknown']){
  const child=structuredClone(r.child),binding=structuredClone(r.binding),target=path.reduce((o,k)=>o[k],section==='child'?child:binding);
  if(key==='__unknown')target[key]=true;else delete target[key];
  assert.throws(()=>parseScriptDriverResult(JSON.stringify(child),binding));
  if(section==='binding')assert.throws(()=>parseScriptEnvelope(JSON.stringify(r.envelope),binding));
  malformed.push({id:r.id,section,path,key,child,binding,expected:'protocol'});
 }
}
save('malformed-literals.json',malformed);
const parent=[];const r=retained[0];
for(const [id,p,extra,expected] of [
 ['deadline',{exitCode:70,signal:null,deadlineExpired:true},{outputBytes:1048577,capCount:1048577,capKilled:true,crashBeforeCap:true},{status:'timeout',reasonCode:'deadline'}],
 ['crash',{exitCode:70,signal:null,deadlineExpired:false},{outputBytes:1048577,capCount:1048577,capKilled:true,crashBeforeCap:true},{status:'host-fault',reasonCode:'crash'}],
 ['cap',{exitCode:null,signal:'SIGTERM',deadlineExpired:false},{outputBytes:1048577,capCount:1048577,capKilled:true,crashBeforeCap:false},{status:'resource-limit',reasonCode:'output'}],
 ['protocol',{exitCode:0,signal:null,deadlineExpired:false},{outputBytes:0,capCount:null,capKilled:false,crashBeforeCap:false},{status:'host-fault',reasonCode:'protocol'}]]){
 const transport={process:p,outputLimit:r.binding.limits.outputBytes,...extra};const actual=inspectScriptEnvelope('{',r.context,transport,r.binding);assert.deepEqual(actual,expected);parent.push({id,bytes:'{',context:r.context,binding:r.binding,transport,expected,claim:'summary only, never receipt'});
}
save('parent-priority.json',parent);
const {manifest}=await frozenManifest(),actual=[];
for(const lane of ['node','native']){
 const token=await prepareScriptSelection({root:'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',revision:REVISION,lane,paths:manifest.entries.map(e=>e.path)}),selection=inspectScriptSelection(token);
 const owner=ledger.newScriptLedger(token),before=ledger.inspectScriptLedger(owner),initial=ledger.reportScriptLedger(owner),slots=selection.files.flatMap(f=>f.slots??[]);
 assert.equal(selection.policy.files.length,242);assert.equal(selection.authority.entries.length,0);assert.equal(slots.length,60);assert(slots.every(s=>s.admission==='blocked'));
 for(const forged of [{},retained[0].envelope,{receiptId:'fake'},base]){assert.throws(()=>ledger.appendScriptPolicy(owner,slots[0].id,null,forged),/script-ledger\/arguments/);assert.deepEqual(ledger.inspectScriptLedger(owner),before);}
 for(const s of slots)ledger.appendScriptPolicy(owner,s.id);
 const final=ledger.reportScriptLedger(owner);assert.equal(final.counts['unsupported-feature'],19);assert.equal(final.counts['unsupported-profile'],41);assert.equal(final.completed,60);assert.equal(final.executedVariants,0);assert.equal(final.testBodyEvaluatedVariants,0);
 actual.push({lane,selection,initial,history:ledger.inspectScriptLedger(owner),final,denied:4});
}
save('actual-denied.json',actual);
const summary={pureRequestPositives:positives,argvNegatives:bad.length,shapeNegatives:shapes.length,retainedCodec:retained.length,malformed:malformed.length,parentPriority:parent.length,actualLanes:actual.length,conformanceExecutions:0,nativeBuilds:0,guestLaunches:0};save('summary.json',summary);console.log(JSON.stringify({out,...summary}));
