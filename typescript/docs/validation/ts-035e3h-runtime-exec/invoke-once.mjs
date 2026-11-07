// Fresh explicit owner approval. Exclusive start/dispatch records forbid replay.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {hash,ordinary,readIdentity} from '../ts-035e3h-runtime-ready-p/files.mjs';
import {openAttributes,observeNamed} from '../ts-035e3h-runtime-ready-p/runtime-support.mjs';
import {validateAliases} from '../ts-035e3h-runtime-ready-p/policy.mjs';
import {actualCandidate,validateCandidate,validateEnvironments} from '../ts-035e3h-runtime-ready-p/proposal-check.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),ready=join(here,'../ts-035e3h-runtime-ready-p'),json=p=>JSON.parse(fs.readFileSync(p)),rj=n=>json(join(ready,n)),save=(n,v)=>fs.writeFileSync(join(here,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const invocation=rj('invocation.proposed.json'),manifest=rj('materialization.proposed.json'),plan=rj('proposal.json'),build=rj('build-plan.json'),policy=rj('alias-policy.json');
save('invocation-started.json',{time:new Date().toISOString(),invocation,manifest,authority:json(join(here,'authorization.json')),maximumNodeAttempts:1});
const report={status:'incomplete',attempts:0,materializations:[],errors:[],command:{executable:invocation.executable,argv:invocation.argv,cwd:invocation.cwd,environment:invocation.environment},started:new Date().toISOString()};let native,out,err;
const observe=()=>{const aliasSnapshot={groups:policy.groups.map(g=>({named:g.named,names:g.names,records:g.names.map(p=>observeNamed(p,native.get))})),utility:observeNamed(policy.utility.path,native.get)};validateAliases(aliasSnapshot,policy);const tools=[build.supervisorIdentity,build.supervisor.powershellRuntimeConfig,build.supervisor.roslynCSharp].map(r=>{const actual=readIdentity(r.path,r,native.get).identity;for(const k of ['dev','ino','nlink','bytes','sha256'])assert.equal(actual[k],r[k]);return actual;});tools.push(readIdentity(build.node.path,{bytes:100097864,sha256:build.node.sha256},native.get,134217728).identity);const inputs=rj('identities.json').map(r=>readIdentity(join(repo,r.path),r,native.get).identity);const sources=manifest.map(r=>readIdentity(join(repo,r.source),r,native.get).identity);return {aliasSnapshot,tools,inputs,sources};};
try{
 validateCandidate(actualCandidate());validateEnvironments(invocation.environment,rj('execution-config.proposed.json').childEnvironment);
 for(const r of json(join(here,'preservation.json')).rows){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
 assert.equal(manifest.length,22);const copies=manifest.filter(r=>r.mode==='exclusive-copy-after-approval');assert.equal(copies.length,2);
 const approved=json(join(here,'authorization.json'));assert.equal(copies.find(r=>r.destination.endsWith('/runner.mjs')).sha256,approved.entrySha256);assert.equal(copies.find(r=>r.destination.endsWith('/controller.mjs')).sha256,approved.controllerSha256);
 native=openAttributes();for(const path of [plan.root,...copies.map(r=>join(repo,r.destination))]){ordinary(dirname(path),true,native.get);let e;try{fs.lstatSync(path);}catch(error){e=error;}assert.equal(e?.code,'ENOENT',path);}
 report.before=observe();const prior=rj('preflight-results.json').after;assert.deepEqual(report.before.aliasSnapshot,prior.aliasSnapshot);assert.deepEqual(report.before.tools,prior.tools);assert.deepEqual(report.before.inputs,prior.inputs);save('preflight-before.json',report.before);
 for(const r of copies){const source=join(repo,r.source),destination=join(repo,r.destination);fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);report.materializations.push({...r,identity:readIdentity(destination,r,native.get).identity});}
 save('materialization.json',report.materializations);assert.deepEqual(observe(),report.before);
 out=fs.openSync(join(here,'runner.stdout.bin'),'wx');err=fs.openSync(join(here,'runner.stderr.bin'),'wx');report.attempts=1;save('dispatch.json',{time:new Date().toISOString(),attempt:1,command:report.command});
 const result=spawnSync(invocation.executable,invocation.argv,{cwd:invocation.cwd,env:invocation.environment,windowsHide:true,stdio:['ignore',out,err]});
 report.pid=result.pid??null;report.exit=result.status;report.signal=result.signal;report.spawnError=result.error?{name:result.error.name,code:result.error.code??null,message:result.error.message}:null;
 report.status=result.status===0&&!result.error&&!result.signal?'runner-exited-zero-stop-review':'failed-stop-review';
 report.after=observe();save('preflight-after.json',report.after);assert.deepEqual(report.after,report.before);
 for(const r of report.materializations)assert.deepEqual(readIdentity(join(repo,r.destination),r,native.get).identity,r.identity);
}catch(e){report.status='failed-stop-review';report.errors.push({name:e.name,code:e.code??null,message:e.message,stack:e.stack});}
finally{
 for(const fd of [out,err])if(fd!==undefined){fs.fsyncSync(fd);fs.closeSync(fd);}try{native?.close();}catch(e){report.status='failed-stop-review';report.errors.push({stage:'metadata-close',message:e.message});}
 report.finished=new Date().toISOString();for(const stream of ['stdout','stderr']){const p=join(here,'runner.'+stream+'.bin');if(fs.existsSync(p)){const b=fs.readFileSync(p);report[stream]={bytes:b.length,sha256:hash(b)};}}
 save('invocation-result.json',report);
}
console.log(JSON.stringify({status:report.status,attempts:report.attempts,materializations:report.materializations.length,exit:report.exit,errors:report.errors}));if(report.status!=='runner-exited-zero-stop-review')process.exitCode=1;
