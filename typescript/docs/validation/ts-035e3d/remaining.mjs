import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,openSync,writeSync,closeSync,copyFileSync,readdirSync,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const here=import.meta.dirname,{sandbox,gates:expectedGates}=JSON.parse(readFileSync(join(here,'run-location.json'))),results=[];
async function run(name,args,timeout=3600000){
 console.log('START '+name+' '+new Date().toISOString());
 writeFileSync(join(here,'remaining-active-stage.json'),JSON.stringify({name,args,started:new Date().toISOString()},null,2)+'\n');
 const fd=openSync(join(here,name+'.txt'),'wx'),started=Date.now();
 const p=spawn(process.execPath,args,{cwd:sandbox,stdio:['ignore','pipe','pipe'],windowsHide:true});let error=null;
 for(const pipe of [p.stdout,p.stderr])pipe.on('data',chunk=>{writeSync(fd,chunk);if(name==='native-build')process.stdout.write(chunk);});
 p.on('error',e=>{error={code:e.code,message:e.message};});
 const timer=setTimeout(()=>{error={code:'TIMEOUT',message:'stage deadline'};p.kill();},timeout);
 const [status,signal]=await new Promise(done=>p.on('close',(status,signal)=>done([status,signal])));clearTimeout(timer);closeSync(fd);
 const row={name,args,status,signal,error,elapsedMs:Date.now()-started};results.push(row);
 writeFileSync(join(here,'remaining-stages.json'),JSON.stringify(results,null,2)+'\n');writeFileSync(join(here,'active-stage.json'),JSON.stringify({...row,finished:true},null,2)+'\n');
 console.log('END '+name+' '+status+' '+row.elapsedMs+'ms');assert.equal(status,0,name);assert.equal(signal,null);assert.equal(error,null);
}
await run('E3c-mutations-retry',[join(here,'mutations-retry.mjs')]);
await run('policy',[join(here,'policy.mjs')]);
await run('dispatch-reduction',[join(here,'dispatch-probe.mjs')]);
await run('driver-reduction',[join(here,'driver-probe.mjs')]);
