import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const labels=['runtime source','C01','C04','C06','C15','C17','C01','C04','C06','C15','C17','C02 C03 C05 C16 C18 strict twins','C07-C11','C12-C14','I01-I10 I12','I11 grammar','I11 D01-D05','N01-N16 original negative migrations','172 fresh/seven-seeded prefixes','A01-A04 A07-A10 guest/host/catch identity','A05 A06 A11 resources and guest getter provenance','X01 X02 X11 source and consumed history','X03 nested normal/guest/host cleanup','X04 X05 reentry and captured idle context','X06 X07 X08 permits slots and profiles','X09 default64 recursion and resource catch bypass','X12 ordinary call from prototype getter','X10 limits and legacy boundaries','publication descriptors defining Realm and strict entry','grammar chains','retained function source','NoIn instanceof','grammar chains','retained function source','NoIn instanceof','constructor grammar and original source associations','new keyword versus string literal grammar','callee arguments prototype allocation body order'];
const expected=labels.map(s=>'PASS '+s+'\n').join(''),results=[];
const gate=JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/harness-construct.ts');assert.ok(gate);
try{for(const input of ['seven','eleven']){
 const file='fixtures/harness-construct/input-'+input+'.js';assert.deepEqual(readFileSync(file),readFileSync(import.meta.dirname+'/input-'+input+'.js'));
 const row={input,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
 for(const lane of ['node','native']){const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-construct.exe',lane==='node'?['build/node/test/harness-construct.js',file]:[file],{encoding:'utf8',timeout:60000});row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
 results.push(row);assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
}}finally{writeFileSync(import.meta.dirname+'/construct-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS H5 controls/172 prefixes on Node/native with two frozen runtime inputs');
