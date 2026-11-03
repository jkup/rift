import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../../..'), results=[];
const expected=[...Array.from({length:16},(_,i)=>'G'+String(i+1).padStart(2,'0')),'FAULTS','CURRENT','BOUNDARY','LARGE'].map(x=>x+' PASS\n').join('');
try {
 for(const lane of process.argv.slice(2)) for(const input of ['seed','other']) {
  assert.ok(['node','native'].includes(lane));
  const file='fixtures/script-global-declarations/'+input+'.txt';
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/script-global-declarations.exe'),lane==='node'?['build/node/test/script-global-declarations.js',file]:[file],{cwd:root,encoding:'utf8',timeout:30000});
  results.push({lane,input,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
  assert.equal(r.status,0); assert.equal(r.signal,null); assert.equal(r.error,undefined); assert.equal(r.stderr,''); assert.equal(r.stdout,expected);
  console.log(lane+' '+input+': G01-G16 and fault/current/boundary/large controls PASS');
 }
} finally {writeFileSync(join(import.meta.dirname,'d2-host-results.json'),JSON.stringify(results,null,2)+'\n');}
