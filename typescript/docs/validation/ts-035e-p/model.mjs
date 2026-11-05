// Design oracle only: this is NOT a production planner or an admission authority.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const copy=structuredClone;
const eq=(a,b)=>assert.deepEqual(a,b);
const here='docs/validation/ts-035e-p/';
const rows=JSON.parse(readFileSync(here+'decoder-literals.json'));
const base=rows.find(r=>r.id==='alpha/normal');
const key={pin:base.context.identity.corpusRevision,path:base.context.identity.path,blob:base.context.identity.blob,
 sourceSha256:base.context.identity.sourceSha256,transformedSha256:base.context.inputs.transformedSourceSha256,
 variant:'raw',lane:'node',engineCommit:base.context.identity.engineCommit,engineBuildSha256:base.context.identity.engineBuildSha256,
 sourceClosureSha256:'1'.repeat(64),adapterClosureSha256:'2'.repeat(64),policySha256:'3'.repeat(64),
 manifestSha256:base.context.identity.manifestSha256,profileId:'synthetic-only',host:'synthetic-node',platform:'synthetic/windows-x64',
 toolchain:'scriptc-0.4.7/typescript-7.0.2',hostServices:[],units:base.binding.units,limits:base.binding.limits};
const debts=[{id:'profile:directive-script',status:'unsupported-profile',reasonCode:'directive-script'},
 {id:'runtime:coverage',status:'unsupported-feature',reasonCode:'runtime-capabilities'}];
// Production E1 accepts zero entries. This hypothetical reviewed authority is
// private to this oracle and cannot be supplied to any existing engine API.
const authority={registryVersion:1,kind:'script-runtime-capabilities',entries:[{id:'synthetic-cert',key,discharges:debts.map(d=>d.id),
 evidence:{node:'4'.repeat(64),native:'5'.repeat(64),requirements:['literal required behavior'],review:'synthetic-only'}}]};
