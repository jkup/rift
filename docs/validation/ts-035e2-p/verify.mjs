// Offline actual boundaries and immutable literal replay. No engine launches.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,copyFile,rm,open,link,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join,dirname,relative,isAbsolute} from 'node:path';
import {frozenManifest,planCorpus,REVISION,metadata,variants} from '../../../tools/test262/input.mjs';
import {readScriptCapabilities,reconstructScriptDebts} from '../../../tools/test262/script-capabilities.mjs';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope,assertScriptContext,inspectScriptEnvelope} from '../../../tools/test262/script-result.mjs';
import {parseEnvelope} from '../../../tools/test262/result.mjs';
import {synthetic} from '../../../tools/test262/fixtures.mjs';
import {newLedger,appendAttempt,persist} from '../../../tools/test262/ledger.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const read=async p=>JSON.parse(await readFile(p));
const save=async (n,v)=>writeFile(join(here,n),JSON.stringify(v,null,2)+'\n');
const hash=b=>createHash('sha256').update(b).digest('hex');
const preserved=await read(join(here,'preservation.json'));
for(const p of preserved)assert.equal(hash(await readFile(p.path)),p.sha256,p.path);
const {manifest}=await frozenManifest();
assert.deepEqual(await readScriptCapabilities(),{registryVersion:1,kind:'script-runtime-capabilities',entries:[]});
const corpus=await read(join(here,'corpus-literals.json'));
for(const lane of corpus){
 let ordinal=0,feature=0,profile=0;
 for(const [fileOrdinal,f] of lane.selection.files.entries()){
  const e=manifest.entries[fileOrdinal];assert.equal(f.path,e.path);assert.equal(f.manifestId,e.id);
  assert.deepEqual(f.slots.map(s=>s.variant),variants({...e,locale:e.locale??[]}));
  for(const s of f.slots){assert.equal(s.ordinal,ordinal++);assert.equal(s.fileOrdinal,fileOrdinal);assert.deepEqual(reconstructScriptDebts(s.metadata,s.variant,e.id),s.debts);assert.equal(s.admission,'blocked');if(s.debts[0].status==='unsupported-feature')feature++;else profile++;}
 }
 assert.equal(ordinal,60);assert.equal(feature,19);assert.equal(profile,41);assert.equal(lane.selection.files.length,33);
}
const frozen=await read('test/fixtures/script-observation-serialization/frozen.json');
const boundary=[];
const archiveIndex=await read('docs/validation/ts-035c/transport-artifacts-index.json');
assert.equal(hash(await readFile('docs/validation/ts-035c/transport-artifacts.zip')),archiveIndex.sha256);
for(const lane of ['node','native']){
 const directory=join(here,'producer-'+lane),prefix=(await readFile(join(directory,'archive-path.txt'),'utf8')).trim();
 for(const name of ['plan.json','child.json','record.json','completion.json','LICENSE']){
  const item=archiveIndex.entries.find(e=>e.path===prefix+name);assert(item);assert.equal(hash(await readFile(join(directory,name))),item.sha256);
 }
 const plan=await read(join(directory,'plan.json')),record=await read(join(directory,'record.json')),completion=await read(join(directory,'completion.json'));
 assert.equal(record.identity.lane,lane);assert.equal(record.identity.mode,'script-observation');assert(!Object.hasOwn(record,'classification'));
 const child=parseScriptDriverResult(await readFile(join(directory,'child.json')),plan.binding);assert.deepEqual(child.result,record.observation);
 assert.deepEqual(assertScriptContext(record,plan.context,plan.binding),record);
 const transport=Object.fromEntries(['process','outputBytes','outputLimit','capCount','capKilled','crashBeforeCap'].map(k=>[k,completion.facts[k]]));
 assert.deepEqual(inspectScriptEnvelope(await readFile(join(directory,'record.json')),plan.context,transport,plan.binding),record);
 boundary.push({id:'retained-producer-'+lane,actual:'both codecs and saved parent facts replay; observation only, not a receipt',archivePrefix:prefix});
}
for(const r of frozen){
 assert.deepEqual(parseScriptDriverResult(Buffer.from(r.ascii),r.binding),r.child);
 assert.deepEqual(parseScriptEnvelope(JSON.stringify(r.envelope),r.binding),r.envelope);
 assert.deepEqual(assertScriptContext(r.envelope,r.context,r.binding),r.envelope);
 assert.throws(()=>parseEnvelope(JSON.stringify(r.envelope)));
}
assert.throws(()=>parseScriptEnvelope(JSON.stringify(synthetic()),frozen[0].binding));
for(const kind of ['unsupported-operation','resource-limit']){
 const r=structuredClone(frozen.find(r=>r.child.result.kind===kind));assert(r);
 r.envelope.classification.blockers=[{status:'unsupported-profile',reasonCode:'directive-script'}];r.context.blockers=structuredClone(r.envelope.classification.blockers);
 assert.deepEqual(assertScriptContext(r.envelope,r.context,r.binding),r.envelope);
 boundary.push({id:'executed-blocked-'+kind,actual:'decoder accepts; E2 policy must reject',row:r});
}
const mod=structuredClone(frozen[0]);mod.envelope.identity.goal='Module';mod.envelope.identity.variant='module';mod.binding.variant='module';
assert.throws(()=>parseScriptEnvelope(JSON.stringify(mod.envelope),mod.binding));assert.throws(()=>parseScriptDriverResult(Buffer.from(mod.ascii),mod.binding));
boundary.push({id:'module',actual:'both closed decoders reject',row:mod});
const v1=await read('docs/validation/ts-031b-a/node-ledger.json');
const v1ledger=newLedger(v1.selection);assert.throws(()=>appendAttempt(v1ledger,v1.selection.files[0].variants[0].id,frozen[0].envelope));assert.equal(v1ledger.attempts.length,0);
boundary.push({id:'v1-ledger-rejects-v2',actual:'rejected with zero appended attempts'});
// Mutation closure is saved in full, with actual rejection checked each run.
let contextMutations=0;const contextRows=[];
const base=frozen.find(r=>r.id==='alpha/normal');assert(base);
for(const group of ['identity','inputs'])for(const key of Object.keys(base.context[group])){
 const c=structuredClone(base.context);const old=c[group][key];c[group][key]=Array.isArray(old)?[]:typeof old==='object'&&old!==null?{}:old===null?'forged':typeof old==='number'?old+1:'forged';
 if(JSON.stringify(c[group][key])===JSON.stringify(old))c[group][key]=['forged'];
 assert.throws(()=>assertScriptContext(base.envelope,c,base.binding),group+'/'+key);contextRows.push({group,key,context:c,expected:'reject'});contextMutations++;
}
for(const key of Object.keys(base.binding.limits)){
 const b=structuredClone(base.binding);b.limits[key]++;assert.throws(()=>parseScriptDriverResult(Buffer.from(base.ascii),b));contextRows.push({group:'limits',key,binding:b,expected:'reject'});contextMutations++;
}
await save('boundary-witnesses.json',boundary);await save('context-mutations.json',contextRows);
// Existing local exact-byte corpus; no retrieval or subprocess guest execution.
const root='C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075';
const actualPlans=[];
for(const lane of ['node','native']){
 const p=await planCorpus({root,revision:REVISION,lane,paths:manifest.entries.map(e=>e.path)});assert(p.files.every(f=>f.inputError===null));
 const literal=corpus.find(c=>c.lane===lane).selection;
 for(const [i,f] of p.files.entries())for(const [j,v] of f.variants.entries()){
  const s=literal.files[i].slots[j];for(const key of ['id','path','lane','variant','goal','blob','sourceSha256','byteLength','transformedSourceSha256','harness'])assert.deepEqual(v[key],s[key],key);
 }
 actualPlans.push(p);
}
await save('actual-plans.json',actualPlans);
const inputRows=[];
for(const paths of [[],[manifest.entries[0].path,manifest.entries[0].path],[''],['test/unknown.js'],['test/a_FIXTURE.js']]){
 await assert.rejects(planCorpus({root,revision:REVISION,lane:'node',paths}),/selection-mismatch/);inputRows.push({paths,expected:'selection-mismatch'});
}
for(const [revision,source,reason] of [['wrong',root,'revision-mismatch'],[REVISION,join(here,'nonexistent'),'retrieval']]){
 const result=await planCorpus({root:source,revision,lane:'node',paths:[manifest.entries[0].path]});assert.equal(result.files[0].variants,null);assert.equal(result.files[0].inputError.reasonCode,reason);inputRows.push({id:reason,result});
}
for(const source of ['1;','/*---\nflags: []\n---*/','/*---\ndescription: x\nnegative: {type: Error}\n---*/']){assert.throws(()=>metadata(source),/metadata/);inputRows.push({id:'actual-metadata-reject',source,expected:'metadata'});}
const scratch=await mkdtemp(join(here,'scratch-'));
try{
 const e=manifest.entries[0];await mkdir(dirname(join(scratch,e.path)),{recursive:true});await copyFile(join(root,e.path),join(scratch,e.path));
 for(const phase of ['no-includes','verified-first-include','corrupt-second-include']){
  if(phase==='verified-first-include'){await mkdir(join(scratch,'harness'));await copyFile(join(root,'harness/assert.js'),join(scratch,'harness/assert.js'));}
  if(phase==='corrupt-second-include')await writeFile(join(scratch,'harness/sta.js'),'corrupted');
  const p=await planCorpus({root:scratch,revision:REVISION,lane:'node',paths:[e.path]});assert.equal(p.files[0].variants.length,2);assert.equal(p.files[0].inputError.reasonCode,phase==='corrupt-second-include'?'blob-mismatch':'include-missing');for(const v of p.files[0].variants)assert.deepEqual(v.harness,[]);inputRows.push({id:phase,result:p});
 }
 // Real current v1 persistence, separate from future checkpoint model.
 const path=join(scratch,'snapshot.json');await persist(path,{phase:'old'});await persist(path,{phase:'new'});assert.deepEqual(await read(path),{phase:'new'});inputRows.push({id:'actual-v1-persist',expected:'new snapshot replaced old; no v2 reopen claim'});
 const temp=join(scratch,'generation.tmp'),destination=join(scratch,'checkpoint-0.json');
 const handle=await open(temp,'wx');await handle.writeFile('complete bytes\n');await handle.sync();await handle.close();
 let available=true;
 try{await link(temp,destination);}catch(error){assert(['EPERM','ENOTSUP','EOPNOTSUPP'].includes(error.code));available=false;inputRows.push({id:'actual-exclusive-checkpoint-link',outcome:'storage-unavailable',code:error.code,accepted:false});}
 if(available){assert.equal(await readFile(destination,'utf8'),'complete bytes\n');await assert.rejects(link(temp,destination),e=>e.code==='EEXIST');await unlink(temp);assert.equal(await readFile(destination,'utf8'),'complete bytes\n');inputRows.push({id:'actual-exclusive-checkpoint-link',outcome:'complete bytes; EEXIST preserves destination; unlinking temp preserves destination',accepted:true});}
}finally{const rel=relative(here,resolve(scratch));assert(rel&&!rel.startsWith('..')&&!isAbsolute(rel));await rm(scratch,{recursive:true,force:true});}
await save('input-witnesses.json',inputRows);
const inventoryPaths=['tools/test262/input.mjs','tools/test262/plan.mjs','tools/test262/ledger.mjs','tools/test262/script-capabilities.mjs','tools/test262/script-observe.mjs','tools/test262/script-result.mjs','tools/test262/script-driver-result.mjs','src/script-observation.ts','src/script-observation-types.ts','src/script-observation-json.ts'];
const inventory=[];for(const path of inventoryPaths){const text=await readFile(path,'utf8');inventory.push({path,sha256:hash(Buffer.from(text)),declarations:text.split(/\r?\n/).flatMap((text,n)=>/^(import |export |(?:async )?function |const (?:plans|classification|identityShape|negativeShape))/.test(text)?[{line:n+1,text}]:[])});}
await save('closure-inventory.json',inventory);
const callsites=execFileSync('rg',['-n','planCorpus|readScriptCapabilities|reconstructScriptDebts|appendAttempt|newLedger|parseScriptEnvelope|parseScriptDriverResult|inspectScriptEnvelope|prepareScriptObservation|launchScriptObservation','tools/test262','src/script-observation.ts'],{encoding:'utf8',maxBuffer:8e6});await writeFile(join(here,'callsites.txt'),callsites);
for(const p of preserved)assert.equal(hash(await readFile(p.path)),p.sha256,p.path);
assert.equal((await read('docs/validation/ts-035d8/native-build-results.json')).length,71);
for(const lane of ['node','native']){const rows=await read(`docs/validation/ts-035d8/guest-${lane}-results.json`);assert.equal(rows.length,212);assert(rows.every(r=>r.verdict==='PASS'));}
const result={base:'51bf64d',preservedFiles:preserved.length,actualDecoderRows:frozen.length,contextMutations,actualInputWitnesses:inputRows.length,storageProbe:inputRows.find(r=>r.id==='actual-exclusive-checkpoint-link'),actualPinnedPlans:2,filesPerLane:33,slotsPerLane:60,firstFeature:19,firstProfile:41,admitted:0,executed:0,retainedRecordsPerLane:212,retainedGates:71,freshBuild:false};await save('verify-results.json',result);console.log(JSON.stringify(result));
