import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const gate=JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/harness-map-default.ts');assert.ok(gate);
const results=[];
try{for(const id of ['input-a','input-b']){
 const file='test/fixtures/harness-map-default/'+id+'.js';assert.deepEqual(readFileSync(file),readFileSync(import.meta.dirname+'/frozen/'+id+'.js'));
 const expected=`PASS frozen prefixes=308 calls=224 ${id}\nPASS semantic selection=108\nPASS abrupt prefixes=480\nPASS parsed getters=200\nPASS separate-session reentry=48\nPASS lengths mutations profiles inventories; X06 unrepresentable\nPASS exhaustive primitive controls=56 length coercion\nPASS Object-link and foreign Script constructor controls=28\nPASS all-trace abrupt prefixes=2340\nPASS length-getter and empty-array abrupt selection\n`;
 const row={id,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
 for(const lane of ['node','native']){const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-map-default.exe',lane==='node'?['build/node/test/harness-map-default.js',file]:[file],{encoding:'utf8',timeout:60000});row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
 results.push(row);assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
}}finally{writeFileSync(import.meta.dirname+'/map-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS H6-M both literal inputs/Node/native; real foreign intrinsic Array unrepresentable');
