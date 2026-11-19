import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const expected=Array.from({length:9},(_,i)=>`PASS A0${i+1}\n`).join(''),results=[];
const freeze=JSON.parse(readFileSync(import.meta.dirname+'/freeze.json'));
for(const [name,hash] of Object.entries(freeze.files))assert.equal(createHash('sha256').update(readFileSync(import.meta.dirname+'/'+name)).digest('hex'),hash);
const gate=JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/harness-errors-a.ts');assert.ok(gate);
try{for(const input of ['seven','eleven']){
 const file='fixtures/harness-errors-a/input-'+input+'.js';assert.deepEqual(readFileSync(file),readFileSync(import.meta.dirname+'/input-'+input+'.js'));
 const row={input,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
 for(const lane of ['node','native']){
  const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-errors-a.exe',lane==='node'?['build/node/test/harness-errors-a.js',file]:[file],{encoding:'utf8',timeout:60000});
  row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};
 }
 results.push(row);assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));
 for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
}}finally{writeFileSync(import.meta.dirname+'/kernel-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS A01-A09 both frozen runtime sources on Node/native');
