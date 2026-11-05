import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const here=import.meta.dirname,gate=JSON.parse(readFileSync(here+'/gate.json')),rows=[];
try {
 for(const [input,payload] of [['alpha',7],['beta',11]]) {
  const path='test/fixtures/script-throw-inspection/'+input+'.js',row={input};
  for(const lane of ['node','native']) {
   const r=spawnSync(lane==='node'?process.execPath:'build/native/script-throw-inspection.exe',lane==='node'?['build/node/test/script-throw-inspection.js',path]:[path],{encoding:'utf8',timeout:60000});
   row[lane]={status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};
  }
  rows.push(row);assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));
  for(const lane of ['node','native']) {assert.equal(row[lane].stderr,'');assert.equal(row[lane].stdout,`PASS X01-X06 U01-U02 input=${payload} prefixes=10 calls=6 guest=3 faults=10\n`);}
 }
} finally {writeFileSync(here+'/inspection-results.json',JSON.stringify(rows,null,2)+'\n');}
console.log('PASS both runtime inputs, both hosts, literal X/U controls');
