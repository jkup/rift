import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const labels=['runtime source','M01','M02','M03-M04','M05','M06','M07-M09','M10','M11','M12','M13','M14','M15','R01-R07 R16 R17','R09','R10','R13','R08 R12','R11 R14 R15 R16 setter','D01-D06','negative neighbors','N01-N16 strict entry and directives','190 fresh/seven-seeded prefixes','X01 X03 nested sessions and host faults','X02 X07 exact abrupt and consumed history','X04 X06 cross-mode reference reentry','X08 exact call budgets and cleanup','X05 guards and private completed body environment','late global effects failed FDI and rejection precedence','X06 exact abrupt provenance through key get set','local identifier deletion','numeric abrupt and fresh var descriptors','frozen reference literals and strict twins'];
const expected=labels.map(s=>'PASS '+s+'\n').join('');
const gate=JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/harness-nonstrict.ts');assert.ok(gate);
const results=[];
try{for(const input of ['seven','eleven']){
 const file='fixtures/harness-nonstrict/input-'+input+'.js';assert.deepEqual(readFileSync(file),readFileSync(import.meta.dirname+'/../ts-034h4/input-'+input+'.js'));
 const row={input,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
 for(const lane of ['node','native']){const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-nonstrict.exe',lane==='node'?['build/node/test/harness-nonstrict.js',file]:[file],{encoding:'utf8',timeout:60000});row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
 results.push(row);assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
}}finally{writeFileSync(import.meta.dirname+'/nonstrict-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS H4 all controls/190 prefixes on Node and native with two frozen runtime inputs');
