import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync, linkSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import * as inputs from './script-execution-inputs.mjs';
import * as policy from './script-plan.mjs';
import * as ledger from './script-ledger.mjs';
import {frozenManifest, REVISION, sha256, metadata, harnessPaths, transform} from './input.mjs';
const corpus=process.argv[2],out=process.argv[3];
assert(corpus&&out,'explicit corpus and fresh output directory required');
mkdirSync(out,{recursive:false});
const save=(name,value)=>writeFileSync(resolve(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const {manifest}=await frozenManifest(),paths=manifest.entries.map(e=>e.path);
const limits={sourceUnits:100000,parseDepth:128,steps:100000,calls:64,evaluationDepth:256,wallMs:10000,outputBytes:1048576};
assert.deepEqual(Object.keys(inputs).sort(),['assertScriptExecutionInputsCurrent','inspectScriptExecutionInputs','prepareScriptExecutionInputs']);
assert.equal(inputs.prepareScriptExecutionInputs.length,2);assert.equal(inputs.inspectScriptExecutionInputs.length,1);assert.equal(inputs.assertScriptExecutionInputsCurrent.length,1);
const errors=[],actual=[];
async function rejects(id,operation,error,before=null,inspect=null){
 await assert.rejects(operation,{message:error});
 const after=inspect?inspect():null;if(inspect)assert.deepEqual(after,before);
 errors.push({id,error,before,after});
}
for(const lane of ['node','native']){
 const p=await policy.prepareScriptSelection({root:corpus,revision:REVISION,lane,paths});
 const anchor=policy.inspectScriptSelection(p),o={root:corpus,limits:{...limits}};
 const pending=inputs.prepareScriptExecutionInputs(p,o);o.root='missing';o.limits.steps=99;
 const token=await pending,snapshot=inputs.inspectScriptExecutionInputs(token);
 assert.deepEqual(snapshot.policyAnchor,anchor);assert.deepEqual(snapshot.stable.limits,limits);
 assert.equal(snapshot.policyAnchorSha256,sha256(JSON.stringify(anchor)));
 assert.equal(snapshot.stableSha256,sha256(JSON.stringify(snapshot.stable)));
 assert.equal(snapshot.executionBinding,null);assert.equal(snapshot.admission,'blocked');
 assert.notEqual(inputs.inspectScriptExecutionInputs(token),snapshot);
 assert.notEqual(inputs.inspectScriptExecutionInputs(token).stable,snapshot.stable);
 assert(Object.isFrozen(snapshot.stable.policy.files[0].slots[0].metadata.flags));
 assert.throws(()=>{snapshot.stable.limits.steps=0;},TypeError);
 const detached=structuredClone(snapshot);detached.stable.policy.files[0].slots=[];
 assert.deepEqual(inputs.inspectScriptExecutionInputs(token),snapshot);
 await inputs.assertScriptExecutionInputsCurrent(token);
 const p2=await policy.prepareScriptSelection({root:corpus,revision:REVISION,lane,paths});
 const t2=await inputs.prepareScriptExecutionInputs(p2,{root:corpus,limits});
 const second=inputs.inspectScriptExecutionInputs(t2);
 assert.notEqual(second.policyAnchor.runId,anchor.runId);assert.notEqual(second.policyAnchorSha256,snapshot.policyAnchorSha256);
 assert.deepEqual(second.stable,snapshot.stable);assert.equal(second.stableSha256,snapshot.stableSha256);
 const zeroToken=await inputs.prepareScriptExecutionInputs(p,{root:corpus,limits:{...limits,steps:0,calls:0,wallMs:0,outputBytes:0}});
 const zero=inputs.inspectScriptExecutionInputs(zeroToken);assert.notEqual(zero.stableSha256,snapshot.stableSha256);
 const owner=ledger.newScriptLedger(p),initial=ledger.reportScriptLedger(owner),before=ledger.inspectScriptLedger(owner);
 const slots=anchor.files.flatMap(f=>f.slots??[]);assert.equal(slots.length,60);assert.equal(anchor.policy.files.length,242);assert.equal(anchor.authority.entries.length,0);
 for(const [name,foreign] of [['empty',{}],['policy',p],['ledger',owner],['copy',structuredClone(token)],['json',JSON.parse(JSON.stringify(token))],['snapshot',snapshot]]){
  await rejects(lane+'/'+name,async()=>inputs.inspectScriptExecutionInputs(foreign),'script-execution-inputs/token',snapshot,()=>inputs.inspectScriptExecutionInputs(token));
  await rejects(lane+'/'+name+'/current',()=>inputs.assertScriptExecutionInputsCurrent(foreign),'script-execution-inputs/token',snapshot,()=>inputs.inspectScriptExecutionInputs(token));
 }
 await rejects(lane+'/E2-new',async()=>ledger.newScriptLedger(token),'script-ledger/token');
 for(const api of ['inspectScriptLedger','reportScriptLedger'])await rejects(lane+'/'+api,async()=>ledger[api](token),'script-ledger/token');
 for(const api of ['checkpointScriptLedger','resolveScriptLedgerCheckpoint','reopenScriptLedger'])await rejects(lane+'/'+api,async()=>ledger[api](token),'script-ledger-store/token');
 await rejects(lane+'/create-store',()=>ledger.createScriptLedgerStore(resolve(out,'never-created-'+lane),token),'script-ledger-store/token');
 await rejects(lane+'/append-foreign',async()=>ledger.appendScriptPolicy(token,slots[0].id),'script-ledger/token');
 await rejects(lane+'/append-data',async()=>ledger.appendScriptPolicy(owner,slots[0].id,null,snapshot),'script-ledger/arguments',before,()=>ledger.inspectScriptLedger(owner));
 for(const s of slots)ledger.appendScriptPolicy(owner,s.id);
 const final=ledger.reportScriptLedger(owner);
 assert.equal(final.counts['unsupported-feature'],19);assert.equal(final.counts['unsupported-profile'],41);
 assert.equal(final.executedVariants,0);assert.equal(final.testBodyEvaluatedVariants,0);assert.equal(final.plannedVariants,60);
 for(const f of snapshot.stable.files)for(const s of f.slots??[])for(const u of s.units){
  assert.equal(sha256(Buffer.from(u.originalBase64,'base64')),u.sourceSha256);
  assert.equal(sha256(Buffer.from(u.transformedBase64,'base64')),u.transformedSha256);
  assert.equal(Buffer.from(u.originalBase64,'base64').length,u.byteLength);
  assert.equal(Buffer.from(u.transformedBase64,'base64').length,u.transformedByteLength);
  assert.equal(u.transformedText.length,u.sourceUnits);
 }
 actual.push({lane,snapshot,secondAnchor:second.policyAnchor,zero,initial,history:ledger.inspectScriptLedger(owner),final});
 const malformed=[['arity',()=>inputs.prepareScriptExecutionInputs({}, {root:corpus,limits},0),'arguments'],
  ['shape-before-token',()=>inputs.prepareScriptExecutionInputs({},{}),'arguments'],
  ['root-before-token',()=>inputs.prepareScriptExecutionInputs({},{root:0,limits}),'options'],
  ['limits-before-token',()=>inputs.prepareScriptExecutionInputs({},{root:corpus,limits:{...limits,steps:-1}}),'limits'],
  ['fixed-before-wall',()=>inputs.prepareScriptExecutionInputs({},{root:corpus,limits:{...limits,sourceUnits:0,wallMs:2147483648}}),'fixed-limit'],
  ['wall-before-token',()=>inputs.prepareScriptExecutionInputs({},{root:corpus,limits:{...limits,wallMs:2147483648}}),'wall-limit'],
  ['token-before-rootIO',()=>inputs.prepareScriptExecutionInputs({},{root:'missing',limits}),'token']];
 for(const [id,fn,error] of malformed)await rejects(lane+'/'+id,fn,'script-execution-inputs/'+error);
 let getter=0;
 const access={root:corpus,get limits(){getter++;return limits;}};
 await rejects(lane+'/getter',()=>inputs.prepareScriptExecutionInputs(p,access),'script-execution-inputs/arguments');assert.equal(getter,0);
 for(const key of Object.keys(limits)){
  const copy={...limits};delete copy[key];await rejects(lane+'/missing-'+key,()=>inputs.prepareScriptExecutionInputs(p,{root:corpus,limits:copy}),'script-execution-inputs/arguments');
  await rejects(lane+'/invalid-'+key,()=>inputs.prepareScriptExecutionInputs(p,{root:corpus,limits:{...limits,[key]:NaN}}),'script-execution-inputs/limits');
 }
 for(const [id,changes] of [['wrong-revision',{revision:'wrong'}],['missing-root',{root:resolve(out,'absent')} ]]){
  const request={root:corpus,revision:REVISION,lane,paths,...changes};
  // The input snapshot root must exist even for retained retrieval errors.
  const partial=await policy.prepareScriptSelection(request);
  const partialAnchor=policy.inspectScriptSelection(partial);
  if(id==='wrong-revision'){
   const pt=await inputs.prepareScriptExecutionInputs(partial,{root:corpus,limits});
   const value=inputs.inspectScriptExecutionInputs(pt);assert(value.stable.files.every(f=>f.slots===null));
   const lo=ledger.newScriptLedger(partial);actual.push({lane,id,snapshot:value,report:ledger.reportScriptLedger(lo)});
  }else {assert(partialAnchor.files.every(f=>f.slots===null));actual.push({lane,id,selection:partialAnchor,report:ledger.reportScriptLedger(ledger.newScriptLedger(partial))});}
 }
}
// Isolated exact-byte local inputs; never edit the original export or history.
const copyRoot=resolve(out,'corpus');mkdirSync(copyRoot);
for(const path of [...paths,...Object.keys(manifest.upstream.harnessBlobs)]){
 const target=resolve(copyRoot,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(corpus,path),target);
}
const faults=[];
for(const lane of ['node','native']){
 const p=await policy.prepareScriptSelection({root:copyRoot,revision:REVISION,lane,paths});
 const token=await inputs.prepareScriptExecutionInputs(p,{root:copyRoot,limits}),before=inputs.inspectScriptExecutionInputs(token);
 const path=resolve(copyRoot,paths[0]),bytes=readFileSync(path);
 writeFileSync(path,Buffer.concat([bytes,Buffer.from('\n')]));
 await rejects(lane+'/stale-input',()=>inputs.assertScriptExecutionInputsCurrent(token),'script-execution-inputs/input-drift',before,()=>inputs.inspectScriptExecutionInputs(token));
 writeFileSync(path,bytes);
 // A link makes the selected file itself aliased even without a junction.
 const alias=resolve(out,'alias-'+lane);linkSync(path,alias);
 await rejects(lane+'/hardlink',()=>inputs.assertScriptExecutionInputsCurrent(token),'script-execution-inputs/source',before,()=>inputs.inspectScriptExecutionInputs(token));
 unlinkSync(alias);await inputs.assertScriptExecutionInputsCurrent(token);
 const include=resolve(copyRoot,'harness/sta.js'),original=readFileSync(include);unlinkSync(include);
 const partial=await policy.prepareScriptSelection({root:copyRoot,revision:REVISION,lane,paths});
 const pt=await inputs.prepareScriptExecutionInputs(partial,{root:copyRoot,limits}),snapshot=inputs.inspectScriptExecutionInputs(pt);
 const owner=ledger.newScriptLedger(partial);for(const f of snapshot.policyAnchor.files)for(const s of f.slots??[])ledger.appendScriptPolicy(owner,s.id);
 assert(snapshot.policyAnchor.files.some(f=>f.inputError&&f.slots?.length===2));
 faults.push({lane,id:'include-failure',snapshot,report:ledger.reportScriptLedger(owner)});
 writeFileSync(include,original);
 await rejects(lane+'/repaired-input-is-drift',()=>inputs.assertScriptExecutionInputsCurrent(pt),'script-execution-inputs/input-drift');
}
const synthetic=[];
for(const includes of [['sta.js','sta.js'],['assert.js','sta.js'],['sta.js','assert.js']]){
 const meta={flags:[],features:[],includes,locale:[],negative:null};synthetic.push({label:'synthetic ordered include input; no admission',metadata:meta,paths:harnessPaths(meta)});
}
assert.notDeepEqual(synthetic[1].paths,synthetic[2].paths);assert.equal(synthetic[0].paths.filter(p=>p==='harness/sta.js').length,3);
const bytes=Buffer.from('0;');synthetic.push({label:'synthetic equal raw/non-strict bytes; variants remain distinct',raw:transform(bytes,'raw').toString('hex'),nonStrict:transform(bytes,'non-strict').toString('hex'),strict:transform(bytes,'strict').toString('hex')});
assert.throws(()=>metadata('/*---\ndescription: x\nunknown: true\n---*/'),e=>e.reasonCode==='metadata');
save('actual.json',actual);save('errors.json',errors);save('input-faults.json',faults);save('synthetic-inputs.json',synthetic);
console.log(JSON.stringify({lanes:2,errors:errors.length,actual:actual.length,inputFaults:faults.length,guestLaunches:0,builds:0}));
