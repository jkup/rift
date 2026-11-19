import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as api from '../../../tools/test262/script-ledger.mjs';
import * as plannerApi from '../../../tools/test262/script-plan.mjs';
import {ledgerModule, options, read, save, error, checkFrozen} from './support.mjs';

const observations=[];
// Independent complete report/history expectations remain the accepted literals.
// Real full-corpus plans supply authority in both lanes, without any fault wrapper.
for (const lane of ['node','native']) {
  for (const row of read('report-literals.json').filter(row=>row.selectionId===lane)) {
    const selectionToken=await plannerApi.prepareScriptSelection(options(lane));
    const selection=plannerApi.inspectScriptSelection(selectionToken);
    const token=api.newScriptLedger(selectionToken);
    assert.equal(selection.policy.files.length,242);
    assert.equal(selection.policy.id,'rift-script-blocked-v4');
    for(const attempt of row.attempts) api.appendScriptPolicy(token,attempt.slotId,attempt.retryReason);
    assert.deepEqual(api.inspectScriptLedger(token),{ledgerVersion:2,kind:'script-policy-ledger',selection,attempts:row.attempts});
    const report=api.reportScriptLedger(token);assert.deepEqual(report,row.expected);checkFrozen(report);
    observations.push({id:row.id,canonicalPlanner:true,canonicalLedger:true,fullReport:true,fullHistory:true});
  }
}
const selected=await plannerApi.prepareScriptSelection(options());
const baseline=plannerApi.inspectScriptSelection(selected);
const reviewControls=[];
for(const [name,edit] of [
  ['wrong-revision-with-slots',value=>value.revision='wrong'],
  ['empty-host',value=>value.policy.host=''],
  ['empty-platform',value=>value.policy.platform=''],
]) {
  const copy=await ledgerModule();
  copy.selectionFault(value=>{edit(value);return value;});
  assert.throws(()=>copy.api.newScriptLedger(selected),error('selection'));
  copy.selectionFault(null);
  const recovered=copy.api.newScriptLedger(selected);
  assert.deepEqual(copy.api.inspectScriptLedger(recovered),{ledgerVersion:2,kind:'script-policy-ledger',selection:baseline,attempts:[]});
  assert.throws(()=>copy.api.newScriptLedger(selected),error('already-used-selection'));
  reviewControls.push({name,error:'script-ledger/selection',failedCreationUnconsumed:true,recovered:true});
}
const wrongLiteral=JSON.parse(readFileSync('docs/validation/ts-035e2a/selection-literals.json'))
  .find(row=>row.lane==='node' && row.revision!==baseline.revision);
const wrongToken=await plannerApi.prepareScriptSelection({...options(),revision:wrongLiteral.revision});
const wrongSelection=plannerApi.inspectScriptSelection(wrongToken);
assert(wrongSelection.files.every(file=>file.slots===null));
const wrongLedger=api.newScriptLedger(wrongToken);
const wrongReport={lane:'node',selectedFiles:33,plannedVariants:0,executedVariants:0,
  testBodyEvaluatedVariants:0,unplannedInputErrors:33,completed:0,missing:0,attempts:0,
  counts:{pass:0,fail:0,'unsupported-feature':0,'unsupported-profile':0,'harness-error':0,'resource-limit':0,timeout:0,'host-fault':0},
  passedFiles:0,files:wrongLiteral.selection.files.map(file=>({path:file.path,manifestId:file.manifestId,
    statuses:null,inputError:file.inputError,passed:false})),excludedFixtures:[],complete:false,
  passOverPlanned:null,conditionalPass:null,exitCode:2};
assert.deepEqual(api.reportScriptLedger(wrongLedger),wrongReport);
assert.throws(()=>api.appendScriptPolicy(wrongLedger,baseline.files[0].slots[0].id),error('slot'));
save('review-correction-results.json',{reviewControls,wrongRevision:wrongSelection.revision,
  allNullPositive:true,report:wrongReport});
const isolated=await ledgerModule();
isolated.fault('history');
assert.throws(()=>isolated.api.newScriptLedger(selected),error('history'));
isolated.fault(null);
let getterCalls=0;
const controls=[];
const paths=[[],['authority'],['policy'],['policy','files',0],['files',0],['files',0,'slots',0],
  ['files',0,'slots',0,'metadata'],['files',0,'slots',0,'harness',0],['files',0,'slots',0,'debts',0]];
