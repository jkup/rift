// Offline evidence only. No engine launch, build, corpus write, or production edit.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {frozenManifest,variants,blockers} from '../../../tools/test262/input.mjs';
import {parseScriptEnvelope,assertScriptContext} from '../../../tools/test262/script-result.mjs';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseEnvelope} from '../../../tools/test262/result.mjs';
import {synthetic} from '../../../tools/test262/fixtures.mjs';
const here='docs/validation/ts-035e-p/';
const json=p=>JSON.parse(readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(p,v)=>writeFileSync(here+p,JSON.stringify(v,null,2)+'\n');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64e6}).trim();
const paths=git('ls-files').split('\n').filter(p=>p!=='TASKS.md'&&p!=='COORDINATION.md'&&!p.startsWith(here)&&p!=='docs/script-capability-ledger.md');
if(process.argv.includes('--freeze')) save('preservation.json',paths.map(path=>({path,sha256:hash(readFileSync(path))})));
const preserved=json(here+'preservation.json');
for(const r of preserved)assert.equal(hash(readFileSync(r.path)),r.sha256,r.path);
const frozen=json('test/fixtures/script-observation-serialization/frozen.json');
const classifications=[];
let mutations=0;
for(const r of frozen){
 assert.deepEqual(parseScriptDriverResult(Buffer.from(r.ascii),r.binding),r.child);
 assert.deepEqual(parseScriptEnvelope(JSON.stringify(r.envelope),r.binding),r.envelope);
 assert.deepEqual(assertScriptContext(r.envelope,r.context,r.binding),r.envelope);
 assert.throws(()=>parseEnvelope(JSON.stringify(r.envelope)));
 for(const [group,key] of [['identity','runId'],['identity','engineBuildSha256'],['identity','policySha256'],['inputs','capabilityLedgerSha256'],['inputs','ruleRegistrySha256'],['inputs','host']]){
  const c=structuredClone(r.context);c[group][key]=key==='runId'||key==='host'?'forged':'c'.repeat(64);
  assert.throws(()=>assertScriptContext(r.envelope,c,r.binding));mutations++;
 }
 for(const key of ['status','reasonCode']){const v=structuredClone(r.envelope);v.classification[key]='forged';assert.throws(()=>parseScriptEnvelope(JSON.stringify(v),r.binding));mutations++;}
 classifications.push({id:r.id,classification:r.envelope.classification});
}
save('actual-classifier.json',classifications);
assert.throws(()=>parseScriptEnvelope(JSON.stringify(synthetic()),frozen[0].binding));
const unsupported=frozen.find(r=>r.child.result.kind==='unsupported-operation');
assert(unsupported);
const witness=structuredClone(unsupported);
const debt={status:'unsupported-profile',reasonCode:'directive-script'};
witness.envelope.classification.blockers=[debt];witness.context.blockers=[debt];
assert.deepEqual(assertScriptContext(witness.envelope,witness.context,witness.binding),witness.envelope);
save('blocked-execution-witness.json',{meaning:'Actual decoder accepts structured unsupported outcome with blockers; future ledger must separately forbid executed blocked slots.',row:witness});
const moduleWitness=structuredClone(frozen[0]);moduleWitness.envelope.identity.variant='module';moduleWitness.envelope.identity.goal='Module';
assert.throws(()=>parseScriptEnvelope(JSON.stringify(moduleWitness.envelope),moduleWitness.binding));
save('module-boundary-witness.json',{input:moduleWitness,expected:'protocol rejection; retain Module in outer selection without coercing to Script'});
const {manifest,manifestSha256}=await frozenManifest();
const selection=manifest.entries.map(e=>{const meta={flags:[],features:[],includes:[],locale:[],negative:null,...e};return {id:e.id,path:e.path,variants:variants(meta).map(variant=>({variant,goal:variant==='module'?'Module':'Script',debts:blockers(meta,variant,e.id)}))};});
const slots=selection.flatMap(f=>f.variants);
assert.equal(selection.length,33);assert.equal(slots.length,60);assert(slots.every(v=>v.debts.length));
const counts={'unsupported-feature':0,'unsupported-profile':0};for(const s of slots)counts[s.debts[0].status]++;
assert.deepEqual(counts,{'unsupported-feature':19,'unsupported-profile':41});
save('actual-selection-debts.json',{basis:'frozen manifest metadata, not a fresh upstream byte retrieval',manifestSha256,selection,totals:{files:33,slots:60,blocked:60,counts,moduleSlots:slots.filter(s=>s.goal==='Module').length}});
// Preserve complete literal inputs/outputs, not only an outcome histogram.
save('decoder-literals.json',frozen);
const gates=json('docs/validation/ts-035d8/native-build-results.json');assert.equal(gates.length,71);
for(const lane of ['node','native']){const records=json('docs/validation/ts-035d8/guest-'+lane+'-results.json');assert.equal(records.length,212);assert(records.every(r=>r.verdict==='PASS'));}
save('audit-results.json',{base:'1e2f072',preservedFiles:preserved.length,literalDecoderRows:frozen.length,contextAndClassificationMutations:mutations,files:33,variants:60,blocked:60,counts,retainedGuestRecordsPerLane:212,retainedNativeGates:gates.length,freshBuild:false,freshNative:false});
console.log(JSON.stringify(json(here+'audit-results.json')));
