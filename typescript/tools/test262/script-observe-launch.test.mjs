import test, {after} from 'node:test';
import {acquireScriptTestLease} from '../../docs/validation/ts-035c/test-lease.mjs';
const releaseLease=await acquireScriptTestLease();after(releaseLease);
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {readFile,writeFile,mkdir,lstat,chmod,unlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {prepareScriptObservation,validateScriptLaunch,launchScriptObservation} from './script-observe.mjs';
import {inspectScriptEnvelope} from './script-result.mjs';
const archiveRoot=resolve('build/script-observations-lifecycle');await mkdir(archiveRoot,{recursive:true});
const options=(lane='node',more={})=>({mode:'script-observation',control:'S03-valid',input:'alpha',lane,variant:'raw',action:'parse-only',archiveRoot,...more});
async function hook(wrapper,body){const original=childProcess.spawn;childProcess.spawn=(exe,args,opts)=>wrapper(original,exe,args,opts);syncBuiltinESMExports();try{return await body();}finally{childProcess.spawn=original;syncBuiltinESMExports();}}
const recorded=[];
async function record(name,p,r){recorded.push({name,plan:p.directory,result:r});await writeFile('docs/validation/ts-035c/lifecycle-latest.json',JSON.stringify(recorded,null,2)+'\n');}
for(const lane of ['node','native'])test(lane+' real process transport priorities and authenticated cap archive',async()=>{
 for(const mode of ['exit70','stdout','malformed','cap','crashcap']){
  const p=await prepareScriptObservation(options(lane,{limits:{outputBytes:['cap','crashcap'].includes(mode)?20000:1048576}}));
  const r=await hook((spawn,exe,args,opts)=>{const child=spawn(process.execPath,[resolve('docs/validation/ts-035c/transport-process.mjs'),'fixture',mode,exe,...args],opts);if(mode==='crashcap'){child.stdout.pause();child.once('exit',()=>setImmediate(()=>child.stdout.resume()));}return child;},()=>launchScriptObservation(p));
  await record(lane+'/'+mode,p,r);assert.equal(r.state,'complete');const o=r.record.observation;
  assert.equal(o.kind,mode==='cap'?'resource-limit':'host-fault',p.directory);
  if(mode==='cap'){assert.equal(r.facts.outputBytes,32768);assert.equal((await readFile(join(r.directory,'stdout.bin'))).length,16384);assert.equal((await readFile(join(r.directory,'stderr.bin'))).length,16384);assert.equal(o.guardCode,'output');assert.equal(r.facts.capKilled,true);assert.ok(r.facts.capCount>20000);}
  else assert.equal(o.faultCode,['exit70','crashcap'].includes(mode)?'crash':'protocol');
  if(mode==='crashcap'){assert.equal(r.facts.crashBeforeCap,true);assert.equal(r.facts.capKilled,false);assert.ok(r.facts.capCount>20000);}
  const f=r.facts,t={process:f.process,outputBytes:f.outputBytes,outputLimit:f.outputLimit,capCount:f.capCount,capKilled:f.capKilled,crashBeforeCap:f.crashBeforeCap};
  assert.deepEqual(inspectScriptEnvelope(JSON.stringify(r.record),p.context,t,p.binding),r.record);
  assert.deepEqual(inspectScriptEnvelope('{}',p.context,{...t,process:{...t.process,deadlineExpired:true}},p.binding),{status:'timeout',reasonCode:'deadline'});
  if(mode==='cap'){assert.deepEqual(inspectScriptEnvelope(JSON.stringify(r.record),p.context,{...t,capKilled:false,crashBeforeCap:true},p.binding),{status:'host-fault',reasonCode:'crash'});}
 }
});
for(const lane of ['node','native'])test(lane+' immutable single-use plans and deterministic cancellation lifecycle',async()=>{
 let p=await prepareScriptObservation(options(lane));assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.binding.sources[0])&&Object.isFrozen(p.binding.limits));assert.throws(()=>{p.binding.action='execute';},TypeError);await assert.rejects(()=>validateScriptLaunch(structuredClone(p)),/context/);
 const before=new AbortController();before.abort();let r=await launchScriptObservation(p,{signal:before.signal});await record(lane+'/prelaunch-cancel',p,r);assert.equal(r.state,'unfinished');await assert.rejects(()=>launchScriptObservation(p),/context/);await assert.rejects(()=>lstat(p.paths.result),{code:'ENOENT'});
 p=await prepareScriptObservation(options(lane));const after=new AbortController();let actualSpawn=false;
 r=await hook((spawn,exe,args,opts)=>{const child=spawn(exe,args,opts);child.once('spawn',()=>{actualSpawn=true;after.abort();});return child;},()=>launchScriptObservation(p,{signal:after.signal}));
 await record(lane+'/afterspawn-cancel',p,r);assert.equal(actualSpawn,true);assert.equal(r.state,'unfinished');assert.equal(JSON.parse(await readFile(join(p.directory,'transport.json'))).cancelled,true);await assert.rejects(()=>launchScriptObservation(p),/context/);await assert.rejects(()=>lstat(join(p.directory,'record.json')),{code:'ENOENT'});
});
test('source artifacts, nested closure, build and adapter drift reject before spawn',async()=>{
 const p=await prepareScriptObservation(options());
 assert.ok(p.build.source.files.some(([f])=>f.replaceAll('\\','/').endsWith('/src/builtins/function.ts')));
 assert.ok(p.build.built.files.some(([f])=>f.replaceAll('\\','/').endsWith('/src/builtins/function.js')));
 assert.ok(p.build.adapter.files.some(([f])=>f.replaceAll('\\','/').includes('/node_modules/yaml/dist/')));
 for(const path of [p.paths.sources[0],p.build.control,resolve('tools/test262/script-observe.mjs')]){const bytes=await readFile(path);try{await chmod(path,0o600);await writeFile(path,Buffer.concat([bytes,Buffer.from('\n')]));await assert.rejects(()=>validateScriptLaunch(p),/drift/);}finally{await writeFile(path,bytes);}}
 await validateScriptLaunch(p);
 const clone=structuredClone(p);clone.binding.units.reverse();await assert.rejects(()=>validateScriptLaunch(clone),/context/);
 const c=new AbortController();c.abort();await launchScriptObservation(p,{signal:c.signal});
});
test('all seven limits, mode, variant and frozen control source policy are enforced',async()=>{
 for(const limits of [{sourceUnits:99999},{parseDepth:1},{evaluationDepth:1},{steps:-1},{calls:0.5},{wallMs:2147483648},{outputBytes:NaN},{unknown:1}])await assert.rejects(()=>prepareScriptObservation(options('node',{limits})),/limit/);
 await assert.rejects(()=>prepareScriptObservation(options('node',{mode:'conformance'})),/mode/);
 await assert.rejects(()=>prepareScriptObservation(options('node',{variant:'strict'})),/control-policy/);
 await assert.rejects(()=>prepareScriptObservation(options('node',{control:'unregistered-case'})),/registered-control/);
});