const at=(value,path)=>path.reduce((v,key)=>v[key],value);
function selectionReject(name,edit) {
  isolated.selectionFault(value=>{edit(value);return value;});
  assert.throws(()=>isolated.api.newScriptLedger(selected),error('selection'),name);
  controls.push(name);
}
for(const path of paths) {
  const original=at(baseline,path);
  for(const key of Object.keys(original)) {
    selectionReject(path.join('.')+'.missing.'+key,value=>delete at(value,path)[key]);
    selectionReject(path.join('.')+'.accessor.'+key,value=>Object.defineProperty(at(value,path),key,{get(){getterCalls++;throw 0;}}));
    selectionReject(path.join('.')+'.type.'+key,value=>at(value,path)[key]=Symbol('bad type'));
  }
  selectionReject(path.join('.')+'.extra',value=>at(value,path).extra=1);
  selectionReject(path.join('.')+'.symbol',value=>at(value,path)[Symbol()]=1);
  selectionReject(path.join('.')+'.prototype',value=>Object.setPrototypeOf(at(value,path),null));
}
const arrays=[['files'],['policy','files'],['authority','entries'],['excludedFixtures'],
  ['files',0,'slots'],['files',0,'slots',0,'harness'],['files',0,'slots',0,'debts'],
  ...['flags','features','includes','locale'].map(key=>['files',0,'slots',0,'metadata',key])];
