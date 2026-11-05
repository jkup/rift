// Private evidence model, not production, no exported factory or authority.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
const clone=structuredClone,rows=[...read('design-selections.json').rows,...read('supplemental-literals.json').rows];
const statuses=['pass','fail','unsupported-feature','unsupported-profile','harness-error','resource-limit','timeout','host-fault'];
const frozen=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))frozen(v);Object.freeze(x);}return x;};
const checkFrozen=x=>{if(x&&typeof x==='object'){assert(Object.isFrozen(x));for(const v of Object.values(x))checkFrozen(v);}};
const fail=code=>{throw new Error('script-ledger/'+code);};
const error=code=>e=>{assert.equal(Object.getPrototypeOf(e),Error.prototype);assert.equal(e.message,'script-ledger/'+code);assert.deepEqual(Object.keys(e),[]);return true;};
const log=[];let checks=0;
function report(selection,attempts){
 const counts=Object.fromEntries(statuses.map(s=>[s,0]));let plannedVariants=0,completed=0,unplannedInputErrors=0;
 const files=selection.files.map(file=>{
  if(file.slots===null){unplannedInputErrors++;return {path:file.path,manifestId:file.manifestId,statuses:null,inputError:file.inputError,passed:false};}
  const values=file.slots.map(slot=>{plannedVariants++;const first=attempts.find(a=>a.slotId===slot.id);if(first){completed++;counts[first.terminal.status]++;}return {slotId:slot.id,variant:slot.variant,status:first?.terminal.status??null};});
  return {path:file.path,manifestId:file.manifestId,statuses:values,inputError:file.inputError,passed:false};
 });
 const complete=unplannedInputErrors===0&&completed===plannedVariants;
 return {lane:selection.lane,selectedFiles:selection.files.length,plannedVariants,executedVariants:0,testBodyEvaluatedVariants:0,unplannedInputErrors,completed,missing:plannedVariants-completed,attempts:attempts.length,counts,passedFiles:0,files,excludedFixtures:[],complete,passOverPlanned:complete?{numerator:counts.pass,denominator:plannedVariants}:null,conditionalPass:null,exitCode:complete?1:2};
}
function derive(selection,id){for(const f of selection.files)for(const s of f.slots??[])if(s.id===id){const d=f.inputError??s.debts[0];return {kind:'policy',stage:f.inputError?'input':'preflight',status:d.status,reasonCode:d.reasonCode,executed:false,testBodyEvaluated:false};}fail('slot');}
// Exact fixture anchors deliberately stand in for the full future schema validator.
// The model exercises state/ordering/ownership; mutation rejection is a literal
// oracle requirement, not evidence of a generic production schema validator.
function planner(){const tokens=new WeakMap();return {mint(selection){const token=frozen({});tokens.set(token,clone(selection));return token;},inspect(token){if(!tokens.has(token))fail('token');return clone(tokens.get(token));}};}
function ledgerModule(owner){const used=new WeakSet(),state=new WeakMap();let fault=null,selectionFault=null;
 function selection(s){try{assert(rows.some(r=>{try{assert.deepEqual(s,r.selection);return true;}catch{return false;}}));}catch{fail('selection');}}
 function history(s,attempts){try{const counts=new Map();for(let i=0;i<attempts.length;i++){const a=attempts[i],n=(counts.get(a.slotId)??0)+1;assert.deepEqual(Object.keys(a),['sequence','slotId','attempt','retryReason','terminal']);assert.equal(a.sequence,i+1);assert.equal(a.attempt,n);assert(n===1?a.retryReason===null:typeof a.retryReason==='string'&&a.retryReason.trim().length>0);assert.deepEqual(a.terminal,derive(s,a.slotId));counts.set(a.slotId,n);}}catch{fail('history');}}
 function get(token){if(!state.has(token))fail('token');const s=state.get(token);selection(s.selection);history(s.selection,s.attempts);return s;}
 function newScriptLedger(token){if(arguments.length!==1)fail('arguments');let s=owner.inspect(token);if(used.has(token))fail('already-used-selection');if(selectionFault)s=selectionFault(s);selection(s);const value=frozen({ledgerVersion:2,kind:'script-policy-ledger',selection:clone(s),attempts:[]}),out=frozen({});if(fault)fail(fault);state.set(out,value);used.add(token);return out;}
 function appendScriptPolicy(token,id,reason=null){if(![2,3].includes(arguments.length)||typeof id!=='string'||!id.length||(reason!==null&&typeof reason!=='string'))fail('arguments');const value=get(token),terminal=derive(value.selection,id),prior=value.attempts.filter(a=>a.slotId===id);if(prior.length?typeof reason!=='string'||!reason.trim():reason!==null)fail('retry-policy');const attempt={sequence:value.attempts.length+1,slotId:id,attempt:prior.length+1,retryReason:reason,terminal};const next={...value,attempts:[...value.attempts,attempt]};history(next.selection,next.attempts);if(fault)fail(fault);state.set(token,frozen(next));}
 function inspectScriptLedger(token){if(arguments.length!==1)fail('arguments');return frozen(clone(get(token)));}
 function reportScriptLedger(token){if(arguments.length!==1)fail('arguments');const value=get(token);return frozen(report(value.selection,value.attempts));}
 // These controls are lexical model controls only, never proposed public APIs.
 return {api:{newScriptLedger,appendScriptPolicy,inspectScriptLedger,reportScriptLedger},fault(code){fault=code;},selectionFault(fn){selectionFault=fn;},validateHistory:history};
}
for(const row of [...read('report-literals.json'),...read('supplemental-literals.json').reports]){
 const selected=rows.find(r=>r.id===row.selectionId).selection,owner=planner(),model=ledgerModule(owner),api=model.api,token=api.newScriptLedger(owner.mint(selected));
 for(const a of row.attempts)assert.equal(api.appendScriptPolicy(token,a.slotId,a.retryReason),undefined);
 assert.deepEqual(api.inspectScriptLedger(token),{ledgerVersion:2,kind:'script-policy-ledger',selection:selected,attempts:row.attempts});assert.deepEqual(api.reportScriptLedger(token),row.expected);
 const a=api.inspectScriptLedger(token),b=api.inspectScriptLedger(token),r=api.reportScriptLedger(token),r2=api.reportScriptLedger(token);checkFrozen(a);checkFrozen(r);assert.notEqual(a,b);assert.notEqual(a.selection.files,b.selection.files);assert.notEqual(r,r2);assert.notEqual(r.files,r2.files);assert.throws(()=>a.attempts.push(1),TypeError);assert.throws(()=>r.files.pop(),TypeError);checks++;log.push({id:row.id,fullLedger:true,fullReport:true,freshFrozen:true});
}
const owner=planner(),model=ledgerModule(owner),api=model.api,s=rows[0].selection,sel=owner.mint(s),token=api.newScriptLedger(sel),ids=s.files.flatMap(f=>f.slots??[]).map(s=>s.id);
assert.deepEqual(Object.keys(api),['newScriptLedger','appendScriptPolicy','inspectScriptLedger','reportScriptLedger']);assert.deepEqual(Object.values(api).map(f=>f.length),[1,2,1,1]);checkFrozen(token);assert.deepEqual(token,{});
function reject(id,code,fn){const before=JSON.stringify(api.inspectScriptLedger(token)),reportBefore=JSON.stringify(api.reportScriptLedger(token));assert.throws(fn,error(code),id);assert.equal(JSON.stringify(api.inspectScriptLedger(token)),before);assert.equal(JSON.stringify(api.reportScriptLedger(token)),reportBefore);checks++;log.push({id,error:'script-ledger/'+code,noStateChange:true});}
for(const [id,fn] of [['new-zero',()=>api.newScriptLedger()],['new-extra',()=>api.newScriptLedger({},1)],['append-zero',()=>api.appendScriptPolicy()],['append-one',()=>api.appendScriptPolicy(token)],['append-extra',()=>api.appendScriptPolicy(token,ids[0],null,1)],['inspect-zero',()=>api.inspectScriptLedger()],['inspect-extra',()=>api.inspectScriptLedger(token,1)],['report-zero',()=>api.reportScriptLedger()],['report-extra',()=>api.reportScriptLedger(token,1)]])reject(id,'arguments',fn);
let calls=0;const accessor={get id(){calls++;throw 0;},toString(){calls++;throw 0;}};
for(const value of [null,undefined,0,1n,Symbol(),'',[],{},new String(ids[0]),accessor])reject('slot-type-'+String(typeof value),'arguments',()=>api.appendScriptPolicy({},value));
for(const value of [0,1n,Symbol(),[],{},new String('reason'),accessor])reject('reason-type-'+String(typeof value),'arguments',()=>api.appendScriptPolicy({},ids[0],value));
assert.equal(calls,0);
const foreignOwner=planner(),foreignModule=ledgerModule(owner),foreignLedger=foreignModule.api.newScriptLedger(sel);
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
for(const [id,edit] of historyEdits){const changed=clone(attempts);edit(changed);assert.throws(()=>model.validateHistory(s,changed),error('history'));checks++;log.push({id:'history-'+id,error:'script-ledger/history',defensiveOracleOnly:true});}
const output={designModel:true,productionAuthority:false,genericSchemaValidator:false,checks,rows:log};writeFileSync(new URL('model-results.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({checks,literalReports:28,productionAuthority:false}));
