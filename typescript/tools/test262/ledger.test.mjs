import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { newLedger, appendAttempt, report, persist } from './ledger.mjs';
import { frozenManifest, variants, blockers, fixtureSelection, planCorpus, REVISION } from './input.mjs';
import { preflightRecords, main } from './plan.mjs';
import { synthetic, thrown, selectionFor, H } from './fixtures.mjs';

function measured(records) {
  const ledger = newLedger(selectionFor(records));
  records.forEach((record,i) => appendAttempt(ledger,`synthetic-${i}`,record));
  return ledger;
}
test('T09 lane numerators remain separate', () => {
  const node = report(measured([synthetic()]));
  const native = report(measured([synthetic({ lane:'native',observation:{kind:'timeout',wallMs:1000} })]));
  assert.equal(node.lane,'node'); assert.equal(node.counts.pass,1); assert.equal(node.counts.timeout,0);
  assert.equal(native.lane,'native'); assert.equal(native.counts.pass,0); assert.equal(native.counts.timeout,1);
});
test('T10 all eight statuses count once with literal denominators', () => {
  const records = [synthetic(), synthetic({observation:thrown()}),
    synthetic({observation:{kind:'unsupported-syntax',capabilityCode:'async'}}),
    synthetic({stage:'preflight',observation:{kind:'not-run',reasonCode:'sloppy-script'},blockers:[{status:'unsupported-profile',reasonCode:'sloppy-script'}]}),
    synthetic({stage:'harness',observation:thrown('TypeError')}),
    synthetic({observation:{kind:'resource-limit',guardCode:'steps',count:11,limit:10}}),
    synthetic({observation:{kind:'timeout',wallMs:1000}}),
    synthetic({observation:{kind:'host-fault',faultCode:'internal'}})];
  const r = report(measured(records));
  assert.deepEqual(r.counts,{pass:1,fail:1,'unsupported-feature':1,'unsupported-profile':1,'harness-error':1,'resource-limit':1,timeout:1,'host-fault':1});
  assert.equal(r.plannedVariants,8); assert.equal(r.completed,8);
  assert.deepEqual(r.passOverPlanned,{numerator:1,denominator:8});
  assert.deepEqual(r.conditionalPass,{numerator:1,denominator:2});
});
test('V01 T11 complete pairs retain both statuses and file does not pass', () => {
  const a = synthetic({variant:'non-strict',stage:'preflight',observation:{kind:'not-run',reasonCode:'sloppy-script'},blockers:[{status:'unsupported-profile',reasonCode:'sloppy-script'}]});
  const b = synthetic();
  const selection = selectionFor([a,b]);
  selection.files[0].variants.push(...selection.files[1].variants); selection.files.pop();
  const ledger = newLedger(selection);
  appendAttempt(ledger,'synthetic-0',a); appendAttempt(ledger,'synthetic-1',b);
  const r = report(ledger);
  assert.equal(r.selectedFiles,1); assert.equal(r.passedFiles,0);
  assert.deepEqual(r.passOverPlanned,{numerator:1,denominator:2});
  assert.deepEqual(r.files[0].statuses,[{variant:'non-strict',status:'unsupported-profile'},{variant:'strict',status:'pass'}]);
});
test('T12 frozen metadata plan: 33 files / 60 variants independently per lane; not byte-verification evidence', async () => {
  const {manifest,manifestSha256} = await frozenManifest();
  for (const lane of ['node','native']) {
    // This tests the frozen selection arithmetic and host-only blocker ledger.
    // It deliberately does not call the production byte verifier with fake bytes.
    const selection = { lane,manifestSha256,cache:false,excludedFixtures:[], files:manifest.entries.map(e => {
      const meta = {...e,locale:e.locale??[],negative:e.negative??null};
      return {path:e.path,inputError:null,variants:variants(meta).map(variant => ({
        id:`${REVISION}:${e.path}:${variant}:${lane}`,path:e.path,variant,lane,
        goal:variant==='module'?'Module':'Script',blob:e.blob,sourceSha256:H,
        transformedSourceSha256:H,harness:[],metadata:meta,blockers:blockers(meta,variant,e.id),
      }))};
    })};
    assert.equal(selection.files.length,33);
    const all = selection.files.flatMap(f=>f.variants);
    assert.equal(all.length,60);
    assert.deepEqual(Object.fromEntries(['strict','non-strict','raw','module'].map(v=>[v,all.filter(x=>x.variant===v).length])),{strict:30,'non-strict':28,raw:1,module:1});
    assert.equal(new Set(all.map(v=>v.id)).size,60);
    const ledger = newLedger(selection);
    for (const {id,record} of await preflightRecords(selection)) {
      assert.equal(record.observation.kind,'not-run');
      assert.equal(record.evidence.bodyEvaluated,false);
      appendAttempt(ledger,id,record);
    }
    const r = report(ledger);
    assert.equal(r.selectedFiles,33); assert.equal(r.plannedVariants,60);
    assert.equal(r.completed,60); assert.equal(r.executedVariants,0);
    assert.equal(r.counts.pass,0); assert.equal(r.counts.fail,0);
    // 4 S01/S02 runtime-error variants + 2 U01 + 2 U02 + 1 U03 +
    // 1 module + 1 U07 runtime-error + 2 async + 2 RegExp + 2 U10 + 2 U11.
    assert.equal(r.counts['unsupported-feature'],19);
    assert.equal(r.counts['unsupported-profile'],41);
    assert.deepEqual(r.passOverPlanned,{numerator:0,denominator:60});
    assert.equal(r.conditionalPass,null); assert.equal(r.exitCode,1);
  }
});
test('T13 malformed metadata retains unknown denominator', () => {
  const records=[synthetic({variant:'non-strict'}),synthetic()];
  const ledger=measured(records);
  ledger.selection.files[0].variants.push(...ledger.selection.files[1].variants);
  ledger.selection.files[1]={path:'test/bad.js',variants:null,inputError:{status:'harness-error',stage:'input',reasonCode:'metadata'}};
  const r=report(ledger);
  assert.equal(r.selectedFiles,2); assert.equal(r.plannedVariants,2); assert.equal(r.unplannedInputErrors,1);
  assert.equal(r.passOverPlanned,null); assert.equal(r.complete,false); assert.equal(r.exitCode,2);
});
test('T14 fixture paths are explicitly excluded and cannot broaden production', async () => {
  assert.deepEqual(fixtureSelection(['test/dep_FIXTURE.js','test/body.js']),{selected:['test/body.js'],excludedFixtures:['test/dep_FIXTURE.js']});
  await assert.rejects(planCorpus({root:'.',revision:REVISION,lane:'node',paths:['test/dep_FIXTURE.js']}),/selection-mismatch/);
});
test('T15 cancellation persists full selection before any terminal records', async () => {
  const records=[synthetic(),synthetic(),synthetic()];
  const ledger=newLedger(selectionFor(records));
  const root=await mkdtemp(join(tmpdir(),'rift-ledger-'));
  try {
    const path=join(root,'ledger.json');
    await persist(path,ledger);
    assert.equal(report(JSON.parse(await readFile(path,'utf8'))).missing,3);
    appendAttempt(ledger,'synthetic-0',records[0]);
    await persist(path,ledger);
    const r=report(JSON.parse(await readFile(path,'utf8')));
    assert.equal(r.plannedVariants,3); assert.equal(r.completed,1); assert.equal(r.missing,2);
    assert.equal(r.passOverPlanned,null); assert.equal(r.exitCode,2);
  } finally {await rm(root,{recursive:true,force:true});}
});
test('T16 retries require explicit policy and retain initial failure', () => {
  const fail=synthetic({observation:thrown()});
  const ledger=measured([fail]);
  assert.throws(()=>appendAttempt(ledger,'synthetic-0',synthetic()),/retry-policy/);
  appendAttempt(ledger,'synthetic-0',synthetic(),'explicit synthetic rerun control');
  const r=report(ledger);
  assert.equal(r.plannedVariants,1); assert.equal(r.attempts,2); assert.equal(r.counts.fail,1); assert.equal(r.counts.pass,0);
  assert.equal(ledger.attempts[1].record.classification.status,'pass');
});
test('T17 no cache path; all identity/input changes remain distinct records', async () => {
  const original=synthetic();
  for (const mutate of [r=>{r.identity.adapterSha256='c'.repeat(64);},r=>{r.inputs.capabilityLedgerSha256='c'.repeat(64);},
    r=>{r.inputs.harness=[{path:'harness/a.js',blob:'c'.repeat(40),sha256:'c'.repeat(64)}];},
    r=>{r.inputs.harness=[{path:'harness/b.js',blob:'c'.repeat(40),sha256:'c'.repeat(64)},{path:'harness/a.js',blob:'b'.repeat(40),sha256:H}];},
    r=>{r.identity.corpusRevision='c'.repeat(40);},r=>{r.inputs.limits.steps=100001;},r=>{r.identity.engineBuildSha256='c'.repeat(64);}]) {
    const changed=structuredClone(original); mutate(changed); assert.notDeepEqual(changed,original);
  }
  const {manifest}=await frozenManifest();
  const selection=await planCorpus({root:'.',revision:REVISION,lane:'node',paths:[manifest.entries[0].path]});
  assert.equal(selection.cache,false);
});
test('T18 observation success cannot enter ledger or numerator', () => {
  const ledger=newLedger(selectionFor([synthetic()]));
  assert.throws(()=>appendAttempt(ledger,'synthetic-0',synthetic({mode:'body-observation'})),/identity/);
  assert.equal(report(ledger).counts.pass,0);
});
test('T19 three batch exits', () => {
  assert.equal(report(measured([synthetic()])).exitCode,0);
  assert.equal(report(measured([synthetic({observation:{kind:'unsupported-syntax',capabilityCode:'x'}})])).exitCode,1);
  assert.equal(report(newLedger(selectionFor([synthetic()]))).exitCode,2);
});
test('Blocked selection cannot accept a synthetic pass or altered input identity', () => {
  const success=synthetic();
  const selection=selectionFor([success]);
  selection.files[0].variants[0].blockers=[{status:'unsupported-profile',reasonCode:'strict-script-contract'}];
  assert.throws(()=>appendAttempt(newLedger(selection),'synthetic-0',success),/profile-not-admitted/);
  const changed=synthetic({lane:'native'});
  assert.throws(()=>appendAttempt(newLedger(selection),'synthetic-0',changed),/identity/);
  const ordinary=selectionFor([success]); ordinary.manifestSha256='c'.repeat(64);
  assert.throws(()=>appendAttempt(newLedger(ordinary),'synthetic-0',success),/identity/);
});
test('CLI retains input-error ledgers and refuses to overwrite a previous run', async () => {
  const temp=await mkdtemp(join(tmpdir(),'rift-plan-'));
  try {
    const {manifest}=await frozenManifest();
    const paths=join(temp,'paths.json');
    await writeFile(paths,JSON.stringify([manifest.entries[0].path]));
    const output=join(temp,'run');
    assert.equal(await main([join(temp,'missing-corpus'),REVISION,'node',paths,output]),2);
    const first=await readFile(join(output,'ledger.json'),'utf8');
    const summary=JSON.parse(await readFile(join(output,'report.json'),'utf8'));
    assert.equal(summary.selectedFiles,1); assert.equal(summary.unplannedInputErrors,1);
    assert.equal(summary.passOverPlanned,null);
    await assert.rejects(main([temp,REVISION,'node',paths,output]),/EEXIST/);
    assert.equal(await readFile(join(output,'ledger.json'),'utf8'),first);
  } finally {await rm(temp,{recursive:true,force:true});}
});