for(const path of arrays) {
  for(const key of ['keys','every',Symbol.iterator])selectionReject(path.join('.')+'.array-accessor.'+String(key),value=>
    Object.defineProperty(at(value,path),key,{get(){getterCalls++;throw 0;}}));
  selectionReject(path.join('.')+'.array-prototype',value=>Object.setPrototypeOf(at(value,path),null));
  selectionReject(path.join('.')+'.array-hole',value=>{const array=at(value,path);array.length++;});
}
const slot=x=>x.files[0].slots[0];
for(const [name,edit] of [
  ['uuid',x=>x.runId='no'],['revision-empty',x=>x.revision=''],['registry-digest',x=>x.authority.registrySha256='0'.repeat(64)],
  ['closure-digest',x=>x.policy.closureSha256='0'.repeat(64)],['closure-order',x=>x.policy.files.reverse()],
  ['closure-duplicate',x=>x.policy.files[1]=structuredClone(x.policy.files[0])],
  ['blob-uppercase',x=>slot(x).blob='A'.repeat(40)],['source-hash',x=>slot(x).sourceSha256='bad'],
  ['negative-bytes',x=>slot(x).byteLength=-1],['unsafe-bytes',x=>slot(x).byteLength=Number.MAX_SAFE_INTEGER+1],
  ['fractional-bytes',x=>slot(x).byteLength=0.5],['unsafe-ordinal',x=>slot(x).ordinal=Number.MAX_SAFE_INTEGER+1],
  ['harness-hash',x=>slot(x).harness[0].sha256='bad'],['harness-order',x=>slot(x).harness.reverse()],
  ['debt-id',x=>slot(x).debts[0].id='legacy:99:x'],['debt-authority',x=>slot(x).debts[0].authority='forged'],
  ['coverage-missing',x=>slot(x).debts.pop()],['coverage-duplicate',x=>slot(x).debts.unshift(structuredClone(slot(x).debts.at(-1)))],
  ['coverage-status',x=>slot(x).debts.at(-1).status='unsupported-profile'],
  ['flags-unknown',x=>slot(x).metadata.flags=['not-a-flag']],['flags-conflicting',x=>slot(x).metadata.flags=['raw','module']],
  ['includes-traversal',x=>slot(x).metadata.includes=['../bad.js']],['negative-shape',x=>slot(x).metadata.negative={phase:'runtime',type:' '}],
  ['file-path',x=>x.files[0].path='test/../bad.js'],['input-shape',x=>x.files[0].inputError={status:'fail',stage:'input',reasonCode:'x'}],
]) selectionReject(name,edit);
assert.equal(getterCalls,0);
isolated.selectionFault(null);
const token=isolated.api.newScriptLedger(selected);
assert.throws(()=>isolated.api.newScriptLedger(selected),error('already-used-selection'));
const id=baseline.files[0].slots[0].id;
const snapshot=()=>[isolated.api.inspectScriptLedger(token),isolated.api.reportScriptLedger(token)];
const before=snapshot();
for(const field of ['sequence','attempt'])for(const number of [0,-1,0.5,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1,Infinity,NaN]) {
  isolated.control[field]=number;
  assert.throws(()=>isolated.api.appendScriptPolicy(token,id),error('history'));
  delete isolated.control[field];assert.deepEqual(snapshot(),before);controls.push(field+'-'+number);
}
for(const [name,edit] of [
  ['sequence',x=>x.attempts[0].sequence=2],['terminal',x=>x.attempts[0].terminal.executed=true],
  ['selection',x=>x.selection={...x.selection,cache:true}],
]) {
  isolated.control.candidate=edit;
  assert.throws(()=>isolated.api.appendScriptPolicy(token,id),error(name==='selection'?'selection':'history'));
  isolated.control.candidate=null;assert.deepEqual(snapshot(),before);controls.push('candidate-'+name);
}
isolated.api.appendScriptPolicy(token,id);assert.equal(isolated.api.inspectScriptLedger(token).attempts[0].sequence,1);
const stable=snapshot();
for(const path of [[],['attempts',0],['attempts',0,'terminal']]) {
  const original=at(stable[0],path);
  for(const key of Object.keys(original)) {
    // Selection itself has already received the full selection mutation matrix.
    if(path.length===0 && key==='selection')continue;
    for(const kind of ['missing','accessor','type']) {
      isolated.control.state=value=>{
        const target=at(value,path);
        if(kind==='missing')delete target[key];
        else if(kind==='accessor')Object.defineProperty(target,key,{get(){getterCalls++;throw 0;}});
        else target[key]=Symbol('bad');
        return value;
      };
      assert.throws(()=>isolated.api.inspectScriptLedger(token),error('history'));
      assert.throws(()=>isolated.api.reportScriptLedger(token),error('history'));
      assert.throws(()=>isolated.api.appendScriptPolicy(token,'unknown'),error('history'));
      isolated.control.state=null;assert.deepEqual(snapshot(),stable);
      controls.push('history-'+path.join('.')+'-'+key+'-'+kind);
    }
  }
}
for(const key of ['0','every','keys',Symbol.iterator]) {
  isolated.control.state=value=>{
    Object.defineProperty(value.attempts,key,{get(){getterCalls++;throw 0;}});return value;
  };
  assert.throws(()=>isolated.api.inspectScriptLedger(token),error('history'));
  isolated.control.state=null;assert.deepEqual(snapshot(),stable);
  controls.push('history-array-'+String(key));
}
isolated.control.state=value=>{Object.defineProperty(value,'selection',{get(){getterCalls++;throw 0;}});return value;};
assert.throws(()=>isolated.api.inspectScriptLedger(token),error('history'));
isolated.control.state=null;assert.equal(getterCalls,0);
// Corrupt stored selection and history together: selection must win. Public
// argument errors still precede both; restoring the copied fault restores use.
isolated.control.state=value=>{value.selection.cache=true;value.attempts[0].sequence=99;return value;};
for(const op of ['inspectScriptLedger','reportScriptLedger'])assert.throws(()=>isolated.api[op](token),error('selection'));
assert.throws(()=>isolated.api.appendScriptPolicy(token,'unknown','bad'),error('selection'));
assert.throws(()=>isolated.api.appendScriptPolicy(token,null),error('arguments'));
isolated.control.state=null;
isolated.api.appendScriptPolicy(token,id,' retry ');
assert.deepEqual(isolated.api.inspectScriptLedger(token).attempts.map(a=>[a.sequence,a.attempt]),[[1,1],[2,2]]);
// Tokens are process/module identities. The second module can consume the same
// canonical selection; neither ledger can inspect the other's token.
const other=await ledgerModule(),otherToken=other.api.newScriptLedger(selected);
assert.throws(()=>other.api.inspectScriptLedger(token),error('token'));
assert.throws(()=>isolated.api.inspectScriptLedger(otherToken),error('token'));
assert.deepEqual(Object.keys(api).sort(),['appendScriptPolicy','checkpointScriptLedger','createScriptLedgerStore','inspectScriptLedger','newScriptLedger','reopenScriptLedger','reportScriptLedger','resolveScriptLedgerCheckpoint']);
// No filesystem or loader calls are introduced in ledger operation bodies.
const source=readFileSync('tools/test262/script-ledger.mjs','utf8');
const start='const ledgers = new WeakMap();',end='const stores = new WeakMap(), checkpoints = new WeakMap(), ownership = new WeakMap();';
assert.equal(source.split(start).length,2);assert.equal(source.split(end).length,2);
assert(source.indexOf(start)<source.indexOf(end));
const synchronous=source.slice(source.indexOf(start),source.indexOf(end));
assert(!synchronous.includes('node:fs'));assert(!synchronous.includes('await '));
assert(!/\b(?:mkdir|lstat|realpath|open|link|unlink|readFile)\s*\(/.test(synchronous));
assert.equal(controls.length,338);
save('extended-results.json',{canonicalReports:observations,schemaAndCounterControls:controls.length,controls,getterCalls});
console.log(JSON.stringify({canonicalReports:observations.length,schemaAndCounterControls:controls.length,getterCalls}));
