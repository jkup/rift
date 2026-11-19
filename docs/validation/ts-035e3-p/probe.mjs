// Bounded offline evidence. No launch, compiler, registry write or host eval.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareScriptSelection,inspectScriptSelection} from '../../../tools/test262/script-plan.mjs';
import * as ledger from '../../../tools/test262/script-ledger.mjs';
import {REVISION,frozenManifest} from '../../../tools/test262/input.mjs';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope,inspectScriptEnvelope} from '../../../tools/test262/script-result.mjs';
import {composeScriptEnvelope} from './proposals/script-result.mjs';
const here=dirname(fileURLToPath(import.meta.url)), out=mkdtempSync(resolve(here,'run-'));
const save=(name,value)=>writeFileSync(resolve(out,name),JSON.stringify(value,null,2)+'\n');
const rows=JSON.parse(readFileSync(resolve(here,'../../../test/fixtures/script-observation-serialization/frozen.json')));
const clone=structuredClone, hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const {manifest}=await frozenManifest();const actual=[];
for(const lane of ['node','native']){
 const token=await prepareScriptSelection({root:'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',revision:REVISION,lane,paths:manifest.entries.map(e=>e.path)});
 const selection=inspectScriptSelection(token),owner=ledger.newScriptLedger(token),before=ledger.inspectScriptLedger(owner);
 assert.equal(selection.authority.entries.length,0);const slots=selection.files.flatMap(f=>f.slots??[]);assert.equal(slots.length,60);assert(slots.every(s=>s.admission==='blocked'));
 for(const forged of [{},clone(rows[0].envelope),{receiptId:'forged'},JSON.parse('{}')]){
  assert.throws(()=>ledger.appendScriptPolicy(owner,slots[0].id,null,forged),/script-ledger\/arguments/);
  assert.throws(()=>ledger.inspectScriptLedger(forged),/script-ledger\/token/);
  assert.deepEqual(ledger.inspectScriptLedger(owner),before);
 }
 const initial=ledger.reportScriptLedger(owner);for(const s of slots)ledger.appendScriptPolicy(owner,s.id);
 const final=ledger.reportScriptLedger(owner);assert.equal(final.counts['unsupported-feature'],19);assert.equal(final.counts['unsupported-profile'],41);assert.equal(final.executedVariants,0);assert.equal(final.testBodyEvaluatedVariants,0);assert.equal(final.completed,60);
 actual.push({lane,selection,initial,final,denied:8});
}
save('actual-denied.json',actual);
const literal=[],mutations=[];
for(const r of rows){
 // These are retained synthetic codec literals, NOT fresh Node/native output.
 assert.deepEqual(parseScriptDriverResult(Buffer.from(r.ascii),r.binding),r.child);
 assert.deepEqual(parseScriptEnvelope(JSON.stringify(r.envelope),r.binding),r.envelope);
 const draft=clone(r.envelope);delete draft.classification;
 assert.deepEqual(composeScriptEnvelope(JSON.stringify(draft),r.context,r.binding),r.envelope);
 literal.push({provenance:'retained synthetic A fixture',id:r.id,binding:r.binding,context:r.context,child:r.child,envelope:r.envelope});
}
const base=rows.find(r=>r.id.endsWith('/normal'));
for(const section of ['identity','inputs'])for(const key of Object.keys(base.context[section])){
 const context=clone(base.context);context[section][key]=null;
 if(base.context[section][key]===null)context[section][key]='changed';
 const draft=clone(base.envelope);delete draft.classification;
 assert.throws(()=>composeScriptEnvelope(JSON.stringify(draft),context,base.binding));
 mutations.push({id:`context/${section}/${key}`,context,expected:'reject'});
}
for(const key of ['nonce','requestSha256','mode','variant','units','realms','preflightId','action','limits','sources']){
 const binding=clone(base.binding);delete binding[key];
 assert.throws(()=>parseScriptDriverResult(Buffer.from(base.ascii),binding));assert.throws(()=>parseScriptEnvelope(JSON.stringify(base.envelope),binding));
 mutations.push({id:'binding/missing/'+key,binding,expected:'both reject'});
}
const facts={process:{exitCode:0,signal:null,deadlineExpired:false},outputBytes:0,outputLimit:1024,capCount:null,capKilled:false,crashBeforeCap:false};
const priority=[
 {id:'deadline+crash+cap+malformed',patch:{process:{exitCode:70,signal:null,deadlineExpired:true},outputBytes:2000,capCount:1500,capKilled:true,crashBeforeCap:true},expected:{status:'timeout',reasonCode:'deadline'}},
 {id:'crash-before-cap+malformed',patch:{process:{exitCode:70,signal:null,deadlineExpired:false},outputBytes:2000,capCount:1500,capKilled:true,crashBeforeCap:true},expected:{status:'host-fault',reasonCode:'crash'}},
 {id:'cap+malformed',patch:{process:{exitCode:null,signal:'SIGTERM',deadlineExpired:false},outputBytes:2000,capCount:1500,capKilled:true},expected:{status:'resource-limit',reasonCode:'output'}},
 {id:'malformed-only',patch:{},expected:{status:'host-fault',reasonCode:'protocol'}}
];
for(const row of priority){row.transport={...facts,...row.patch};row.actual=inspectScriptEnvelope('',base.context,row.transport,base.binding);assert.deepEqual(row.actual,row.expected);assert(!Object.hasOwn(row.actual,'identity'));}
save('full-codec-literals.json',literal);save('context-mutations.json',mutations);save('priority.json',priority);
// Lexical synthetic owner model. No production import can mint these tokens.
const receipts=new WeakMap(), spent=new WeakSet();const owner={},other={};let attempts=[];let revoked=false,busy=false;
const payload={receiptId:'r1',runId:'run',slotId:'s0',attempt:1,selectionSha256:hash(actual[0].selection),context:base.context,binding:base.binding,transport:facts,artifactHashes:{stdoutSha256:base.envelope.evidence.stdoutSha256,stderrSha256:base.envelope.evidence.stderrSha256,childSha256:hash(base.child)},envelope:base.envelope};
function mint(p=payload,o=owner){const t=Object.freeze({});receipts.set(t,{owner:o,payload:clone(p),processStarted:true});return t;}
function append(o,t,reason=null){
 assert(o===owner&&!revoked&&!busy,'owner');const r=receipts.get(t);assert(r&&!spent.has(t),'receipt');assert(r.owner===o,'receipt-owner');
 assert.equal(r.payload.runId,'run');assert.equal(r.payload.slotId,'s0');assert.equal(r.payload.attempt,attempts.length+1);assert.equal(r.payload.selectionSha256,payload.selectionSha256);
 assert.deepEqual(r.payload.context,payload.context);assert.deepEqual(r.payload.binding,payload.binding);assert.deepEqual(r.payload.transport,payload.transport);assert.deepEqual(r.payload.artifactHashes,payload.artifactHashes);assert.deepEqual(r.payload.envelope,payload.envelope);
 assert(attempts.length?typeof reason==='string'&&reason.trim():reason===null,'retry');
 const next=[...attempts,{sequence:attempts.length+1,slotId:'s0',attempt:r.payload.attempt,retryReason:reason,terminal:{kind:'transport',status:r.payload.envelope.classification.status,processStarted:r.processStarted,testBodyEvaluated:r.payload.envelope.evidence.testBodyEvaluated,payload:clone(r.payload)}}];
 attempts=next;spent.add(t);
}
const controls=[];
function reject(id,f,t){const old=clone(attempts);const was=t?spent.has(t):false;assert.throws(f);assert.deepEqual(attempts,old);if(t)assert.equal(spent.has(t),was);controls.push({id,expected:'reject; unchanged history and spent state',history:clone(attempts)});}
const good=mint();reject('forged',()=>append(owner,{}));reject('clone',()=>append(owner,clone(good)));reject('JSON',()=>append(owner,JSON.parse('{}')));reject('wrong-owner',()=>append(other,good),good);const foreign=mint(payload,other);reject('foreign-receipt',()=>append(owner,foreign),foreign);
for(const [key,value] of [['receiptId','r2'],['runId','other'],['slotId','s1'],['attempt',2],['selectionSha256','0'.repeat(64)]]){if(key==='receiptId')continue;const t=mint({...payload,[key]:value});reject(key,()=>append(owner,t),t);}
for(const key of ['context','binding','transport','artifactHashes','envelope']){const p=clone(payload);p[key]={};const t=mint(p);reject('partial/'+key,()=>append(owner,t),t);}
busy=true;reject('busy',()=>append(owner,good),good);busy=false;revoked=true;reject('revoked',()=>append(owner,good),good);revoked=false;
reject('first-retry-reason',()=>append(owner,good,'retry'),good);append(owner,good);assert(spent.has(good));controls.push({id:'commit',expected:'one history append and spent receipt',history:clone(attempts)});
reject('replay',()=>append(owner,good,'retry'),good);
const retry=mint({...payload,receiptId:'r2',attempt:2});reject('retry-missing-reason',()=>append(owner,retry),retry);append(owner,retry,'investigate');
// Persistence failures happen after synchronous commit, and have no refund path.
try{throw Error('simulated write failure');}catch{}assert(spent.has(retry));reject('persist-failure-no-revival',()=>append(owner,retry,'again'),retry);
save('private-owner-model.json',{warning:'Synthetic lexical model only; not live admitted reachability or filesystem evidence',controls,final:attempts});
// Preserve full existing arithmetic oracles with explicit provenance, never
// reinterpret their synthetic-admitted slots as E1 grants.
const reports=JSON.parse(readFileSync(resolve(here,'../ts-035e2-p/report-literals.json')));
save('report-literals.json',{source:'ts-035e2-p/report-literals.json, unchanged synthetic arithmetic requirements',reports});
save('results.json',{actualLanes:2,actualBlockedPerLane:60,actualDenials:16,retainedSyntheticCodecRows:rows.length,contextMutations:mutations.length,priority:priority.length,privateOwnerControls:controls.length,fullReportLiterals:reports.length,executionLaunches:0});
console.log(out);
