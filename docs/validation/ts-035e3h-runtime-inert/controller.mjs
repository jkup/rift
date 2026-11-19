import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {hash,readIdentity} from './files.mjs';
import {openAttributes,observeNamed} from './runtime-support.mjs';
import {validateAliases} from './policy.mjs';
import {supervise} from './parent.mjs';
import {stageInputs,checkStaged,collect,readOutputs,readParentStreams,transportValid,reviewEnvelope,reviewObservation,verifyInputs} from './controller-pieces.mjs';
export const RUN_ENABLED=false;
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=n=>JSON.parse(fs.readFileSync(join(here,n)));
export async function run(){
 assert(RUN_ENABLED,'INERT_RECORDER_CONTROLLER_GATE');
 const plan=json('proposal.json'),config=json('execution-config.proposed.json'),oracle=json('smoke-oracle.json'),policy=json('output-policy.proposed.json'),build=json('build-plan.json'),aliases=json('alias-policy.json');
 assert.equal(config.root,plan.root);assert.equal(config.executable,plan.executable);assert.deepEqual(config.childEnvironment,plan.supervisorCommand.environment);assert.deepEqual(config.childEnvironment,oracle.environment);assert.deepEqual(config.argv,oracle.argv);assert.equal(config.childEnvironment.HOMEDRIVE+config.childEnvironment.HOMEPATH,config.childEnvironment.USERPROFILE);
 const identities=json('identities.json'),local=new Set(['supervisor.cs.proposed.txt','supervise.ps1.proposed.txt','execution-config.proposed.json']);
 const inputRows=identities.map(r=>({...r,path:local.has(r.role)?join(here,r.role):join(repo,r.path)}));
 const copies=plan.copies.map(c=>{const r=inputRows.find(r=>r.role===c.identity);assert(r);return {from:r.path,to:relative(plan.root,c.to).replaceAll('\\','/'),bytes:r.bytes,sha256:r.sha256};});assert.equal(copies.length,5);
 const report={outcome:'incomplete',stages:[],errors:[],dispatches:0,recorderCreations:null,supervisorAddTypeBudget:1,review:null,totalAttempts:null,attemptCoverage:'unproven',authority:'none'};let native,owned=false,state,before,after,observation;
 const save=(name,value)=>{const b=Buffer.from(JSON.stringify(value,null,2)+'\n');assert(b.length<=4194304);fs.writeFileSync(join(plan.root,name),b,{flag:'wx'});};
 const note=(name,fn)=>{const value=fn();report.stages.push(name);return value;};
 const observe=()=>{const aliasSnapshot={groups:aliases.groups.map(g=>({named:g.named,names:g.names,records:g.names.map(p=>observeNamed(p,native.get))})),utility:observeNamed(aliases.utility.path,native.get)};validateAliases(aliasSnapshot,aliases);const tools=[build.supervisorIdentity,build.supervisor.powershellRuntimeConfig,build.supervisor.roslynCSharp].map(r=>{const a=readIdentity(r.path,r,native.get).identity;for(const k of ['dev','ino','nlink','bytes','sha256'])assert.equal(a[k],r[k]);return a;});tools.push(readIdentity(build.node.path,{bytes:100097864,sha256:build.node.sha256},native.get,134217728).identity);return {aliasSnapshot,tools,inputs:verifyInputs(inputRows,native.get)};};
 try{
  native=openAttributes();before=note('identities-before',observe);
  state=note('exclusive-staging',()=>stageInputs(plan.root,plan.freshDirectories,copies,native.get,()=>{owned=true;}));
  note('staged-preflight',()=>checkStaged(state,policy,plan.freshDirectories,native.get));
  assert.deepEqual(observe(),before);save('started.json',{budget:plan.futureBudgets});save('inputs.json',state);save('before.json',before);
  const ready=collect(plan.root,policy,plan.freshDirectories,native.get);assert(ready.complete);assert.equal(ready.files.length,0);
  report.dispatches=1;report.outer=await supervise({supervisor:plan.supervisorCommand.executable,supervisorArgv:plan.supervisorCommand.argv,environment:plan.supervisorCommand.environment,supervisorWatchdogMs:90000},plan.root);
  const expected={exe:plan.supervisorCommand.executable,argv:plan.supervisorCommand.argv,cwd:plan.root,environment:plan.supervisorCommand.environment};
  note('outer-transport',()=>{assert(transportValid(report.outer,readParentStreams(plan.root,native.get),expected),'outer-transport-refused');});
  const outputs=note('bounded-status-stream-read',()=>readOutputs(plan.root,native.get));report.status=outputs.status;report.recorderCreations=outputs.status.CreatedSuspended===true?1:outputs.status.CreatedSuspended===false?0:null;
  report.review=reviewEnvelope({outer:report.outer,status:outputs.status,streams:outputs.streams,expected});if(report.review)throw Error('status-review-refused');
  observation=note('post-cleanup-snapshot',()=>collect(plan.root,policy,plan.freshDirectories,native.get));
  for(const [name,b] of [['supervisor-status.json',outputs.statusBytes],['compiler.stdout.bin',outputs.streams.stdout],['compiler.stderr.bin',outputs.streams.stderr],['supervisor.stdout.bin',outputs.streams.supervisorStdout],['supervisor.stderr.bin',outputs.streams.supervisorStderr]])assert.equal(observation.tree.rows.find(r=>r.path===name)?.sha256,hash(b));
  report.review=reviewObservation({outer:report.outer,status:outputs.status,streams:outputs.streams,observation,expected,oracle,inputs:state.inputs.map(r=>({...r,relative:relative(plan.root,r.path).replaceAll('\\','/')}))});
  if(report.review.outcome!=='captured-attempt-count-unproven')throw Error('post-cleanup-review-refused');
 }catch(e){report.errors.push({name:e.name,code:e.code??null,message:e.message,stack:e.stack});}
 finally{
  const retain=(name,fn)=>{try{note(name,fn);}catch(e){report.errors.push({stage:name,name:e.name,code:e.code??null,message:e.message,stack:e.stack});}};
  if(native)retain('identities-after',()=>{after=observe();if(owned)save('after.json',after);if(before)assert.deepEqual(after,before);});
  if(owned){retain('private-inputs-after',()=>{if(state)assert.deepEqual(verifyInputs(state.inputs,native.get),state.inputs);});retain('final-retained-snapshot',()=>{const final=collect(plan.root,policy,plan.freshDirectories,native.get);if(observation)for(const r of observation.tree.rows.filter(r=>r.kind==='file')){const last=final.tree.rows.find(x=>x.path===r.path);assert.deepEqual(last,r);}save('snapshot.json',final);assert(final.complete);});}
  try{native?.close();}catch(e){report.errors.push({stage:'metadata-close',message:e.message});}
  report.outcome=report.errors.length?'failed-stop-review':'captured-attempt-count-unproven-stop-review';
  if(owned){try{save('result.json',report);}catch(e){report.errors.push({stage:'result-publication',message:e.message});report.outcome='failed-stop-review';}}
 }
 console.log(JSON.stringify(report));if(report.errors.length)process.exitCode=1;return report;
}
