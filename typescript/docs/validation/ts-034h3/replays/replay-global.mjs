import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../../../..');
const scratch=join(root,'build/ts033d1-global-input');mkdirSync(scratch,{recursive:true});
const expected=Array.from({length:15},(_,i)=>`H${String(i+1).padStart(2,'0')} PASS\n`).join('');
const fixture=readFileSync(join(root,'test/fixtures/global-environment.txt'),'utf8');
const results=[];
for(const lane of process.argv.slice(2)){
 assert.ok(['node','native'].includes(lane));
 // A second runtime file renames every tested binding after compilation.
 for(const [id,text] of [['literal',fixture],['renamed',fixture.split('\n').map(l=>l?l.replace(/\|([^|]+)\|/,'|runtime_$1|'):l).join('\n')]]){
  const file=join(scratch,id+'.txt');writeFileSync(file,text);
  const args=lane==='node'?['build/node/test/global-environment.js',file]:[file];
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/global-environment.exe'),args,{cwd:root,encoding:'utf8',timeout:10000});
  results.push({lane,id,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
  writeFileSync(join(import.meta.dirname,'host-rows.json'),JSON.stringify(results,null,2)+'\n');
  assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,undefined);assert.equal(r.stderr,'');assert.equal(r.stdout,expected);
 }
 console.log(lane+': 15 named host rows pass for literal and renamed runtime inputs');
}
