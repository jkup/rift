// Private design arithmetic/state model, not production or an admission seam.
// No exports mint authority. The future transport model accepts only its own
// lexical receipt objects and is deliberately not imported by production.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
const statuses=['pass','fail','unsupported-feature','unsupported-profile','harness-error','resource-limit','timeout','host-fault'];
const clone=structuredClone;
function report(selection,attempts){
 const counts=Object.fromEntries(statuses.map(s=>[s,0]));
 let plannedVariants=0,completed=0,executedVariants=0,testBodyEvaluatedVariants=0,unplannedInputErrors=0,passedFiles=0;
 const files=selection.files.map(f=>{
  if(f.slots===null){unplannedInputErrors++;return {path:f.path,manifestId:f.manifestId,statuses:null,inputError:f.inputError,passed:false};}
  const rows=f.slots.map(s=>{plannedVariants++;const a=attempts.find(a=>a.slotId===s.id);if(a){completed++;counts[a.terminal.status]++;executedVariants+=Number(a.terminal.executed);testBodyEvaluatedVariants+=Number(a.terminal.testBodyEvaluated);}return {slotId:s.id,variant:s.variant,status:a?.terminal.status??null};});
  const passed=rows.length>0&&!f.inputError&&rows.every(s=>s.status==='pass');passedFiles+=Number(passed);
  return {path:f.path,manifestId:f.manifestId,statuses:rows,inputError:f.inputError,passed};
 });
 const complete=unplannedInputErrors===0&&completed===plannedVariants;
 return {lane:selection.lane,selectedFiles:selection.files.length,plannedVariants,executedVariants,testBodyEvaluatedVariants,unplannedInputErrors,completed,missing:plannedVariants-completed,attempts:attempts.length,counts,passedFiles,files,excludedFixtures:[],complete,passOverPlanned:complete?{numerator:counts.pass,denominator:plannedVariants}:null,conditionalPass:counts.pass+counts.fail?{numerator:counts.pass,denominator:counts.pass+counts.fail}:null,exitCode:!complete?2:counts.pass===plannedVariants?0:1};
}
let checks=0;
for(const r of read('report-literals.json')){assert.deepEqual(report(r.selection,r.attempts),r.expected,r.id);checks++;}
const selection=read('report-literals.json').find(r=>r.id==='all-statuses-partial').selection;
const receipts=new WeakMap(),spent=new WeakSet();let history=[];
// This lexical function is test-model code only; it is not a proposed export.
function receipt(slotId,status,ordinal){const token=Object.freeze({});receipts.set(token,{slotId,status,ordinal,lane:'node'});return token;}
function append(slotId,token,reason=null){
 const r=receipts.get(token);assert(r&&!spent.has(token),'receipt');
 const slot=selection.files.flatMap(f=>f.slots??[]).find(s=>s.id===slotId);
 assert(slot&&slot.admission==='synthetic-admitted','blocked');assert.equal(slotId,r.slotId);assert.equal(r.lane,selection.lane);
 const prior=history.filter(a=>a.slotId===slotId);assert.equal(r.ordinal,prior.length+1);
 assert(prior.length?typeof reason==='string'&&reason.trim():reason===null);
 const next=[...history,{sequence:history.length+1,slotId,attempt:r.ordinal,retryReason:reason,terminal:{kind:'synthetic-transport',status:r.status,executed:true,testBodyEvaluated:true}}];
 history=next;spent.add(token);
}
const reject=(fn)=>{const before=JSON.stringify(history);assert.throws(fn);assert.equal(JSON.stringify(history),before);checks++;};
const first=receipt('s1','fail',1);reject(()=>append('unknown',first));assert(!spent.has(first));append('s1',first);checks++;
reject(()=>append('s1',first,'replay'));const retry=receipt('s1','pass',2);reject(()=>append('s1',retry));assert(!spent.has(retry));append('s1',retry,'investigate');assert(spent.has(retry));checks++;
reject(()=>append('s1',{},'JSON clone'));reject(()=>append('s1',clone(retry),'clone'));
reject(()=>append('s8',receipt('s8','unsupported-feature',1))); // Module policy-only
reject(()=>append('s1',receipt('s1','pass',4),'gap'));
const wrongLane=receipt('s0','pass',1);receipts.get(wrongLane).lane='native';reject(()=>append('s0',wrongLane));assert(!spent.has(wrongLane));
const wrongSlot=receipt('s0','pass',1);reject(()=>append('s1',wrongSlot,'wrong slot'));assert(!spent.has(wrongSlot));
reject(()=>append('s0',receipt('s0','pass',1),'first reason'));
for(const status of statuses)reject(()=>append('s8',receipt('s8',status,1)));
const anchor=JSON.stringify({ledgerVersion:2,history});
function reopen(bytes){assert.equal(bytes,anchor,'trusted private anchor');const state=JSON.parse(bytes);assert.equal(state.ledgerVersion,2);return state;}
assert.deepEqual(reopen(anchor).history,history);checks++;
const edits=[['version',x=>x.ledgerVersion=1],['gap',x=>x.history[0].attempt=2],['reorder',x=>x.history.reverse()],['duplicate',x=>x.history.push(clone(x.history[0]))],['first',x=>x.history[0].terminal.status='pass'],['reason',x=>x.history[1].retryReason='tampered'],['sequence',x=>x.history[1].sequence=4],['unknown-slot',x=>x.history[0].slotId='foreign'],['drop-tail',x=>x.history.pop()]];
for(const [id,edit] of edits){const x=JSON.parse(anchor);edit(x);assert.throws(()=>reopen(JSON.stringify(x)),id);checks++;}
// Process-local checkpoint authority, never reconstructed from JSON.
const checkpoints=new WeakMap();const current={generation:1,dirty:false,policy:'accepted-policy',writable:true};
const checkpoint=Object.freeze({});checkpoints.set(checkpoint,{generation:1,bytes:anchor,policy:'accepted-policy',reopened:false});
function trustedReopen(token,bytes){
 const c=checkpoints.get(token);assert(c&&!c.reopened&&c.generation===current.generation);
 assert(!current.dirty&&c.policy===current.policy);reopen(bytes);
 c.reopened=true;current.writable=false;return {writable:true};
}
for(const token of [{},clone(checkpoint),JSON.parse('{}')]){assert.throws(()=>trustedReopen(token,anchor));checks++;}
current.dirty=true;assert.throws(()=>trustedReopen(checkpoint,anchor));checks++;current.dirty=false;
current.policy='drift';assert.throws(()=>trustedReopen(checkpoint,anchor));checks++;current.policy='accepted-policy';
current.generation=2;assert.throws(()=>trustedReopen(checkpoint,anchor));checks++;current.generation=1;
assert.throws(()=>trustedReopen(checkpoint,anchor+'\n'));checks++;assert(!checkpoints.get(checkpoint).reopened);
assert.deepEqual(trustedReopen(checkpoint,anchor),{writable:true});assert.equal(current.writable,false);checks++;
assert.throws(()=>trustedReopen(checkpoint,anchor));checks++;
// Durable protocol model: failure phases are literal transitions, not IO tests.
for(const row of read('persistence-literals.json')){
 let durable='old',dirty=true,state='ready',receiptSpent=true;
 if(['link-visible-unacknowledged','committed','conflicting-visible'].includes(row.phase))durable=row.phase==='conflicting-visible'?'foreign':'new';
 if(row.phase==='link-visible-unacknowledged'||row.phase==='conflicting-visible')state='indeterminate';
 if(row.phase==='committed')dirty=false;
 assert.deepEqual({durable,dirty,state,receiptSpent},row.expected,row.phase);checks++;
 if(state==='indeterminate'){assert.equal(durable==='new'?'acknowledge':'reject-conflict',row.recovery);checks++;}
}
const result={designModel:true,productionAuthority:false,checks};
writeFileSync(new URL('model-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
