import test, {after} from 'node:test';
import {acquireScriptTestLease} from '../../docs/validation/ts-035c/test-lease.mjs';
const releaseLease=await acquireScriptTestLease();after(releaseLease);
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile,mkdtemp} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {prepareScriptObservation,launchScriptObservation} from './script-observe.mjs';
import {REVISION,frozenManifest,planCorpus,transform,sha256,verifyBytes} from './input.mjs';
import {parseEnvelope} from './result.mjs';
const corpusRoot='C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075';
const archiveRoot=resolve('build/script-observations-pinned');await mkdir(archiveRoot,{recursive:true});
const {manifest}=await frozenManifest();const s1=manifest.entries.find(e=>e.id==='S01'),s2=manifest.entries.find(e=>e.id==='S02'),u1=manifest.entries.find(e=>e.id==='U01');
const results=[];
for(const lane of ['node','native'])test(lane+' actual pinned S01/S02 original metadata, strict bytes and uncached preflight',async()=>{
 let previous=null;
 for(const entry of [s1,s2]){
  const original=await readFile(join(corpusRoot,entry.path));
  const p=await prepareScriptObservation({mode:'script-observation',corpusRoot,revision:REVISION,path:entry.path,variant:'strict',lane,action:'execute',archiveRoot});
  assert.equal(p.context.expectedNegative.phase,'runtime');assert.ok(p.context.blockers.length>0);
  assert.equal(p.binding.sources.at(-1).transformedText,new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(transform(original,'strict')));
  assert.equal(p.binding.units.at(-1).sourceSha256,sha256(original));assert.equal(p.binding.units.at(-1).blob,entry.blob);
  assert.ok(p.binding.preflightId);assert.notEqual(p.binding.preflightId,previous);previous=p.binding.preflightId;
  const pre=JSON.parse(await readFile(join(p.directory,'preflight.json')));assert.equal(pre.rows.length,19);assert.ok(pre.rows.every(r=>r.valid));assert.equal(pre.preflightId,p.binding.preflightId);
  const r=await launchScriptObservation(p);assert.equal(r.state,'complete');assert.equal(r.record.observation.kind,'throw');assert.equal(r.record.observation.constructor.name,'ReferenceError');assert.equal(r.record.evidence.stage,'test');assert.equal(r.record.evidence.harnessValidated,true);assert.deepEqual(r.record.evidence.completedUnits,['u0','u1']);assert.ok(!Object.hasOwn(r.record,'classification'));
  assert.throws(()=>parseEnvelope(JSON.stringify(r.record)));results.push({lane,id:entry.id,directory:p.directory,record:r.record});await writeFile(join(archiveRoot,'pinned-results.json'),JSON.stringify(results,null,2)+'\n');
 }
});
test('pinned selection, corrupted source/metadata/UTF8 and parse-negative execute reject before test launch',async()=>{
 const root=await mkdtemp(resolve('build/script-corpus-'));await mkdir(join(root,'harness'));
 for(const name of ['assert.js','sta.js'])await copyFile(join(corpusRoot,'harness',name),join(root,'harness',name));
 await mkdir(dirname(join(root,s1.path)),{recursive:true});const bytes=await readFile(join(corpusRoot,s1.path));await writeFile(join(root,s1.path),bytes);
 const o={mode:'script-observation',corpusRoot:root,revision:REVISION,path:s1.path,variant:'strict',lane:'node',action:'execute',archiveRoot};
 for(const changed of [Buffer.concat([bytes,Buffer.from(';')]),Buffer.from(bytes.toString().replace('description:','descriptioX:')),Buffer.from([0xc0,0xaf])]){await writeFile(join(root,s1.path),changed);await assert.rejects(()=>prepareScriptObservation(o),/selection/);}
 await writeFile(join(root,s1.path),bytes);await assert.rejects(()=>prepareScriptObservation({...o,revision:'0'.repeat(40)}),/selection/);
 await assert.rejects(()=>prepareScriptObservation({...o,variant:'raw'}),/selection/);
 await assert.rejects(()=>prepareScriptObservation({...o,corpusRoot,path:u1.path}),/parse-negative-action/);
});
test('all 33 original files and 60 variants remain blocked in each lane',async()=>{
 const rows=[];for(const lane of ['node','native']){const s=await planCorpus({root:corpusRoot,revision:REVISION,lane,paths:manifest.entries.map(e=>e.path)});assert.equal(s.files.length,33);assert.ok(s.files.every(f=>f.inputError===null));const variants=s.files.flatMap(f=>f.variants);assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));rows.push({lane,files:33,variants:60,blocked:60});}await writeFile('docs/validation/ts-035c/blocked-results.json',JSON.stringify(rows,null,2)+'\n');
});

for(const lane of ['node','native'])test(lane+' pinned positive harness assertions run after complete discard and reload',async()=>{
 for(const id of ['S05','S08']){
  const entry=manifest.entries.find(e=>e.id===id);
  const p=await prepareScriptObservation({mode:'script-observation',corpusRoot,revision:REVISION,path:entry.path,variant:'strict',lane,action:'execute',archiveRoot});
  const r=await launchScriptObservation(p);assert.equal(r.state,'complete');assert.deepEqual(r.record.observation,{kind:'normal'});assert.equal(r.record.evidence.testBodyEvaluated,true);assert.equal(r.record.evidence.harnessValidated,true);assert.deepEqual(r.record.evidence.completedUnits,['u0','u1']);assert.ok(p.context.blockers.length>0);assert.ok(!Object.hasOwn(r.record,'classification'));
  results.push({lane,id,directory:p.directory,record:r.record});await writeFile(join(archiveRoot,'pinned-results.json'),JSON.stringify(results,null,2)+'\n');
 }
});
