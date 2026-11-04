import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const gate=JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/harness-for-update.ts');assert.ok(gate);
const labels=['runtime source',...Array.from({length:20},(_,i)=>'F'+String(i+1).padStart(2,'0')).flatMap(x=>x==='F12'?[x,x]:[x]),'H2-N08-positive','N01-N14 frozen negatives','190 fresh/seven-seeded prefixes','U01-U16 numeric/reference/coercion controls','X01 four origins at ten stages, caught and uncaught','X02 caught A then reused B throw same/cross Realm','X03 nested B host fault restores active A and permits','X04 recursion getter false steps 169','X04 recursion getter true steps 329','X04 recursion number false steps 202','X04 recursion number true steps 394','X04 same-session cross-Realm getter/numeric reentry','X05 legacy guards, source associations, closure retention, resource and grammar boundaries'];
const expected=labels.map(s=>'PASS '+s+'\n').join(''),results=[];
try{for(const input of ['seven','eleven']){
 const file='fixtures/harness-for-update/input-'+input+'.js';assert.deepEqual(readFileSync(file),readFileSync(import.meta.dirname+'/../ts-034h3/input-'+input+'.js'));
 const row={input,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
 for(const lane of ['node','native']){const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-for-update.exe',lane==='node'?['build/node/test/harness-for-update.js',file]:[file],{encoding:'utf8',timeout:60000});row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
 results.push(row);assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
}}finally{writeFileSync(import.meta.dirname+'/for-update-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS H3 all controls/190 prefixes on Node and native with two frozen runtime inputs');
