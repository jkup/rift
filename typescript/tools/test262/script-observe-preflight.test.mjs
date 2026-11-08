import test, {after} from 'node:test';
import {acquireScriptTestLease} from '../../docs/validation/ts-035c/test-lease.mjs';
const releaseLease=await acquireScriptTestLease();after(releaseLease);
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {mkdir,readFile,writeFile,chmod} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {prepareScriptObservation,launchScriptObservation,validateScriptLaunch} from './script-observe.mjs';
const archiveRoot=resolve('build/script-observations-preflight');await mkdir(archiveRoot,{recursive:true});
const options=(lane,limits={})=>({mode:'script-observation',control:'H01',input:'alpha',lane,variant:'strict',action:'execute',archiveRoot,limits});
const results=[];
async function save(name,p,r){results.push({name,directory:p.directory,result:r});await writeFile(join(archiveRoot,'preflight-negative-results.json'),JSON.stringify(results,null,2)+'\n');}
async function intercept(mode,body){const original=childProcess.spawn;childProcess.spawn=(exe,args,opts)=>{const child=original(exe,args,opts);const id=mode==='negative-normal'?'B02':'B01';if(args.includes(id))child.once('close',()=>{const offset=args.indexOf('script-observation'),path=args[offset+5];try{if(mode==='duplicate-report'){const text=readFileSync(path+'.control.json','utf8');writeFileSync(path+'.control.json',text.replace('"passed":','"passed":false,"passed":'));}else{const c=JSON.parse(readFileSync(path));const terminal=args.at(-3);c.completedUnits.push(c.operation.unitId);c.operation={stage:'test',phase:'body',unitId:terminal,realmId:'test'};c.source=null;c.testBodyEvaluated=true;c.inspection=null;c.result={kind:'normal'};writeFileSync(path,JSON.stringify(c));}}catch(e){throw e;}});return child;};syncBuiltinESMExports();try{return await body();}finally{childProcess.spawn=original;syncBuiltinESMExports();}}
for(const lane of ['node','native'])test(lane+' failed positive/negative preflight cannot mint ID',async()=>{
 for(const mode of ['negative-normal','duplicate-report']){
  const p=await intercept(mode,()=>prepareScriptObservation(options(lane)));const r=await launchScriptObservation(p);await save(lane+'/'+mode,p,r);
  assert.equal(r.state,'preflight-failed');assert.equal(p.binding.preflightId,null);assert.equal(r.failure.record.evidence.stage,'harness');assert.equal(r.failure.record.evidence.harnessValidated,false);assert.equal(r.failure.record.observation.kind,'host-fault');assert.equal(r.failure.record.observation.faultCode,'preflight-control');
  const pre=JSON.parse(await readFile(join(p.directory,'preflight.json')));assert.equal(pre.passed,false);assert.equal(pre.preflightId,null);assert.equal(pre.rows.at(-1).valid,false);
 }
 for(const [name,limits,kind] of [['steps',{steps:0},'resource-limit'],['calls',{calls:0},'resource-limit'],['deadline',{wallMs:0},'timeout']]){
  const p=await prepareScriptObservation(options(lane,limits)),r=await launchScriptObservation(p);await save(lane+'/'+name,p,r);assert.equal(r.state,'preflight-failed');assert.equal(r.failure.record.observation.kind,kind);assert.equal(r.failure.record.evidence.stage,'harness');assert.equal(r.failure.record.evidence.harnessValidated,false);assert.equal(p.binding.preflightId,null);
 }
});
test('no preflight cache and immutable reload occurrence hashes/order',async()=>{
 const a=await prepareScriptObservation(options('node')),b=await prepareScriptObservation(options('node'));assert.notEqual(a.binding.preflightId,b.binding.preflightId);assert.deepEqual(a.binding.units,b.binding.units);const pre=JSON.parse(await readFile(join(a.directory,'preflight.json')));for(const row of pre.rows){assert.equal(row.binding.sources.at(-1).transformedText,'"use strict";\n');assert.ok(row.binding.units.filter(u=>u.role==='harness').every(u=>u.sourceSha256===u.transformedSha256));}assert.equal(a.binding.units[1].path,a.binding.units[2].path);assert.notEqual(a.binding.units[1].id,a.binding.units[2].id);
 const bytes=await readFile(a.paths.sources[0]);try{await chmod(a.paths.sources[0],0o600);await writeFile(a.paths.sources[0],await readFile(a.paths.sources[1]));await assert.rejects(()=>validateScriptLaunch(a),/source-drift/);}finally{await writeFile(a.paths.sources[0],bytes);await chmod(a.paths.sources[0],0o400);}
 const cancel=new AbortController();cancel.abort();await launchScriptObservation(a,{signal:cancel.signal});await launchScriptObservation(b,{signal:cancel.signal});
});
test('stale compiled control-set digest cannot authorize preflight',async()=>{
 const path='test/fixtures/script-observation/frozen.json',bytes=await readFile(path);try{const f=JSON.parse(bytes);f.h7=f.h7.slice(0,-1);await writeFile(path,JSON.stringify(f));await assert.rejects(()=>prepareScriptObservation(options('node')),/preflight-controls-drift/);}finally{await writeFile(path,bytes);}
});
