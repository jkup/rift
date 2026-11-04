import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const gate=JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/harness-formatting.ts');assert.ok(gate);
const rows=[];
try{for(const [id,n,p] of [['input-a',7,'seven'],['input-b',11,'eleven']]){
 const file='test/fixtures/harness-formatting/'+id+'.js';assert.deepEqual(readFileSync(file),readFileSync(import.meta.dirname+'/frozen/'+id+'.js'));
 const expected=`PASS host schedules prefixes=400 calls=192 abrupt=464\nPASS parsed prefixes=188 calls=64 abrupt=384\nPASS F01-F12 semantics metadata UTF16 legacy cross-Realm\nPASS actual C Object-link species controls=15\nPASS separate-session reentries=14 finally BOTH original reuse raw denials\nPASS C guard negatives; immutable prototype order remains source-reviewed\nPASS runtime ${id} ${n} ${p}\n`;
 const row={id};for(const lane of ['node','native']){const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-formatting.exe',lane==='node'?['build/node/test/harness-formatting.js',file]:[file],{encoding:'utf8',timeout:60000});row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}rows.push(row);
 assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
}}finally{writeFileSync(import.meta.dirname+'/formatting-results.json',JSON.stringify(rows,null,2)+'\n');}
console.log('PASS formatting two inputs both hosts all literal controls');
