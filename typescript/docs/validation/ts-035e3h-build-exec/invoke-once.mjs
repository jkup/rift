// Explicit owner-approved single invocation. Exclusive start record forbids replay.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {hash,ordinary,readIdentity} from '../ts-035e3h-build-home-p/files.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),proposal=join(here,'../ts-035e3h-build-home-p');
const json=p=>JSON.parse(fs.readFileSync(p)),save=(name,value)=>fs.writeFileSync(join(here,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const invocation=json(join(proposal,'invocation.proposed.json')),plan=json(join(proposal,'proposal.json')),m=invocation.materialization,c=invocation.command;
save('invocation-started.json',{time:new Date().toISOString(),invocation,authority:json(join(here,'authorization.json')),maximumNodeAttempts:1});
const report={status:'incomplete',attempts:0,materialized:false,errors:[],command:c,started:new Date().toISOString()};let out,err;
try{
 for(const r of json(join(here,'preservation.json')).rows){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
 assert.equal(m.sha256,'bdb01ef2860779eb33d1e137ee249b01b30c7798e74111e87f94f469eb03d651');assert.equal(m.bytes,11616);assert.equal(c.argv.length,1);assert.equal(c.argv[0],m.destination);assert.equal(c.cwd,repo);assert.deepEqual(c.environment,plan.childEnvironment);assert.equal(Object.keys(c.environment).length,16);
 for(const path of [plan.root,m.destination]){let e;try{fs.lstatSync(path);}catch(error){e=error;}assert.equal(e?.code,'ENOENT','required absent '+path);}
 ordinary(proposal,true);const source=readIdentity(m.source,m);report.sourceBefore=source.identity;report.nodeBefore=readIdentity(c.executable,{bytes:100097864,sha256:plan.node.sha256},undefined,134217728).identity;
 fs.copyFileSync(m.source,m.destination,fs.constants.COPYFILE_EXCL);report.materialized=true;report.materializedIdentity=readIdentity(m.destination,m).identity;save('materialization.json',{...m,identity:report.materializedIdentity,exactCopy:true});
 out=fs.openSync(join(here,'runner.stdout.bin'),'wx');err=fs.openSync(join(here,'runner.stderr.bin'),'wx');
 report.attempts=1;save('dispatch.json',{command:c,time:new Date().toISOString(),attempt:1,stdout:'runner.stdout.bin',stderr:'runner.stderr.bin'});
 // The reviewed controller owns its existing timeout/cleanup limits. No alternate command or retry.
 const r=spawnSync(c.executable,c.argv,{cwd:c.cwd,env:c.environment,windowsHide:true,stdio:['ignore',out,err]});
 report.pid=r.pid??null;report.exit=r.status;report.signal=r.signal;report.spawnError=r.error?{name:r.error.name,code:r.error.code??null,message:r.error.message}:null;
 report.status=r.status===0&&!r.error&&!r.signal?'runner-exited-zero-stop-review':'failed-stop-review';
 report.sourceAfter=readIdentity(m.source,m).identity;report.materializedAfter=readIdentity(m.destination,m).identity;report.nodeAfter=readIdentity(c.executable,{bytes:100097864,sha256:plan.node.sha256},undefined,134217728).identity;
 assert.deepEqual(report.sourceAfter,report.sourceBefore);assert.deepEqual(report.materializedAfter,report.materializedIdentity);assert.deepEqual(report.nodeAfter,report.nodeBefore);
}catch(e){report.status='failed-stop-review';report.errors.push({name:e.name,code:e.code??null,message:e.message,stack:e.stack});}
finally{for(const fd of [out,err])if(fd!==undefined){fs.fsyncSync(fd);fs.closeSync(fd);}report.finished=new Date().toISOString();for(const stream of ['stdout','stderr']){const path=join(here,'runner.'+stream+'.bin');if(fs.existsSync(path)){const b=fs.readFileSync(path);report[stream]={bytes:b.length,sha256:hash(b)};}}save('invocation-result.json',report);}
console.log(JSON.stringify({status:report.status,attempts:report.attempts,materialized:report.materialized,exit:report.exit,errors:report.errors}));if(report.status!=='runner-exited-zero-stop-review')process.exitCode=1;