function select(context,registry,trusted=authority){
 eq(registry,trusted);const result=copy(debts);
 for(const e of registry.entries){eq(e.key,context);for(const id of e.discharges){const n=result.findIndex(d=>d.id===id);assert(n>=0);result.splice(n,1);}}
 return result;
}
const cases=[];const record=(id,input,expected)=>cases.push({id,input:copy(input),expected:copy(expected)});
const empty={registryVersion:1,kind:'script-runtime-capabilities',entries:[]};
eq(select(key,empty,empty),debts);record('empty',{key,registry:empty},debts);
eq(select(key,authority),[]);record('synthetic-exact',{key,registry:authority},[]);
for(const field of Object.keys(key)){
 const changed=copy(key);changed[field]=field==='limits'?{...key.limits,steps:key.limits.steps+1}:field==='hostServices'?['clock']:field==='units'?[...key.units,key.units[0]]:'changed';
 assert.throws(()=>select(changed,authority));record('context-'+field,{key:changed,registry:authority},'reject-before-admission');
}
for(const limit of Object.keys(key.limits)){const changed=copy(key);changed.limits[limit]++;assert.throws(()=>select(changed,authority));record('limit-'+limit,{key:changed,registry:authority},'reject-before-admission');}
for(const [id,edit] of [['forged',a=>a.entries[0].discharges=[]],['unknown-version',a=>a.registryVersion=2],['duplicate',a=>a.entries.push(copy(a.entries[0]))],['missing-native',a=>delete a.entries[0].evidence.native],['stale-build',a=>a.entries[0].key.engineBuildSha256='6'.repeat(64)]]){
 const r=copy(authority);edit(r);assert.throws(()=>select(key,r));record(id,{key,registry:r},'reject-before-admission');
}
const partial=copy(authority);partial.entries[0].discharges=['profile:directive-script'];eq(select(key,partial,partial),[debts[1]]);record('partial-debt-discharge',{key,registry:partial},[debts[1]]);
// Ordered repeated occurrences are significant, even if bytes are identical.
const ordered=copy(key);ordered.units=[0,1,2].map(n=>({...copy(key.units[0]),id:'u'+n,ordinal:n,role:n===2?'test':'harness',path:n===2?'test/synthetic.js':'harness/repeated.js'}));
const oa=copy(authority);oa.entries[0].key=ordered;eq(select(ordered,oa,oa),[]);
for(const [id,units] of [['reorder',[ordered.units[1],ordered.units[0],ordered.units[2]]],['deduplicate',[ordered.units[0],ordered.units[2]]],['duplicate-extra',[...ordered.units,ordered.units[1]]]]){const changed={...ordered,units};assert.throws(()=>select(changed,oa,oa));record(id,{key:changed,registry:oa},'reject-before-admission');}
writeFileSync(here+'admission-literals.json',JSON.stringify(cases,null,2)+'\n');
// A separate ledger policy oracle. Real decoders are exercised by audit.mjs.
const statuses=['pass','fail','unsupported-feature','unsupported-profile','harness-error','resource-limit','timeout','host-fault'];
const selection={selectionVersion:2,lane:'node',runId:'synthetic-run',slots:statuses.map((status,n)=>({id:'s'+n,status,goal:'Script'})).concat({id:'s8',status:null,goal:'Module'})};
const attempts=[];
function append(id,status,receipt,retryReason=null){
 assert(selection.slots.some(s=>s.id===id));assert(statuses.includes(status));assert(!attempts.some(a=>a.receipt===receipt));
 const prior=attempts.filter(a=>a.id===id);assert(prior.length?typeof retryReason==='string'&&retryReason.trim():retryReason===null);
 attempts.push({id,attempt:prior.length+1,status,receipt,retryReason});
}
function report(){const counts=Object.fromEntries(statuses.map(s=>[s,0]));for(const s of selection.slots){const a=attempts.find(a=>a.id===s.id);if(a)counts[a.status]++;}const completed=Object.values(counts).reduce((a,b)=>a+b,0);return {plannedVariants:9,completed,missing:9-completed,attempts:attempts.length,counts,complete:completed===9,passOverPlanned:completed===9?{numerator:counts.pass,denominator:9}:null,conditionalPass:{numerator:counts.pass,denominator:counts.pass+counts.fail},exitCode:completed===9?1:2};}
const ledgerCases=[];
for(let n=0;n<8;n++)append('s'+n,statuses[n],'receipt'+n);
const partialExpected={plannedVariants:9,completed:8,missing:1,attempts:8,counts:{pass:1,fail:1,'unsupported-feature':1,'unsupported-profile':1,'harness-error':1,'resource-limit':1,timeout:1,'host-fault':1},complete:false,passOverPlanned:null,conditionalPass:{numerator:1,denominator:2},exitCode:2};
eq(report(),partialExpected);ledgerCases.push({id:'partial',selection:copy(selection),attempts:copy(attempts),expected:partialExpected});
append('s1','pass','retry1','explicit investigation');
eq(report(),{...partialExpected,attempts:9});ledgerCases.push({id:'retry-retains-first',selection:copy(selection),attempts:copy(attempts),expected:{...partialExpected,attempts:9}});
for(const args of [['s1','pass','retry1','replay'],['s1','pass','new',null],['unknown','pass','new',null],['s0','pass','new','   '],['s8','pass','new','first-with-retry']]){const before=copy(attempts);assert.throws(()=>append(...args));eq(attempts,before);ledgerCases.push({id:'reject-append',input:args,expectedAttempts:before});}
append('s8','unsupported-feature','module-policy');
const completeExpected={...partialExpected,completed:9,missing:0,attempts:10,counts:{...partialExpected.counts,'unsupported-feature':2},complete:true,passOverPlanned:{numerator:1,denominator:9},exitCode:1};eq(report(),completeExpected);
ledgerCases.push({id:'full-denominator',selection:copy(selection),attempts:copy(attempts),expected:completeExpected});
function validateHistory(snapshot){
 assert.equal(snapshot.selectionVersion,2);const seen=new Set(),next=new Map();
 for(const a of snapshot.attempts){assert(selection.slots.some(s=>s.id===a.id));assert(statuses.includes(a.status));assert(!seen.has(a.receipt));seen.add(a.receipt);
  const n=(next.get(a.id)??0)+1;assert.equal(a.attempt,n);next.set(a.id,n);assert(n===1?a.retryReason===null:typeof a.retryReason==='string'&&a.retryReason.trim());
 }
}
const snapshot={selectionVersion:2,attempts:copy(attempts)};validateHistory(snapshot);
for(const [id,edit] of [['mixed-version',s=>s.selectionVersion=1],['duplicate-receipt',s=>s.attempts[1].receipt=s.attempts[0].receipt],['attempt-gap',s=>s.attempts[0].attempt=2],['retry-before-first',s=>[s.attempts[1],s.attempts[8]]=[s.attempts[8],s.attempts[1]]],['unknown-slot',s=>s.attempts[0].id='foreign']]){
 const bad=copy(snapshot);edit(bad);assert.throws(()=>validateHistory(bad));ledgerCases.push({id,input:bad,expected:'reject-history'});
}
writeFileSync(here+'ledger-literals.json',JSON.stringify(ledgerCases,null,2)+'\n');
console.log(JSON.stringify({admissionLiterals:cases.length,ledgerLiterals:ledgerCases.length,productionImplementation:false}));
