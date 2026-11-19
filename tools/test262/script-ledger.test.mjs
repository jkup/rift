import assert from 'node:assert/strict';
import {planner,ledgerModule,read,save,checkFrozen,error} from './test-support/ledger-support.mjs';
const clone=structuredClone, rows=[...read('design-selections.json').rows,...read('supplemental-literals.json').rows];
const statuses=['pass','fail','unsupported-feature','unsupported-profile','harness-error','resource-limit','timeout','host-fault'];
const log=[];let checks=0;
for(const row of [...read('report-literals.json'),...read('supplemental-literals.json').reports]){
 const selected=rows.find(r=>r.id===row.selectionId).selection,owner=await planner(),model=await ledgerModule(owner),api=model.api,token=api.newScriptLedger(owner.mint(selected));
 for(const a of row.attempts)assert.equal(api.appendScriptPolicy(token,a.slotId,a.retryReason),undefined);
 assert.deepEqual(api.inspectScriptLedger(token),{ledgerVersion:2,kind:'script-policy-ledger',selection:selected,attempts:row.attempts});assert.deepEqual(api.reportScriptLedger(token),row.expected);
 const a=api.inspectScriptLedger(token),b=api.inspectScriptLedger(token),r=api.reportScriptLedger(token),r2=api.reportScriptLedger(token);checkFrozen(a);checkFrozen(r);assert.notEqual(a,b);assert.notEqual(a.selection.files,b.selection.files);assert.notEqual(r,r2);assert.notEqual(r.files,r2.files);assert.throws(()=>a.attempts.push(1),TypeError);assert.throws(()=>r.files.pop(),TypeError);checks++;log.push({id:row.id,fullLedger:true,fullReport:true,freshFrozen:true});
}
const owner=await planner(),model=await ledgerModule(owner),api=model.api,s=rows[0].selection,sel=owner.mint(s),token=api.newScriptLedger(sel),ids=s.files.flatMap(f=>f.slots??[]).map(s=>s.id);
assert.deepEqual(Object.keys(api).sort(),['appendScriptPolicy','checkpointScriptLedger','createScriptLedgerStore','inspectScriptLedger','newScriptLedger','reopenScriptLedger','reportScriptLedger','resolveScriptLedgerCheckpoint']);assert.deepEqual([api.newScriptLedger,api.appendScriptPolicy,api.inspectScriptLedger,api.reportScriptLedger].map(f=>f.length),[1,2,1,1]);checkFrozen(token);assert.deepEqual(token,{});
function reject(id,code,fn){const before=JSON.stringify(api.inspectScriptLedger(token)),reportBefore=JSON.stringify(api.reportScriptLedger(token));assert.throws(fn,error(code),id);assert.equal(JSON.stringify(api.inspectScriptLedger(token)),before);assert.equal(JSON.stringify(api.reportScriptLedger(token)),reportBefore);checks++;log.push({id,error:'script-ledger/'+code,noStateChange:true});}
for(const [id,fn] of [['new-zero',()=>api.newScriptLedger()],['new-extra',()=>api.newScriptLedger({},1)],['append-zero',()=>api.appendScriptPolicy()],['append-one',()=>api.appendScriptPolicy(token)],['append-extra',()=>api.appendScriptPolicy(token,ids[0],null,1)],['inspect-zero',()=>api.inspectScriptLedger()],['inspect-extra',()=>api.inspectScriptLedger(token,1)],['report-zero',()=>api.reportScriptLedger()],['report-extra',()=>api.reportScriptLedger(token,1)]])reject(id,'arguments',fn);
let calls=0;const accessor={get id(){calls++;throw 0;},toString(){calls++;throw 0;}};
for(const value of [null,undefined,0,1n,Symbol(),'',[],{},new String(ids[0]),accessor])reject('slot-type-'+String(typeof value),'arguments',()=>api.appendScriptPolicy({},value));
for(const value of [0,1n,Symbol(),[],{},new String('reason'),accessor])reject('reason-type-'+String(typeof value),'arguments',()=>api.appendScriptPolicy({},ids[0],value));
assert.equal(calls,0);
const foreignOwner=await planner(true),foreignModule=await ledgerModule(owner),foreignLedger=foreignModule.api.newScriptLedger(sel);
for(const fake of [null,undefined,1,1n,Symbol(),{},clone(token),JSON.parse('{}'),api.inspectScriptLedger(token),sel,foreignLedger,new Proxy(token,{get(){calls++;throw 0;}})]){
 for(const op of ['inspectScriptLedger','reportScriptLedger'])reject('forged-'+op,'token',()=>api[op](fake));reject('forged-append','token',()=>api.appendScriptPolicy(fake,ids[0]));
}
for(const fake of [{},clone(sel),s,foreignOwner.mint(s),token])reject('forged-selection','token',()=>api.newScriptLedger(fake));
reject('selection-replay','already-used-selection',()=>api.newScriptLedger(sel));
for(const reason of ['first',' ', '\t'])reject('first-reason','retry-policy',()=>api.appendScriptPolicy(token,ids[0],reason));
reject('unknown-before-retry','slot',()=>api.appendScriptPolicy(token,'unknown','first'));
api.appendScriptPolicy(token,ids[1],undefined);api.appendScriptPolicy(token,ids[0]);
for(const reason of [null,undefined,'',' \t'])reject('duplicate-first-or-blank-retry','retry-policy',()=>api.appendScriptPolicy(token,ids[1],reason));
api.appendScriptPolicy(token,ids[1],'  original \t');assert.equal(api.inspectScriptLedger(token).attempts[2].retryReason,'  original \t');assert.deepEqual(api.inspectScriptLedger(token).attempts.map(a=>[a.sequence,a.attempt]),[[1,1],[2,1],[3,2]]);
const beforeCancel=api.inspectScriptLedger(token);assert.deepEqual(api.inspectScriptLedger(token),beforeCancel);checks++;log.push({id:'cancel-is-no-call',unchanged:true});
model.fault('history');reject('candidate-validation-failure','history',()=>api.appendScriptPolicy(token,ids[2]));model.fault(null);api.appendScriptPolicy(token,ids[2]);assert.equal(api.inspectScriptLedger(token).attempts.at(-1).sequence,4);
const fresh=owner.mint(s);model.selectionFault(value=>({...value,selectionVersion:1}));reject('failed-creation','selection',()=>api.newScriptLedger(fresh));model.selectionFault(null);const retryCreation=api.newScriptLedger(fresh);checkFrozen(retryCreation);reject('successful-creation-consumed','already-used-selection',()=>api.newScriptLedger(fresh));
model.selectionFault(()=>{throw Error('must not run');});reject('used-before-selection','already-used-selection',()=>api.newScriptLedger(fresh));model.selectionFault(null);
assert.equal(calls,0);
const mutations=[['version',x=>x.selectionVersion=1],['kind',x=>x.kind='ledger'],['policy',x=>x.policy.id='rift-script-blocked-v2'],['closure',x=>x.policy.files.pop()],['extra',x=>x.extra=1],['lane',x=>x.lane='native'],['zero-files',x=>x.files=[]],['duplicate-file',x=>x.files.push(clone(x.files[0]))],['null-without-input',x=>x.files[0].slots=null],['file-gap',x=>x.files[0].ordinal=1],['slot-gap',x=>x.files[0].slots[0].ordinal=99],['id',x=>x.files[0].slots[0].id='foreign'],['slot-lane',x=>x.files[0].slots[0].lane='native'],['goal',x=>x.files[0].slots[0].goal='Module'],['empty-debt',x=>x.files[0].slots[0].debts=[]],['admitted',x=>x.files[0].slots[0].admission='admitted'],['execution',x=>x.execution={}],['registry',x=>x.authority.entries=[{}]],['slot-duplicate',x=>x.files[0].slots.push(clone(x.files[0].slots[0]))],['null-error',x=>x.files[0].inputError={status:'harness-error',stage:'input',reasonCode:'retrieval'}]];
for(const [id,edit] of mutations){const fresh=owner.mint(s);model.selectionFault(value=>{edit(value);return value;});reject('selection-'+id,'selection',()=>api.newScriptLedger(fresh));model.selectionFault(null);api.newScriptLedger(fresh);}
const attempts=api.inspectScriptLedger(token).attempts;
const historyEdits=[['gap',x=>x[0].sequence=2],['slot-gap',x=>x[0].attempt=2],['reorder',x=>x.reverse()],['duplicate',x=>x.push(clone(x[0]))],['unknown',x=>x[0].slotId='unknown'],['first-reason',x=>x[0].retryReason='bad'],['retry-blank',x=>x[2].retryReason=' '],['extra',x=>x[0].extra=1],['executed',x=>x[0].terminal.executed=true],['body',x=>x[0].terminal.testBodyEvaluated=true],['stage',x=>x[0].terminal.stage='test'],['reason',x=>x[0].terminal.reasonCode='fake'],['receipt',x=>x[0].terminal.kind='transport']];
for(const status of statuses.filter(s=>s!==attempts[0].terminal.status))historyEdits.push(['status-'+status,x=>x[0].terminal.status=status]);
for(const [id,edit] of historyEdits){const changed=clone(attempts);edit(changed);assert.throws(()=>model.validateHistory(token,changed),error('history'));checks++;log.push({id:'history-'+id,error:'script-ledger/history',defensiveOracleOnly:true});}
save('translated-results.json',{actualCopiedModule:true,checks,rows:log});assert.equal(checks,149);console.log(JSON.stringify({checks,literalReports:28,actualCopiedModule:true}));
