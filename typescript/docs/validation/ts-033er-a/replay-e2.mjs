import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../../..'), results=[];
try {
 for(const lane of process.argv.slice(2)) for(const input of ['seed','other']) {
  assert.ok(['node','native'].includes(lane));
  const file='fixtures/script-environment/'+input+'.txt';
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/script-environment.exe'),lane==='node'?['build/node/test/script-environment.js',file]:[file],{cwd:root,encoding:'utf8',timeout:30000});
  results.push({lane,input,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
  const expected=['L01','L02','L03','L04','T01','T02','T03','C01','C02','C03','C04'].map(x=>x+' PASS\n').join('')+'INPUT '+input+' '+(input==='seed'?'7':'11')+' PASS\n';
  assert.equal(r.status,0,r.stdout+r.stderr); assert.equal(r.signal,null); assert.equal(r.error,undefined); assert.equal(r.stderr,''); assert.equal(r.stdout,expected);
  console.log(lane+' '+input+': L/T/C literal controls PASS');
 }
} finally {writeFileSync(join(import.meta.dirname,'e2-host-results.json'),JSON.stringify(results,null,2)+'\n');}
