import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../../../..');
const scratch=join(root,'build/ts033d1-input');mkdirSync(scratch,{recursive:true});
const fixture=readFileSync(join(root,'fixtures/script-realm-bootstrap/rows.txt'),'utf8');
const expected=Array.from({length:18},(_,i)=>`B${String(i+1).padStart(2,'0')} PASS\n`).join('');
const results=[];
for(const lane of process.argv.slice(2)){
 assert.ok(['node','native'].includes(lane));
 for(const [id,text] of [['literal',fixture],['other',fixture.replaceAll('|seed|7','|other|11')]]){
  const file=join(scratch,id+'.txt');writeFileSync(file,text);
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/script-realm-bootstrap.exe'),lane==='node'?['build/node/test/script-realm-bootstrap.js',file]:[file],{cwd:root,encoding:'utf8',timeout:30000});
  results.push({lane,id,input:text,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
  writeFileSync(join(import.meta.dirname,'bootstrap-rows.json'),JSON.stringify(results,null,2)+'\n');
  assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,undefined);assert.equal(r.stderr,'');assert.equal(r.stdout,expected);
 }
 console.log(lane+': B01-B18 pass for two post-compilation inputs');
}
