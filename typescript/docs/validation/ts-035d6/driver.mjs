import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const here='docs/validation/ts-035d6', proposal='docs/validation/ts-035d6-p';
export const read=name=>JSON.parse(readFileSync(proposal+'/'+name));
export const results=[];
mkdirSync('build/ts035d6-inputs',{recursive:true});
export function input(text){for(const name of ['alpha','beta']){const runtime='fixtures/script-assignment-target-dispatch/'+name+'.js';if(readFileSync(runtime,'utf8')===text)return runtime;}const path='build/ts035d6-inputs/'+createHash('sha256').update(text).digest('hex')+'.js';writeFileSync(path,text);return path;}
export function run(lane,args,label){const r=spawnSync(lane==='node'?process.execPath:'build/native/script-assignment-target-dispatch.exe',lane==='node'?['build/node/test/script-assignment-target-dispatch.js',...args]:args,{encoding:'utf8',timeout:60000,maxBuffer:32*1024*1024});const record={lane,label,args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr};results.push(record);if(r.status!==0||r.signal||r.error)writeFileSync(here+'/driver-failure.json',JSON.stringify(record,null,2));assert.equal(r.status,0,label+': '+r.stderr);assert.equal(r.signal,null);assert.equal(r.error,undefined);return r.stdout.trim();}
export function observe(lane,request,mode='script-observation',diagnostic='plain',rule='none'){
 const args=[input(request.units[0].text),request.nonce,'observe',request.action,request.requestSha256,request.preflightId??'null',String(request.steps),String(request.calls),mode,diagnostic,rule];
 for(const u of request.units)args.push(u.id,u.role,input(u.text));return run(lane,args,request.nonce);
}
export function prepare(lane,unit,profile='script'){return JSON.parse(run(lane,[input(unit.text),unit.id,'prepare',profile],unit.id));}
