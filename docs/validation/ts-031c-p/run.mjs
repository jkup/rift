// Audit only. Rift runs its existing parser-observation driver, never a host evaluator.
// vm.Script is used ONLY to compile reference-engine inputs; no run* method is called.
import { Script } from 'node:vm';
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { cases } from './cases.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(here,'../../..');
const corpus=process.argv[2];
if(!corpus) throw Error('usage: node docs/validation/ts-031c-p/run.mjs EXTERNAL_PINNED_CORPUS_ROOT');
const scratch=join(here,'scratch');
await mkdir(scratch); // refuse existing work
const sha=(x,alg='sha256')=>createHash(alg).update(x).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const manifest=JSON.parse(await readFile(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json'),'utf8'));
const entries=Object.values(manifest).find(x=>Array.isArray(x)&&x.some(y=>y.id==='S18'));
const inputs=cases.map(([id,source,capability,reference])=>({id,source,capability,reference,synthetic:true}));
for(const entry of entries.filter(x=>['S18','S19','S20','S21','S22'].includes(x.id))){
 const bytes=await readFile(join(corpus,entry.path));
 assert.equal(sha(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes]),'sha1'),entry.blob);
 assert.deepEqual(Buffer.from(bytes.toString('utf8')),bytes,'pinned UTF-8 round trip');
 for(const variant of entry.variants){
  inputs.push({id:entry.id+'/'+variant,source:(variant==='strict'?'"use strict";\n':'')+bytes.toString('utf8'),
   capability:{S18:'parse.assignment-target',S19:'parse.declaration-statement',S20:'parse.return-context',S21:'parse.duplicate-parameter',S22:'parse.duplicate-binding'}[entry.id],
   reference:'SyntaxError',synthetic:false,path:entry.path,blob:entry.blob,sourceSha256:sha(bytes),variant});
 }
}
const nodeDir=join(root,'build/node/src');
const artifacts={native:sha(await readFile(join(root,'build/native/observation-driver.exe'))),node:{}};
for(const name of (await readdir(nodeDir)).filter(x=>x.endsWith('.js')).sort()) artifacts.node[name]=sha(await readFile(join(nodeDir,name)));
const output={base:git('rev-parse','HEAD'),node:process.version,v8:process.versions.v8,revision:manifest.upstream.revision,
 note:'Existing binaries, no rebuild. Reference Script compilation only; no guest evaluation, harness loading, admission or conformance classification.',artifacts,rows:[]};
try {
 for(const input of inputs){
  const {source,...identity}=input;
  const row={...identity,transformedSha256:sha(source),reference:null,lanes:{}};
  try { new Script(source,{filename:input.id}); row.reference={outcome:'accepted'}; }
  catch(e){ row.reference={outcome:e.name,message:e.message}; }
  assert.equal(row.reference.outcome,input.reference,input.id+' reference');
  const path=join(scratch,'source.js'); await writeFile(path,source);
  for(const lane of ['node','native']){
   const resultPath=join(scratch,lane+'.json');
   const binary=lane==='node'?process.execPath:join(root,'build/native/observation-driver.exe');
   const args=[...(lane==='node'?[join(nodeDir,'observation-driver.js')]:[]),'parser-observation',path,input.id,resultPath,'audit-'+input.id,'100000','64'];
   const run=spawnSync(binary,args,{encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
   assert.equal(run.error,undefined); assert.equal(run.status,0); assert.equal(run.signal,null);
   assert.equal(run.stdout,''); assert.equal(run.stderr,'');
   const record=JSON.parse(await readFile(resultPath,'utf8'));
   assert.equal(record.bodyEvaluated,false);
   assert.equal(record.observation.kind,input.capability===null?'normal':'unsupported-syntax',input.id+' '+lane);
   assert.equal(record.observation.capabilityCode??null,input.capability,input.id+' '+lane);
   row.lanes[lane]={exitCode:run.status,stdout:run.stdout,stderr:run.stderr,record};
  }
  assert.deepEqual(row.lanes.node,row.lanes.native,input.id+' lane difference');
  output.rows.push(row);
 }
 await writeFile(join(here,'results.json'),JSON.stringify(output,null,2)+'\n');
 console.log(`${inputs.length} inputs; ${inputs.length*2} Rift parser observations; ${inputs.length} reference compilations; literal checks passed.`);
} finally { await rm(scratch,{recursive:true}); }
