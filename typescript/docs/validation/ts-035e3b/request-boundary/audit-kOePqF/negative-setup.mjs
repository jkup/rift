import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
// BEGIN offline-audited negative setup (no producer or process invocation).
function assertNegativeSetup(row,setup){
 const tokens=[...new Set(row.argv.filter(a=>a.startsWith('SOURCE-')||a.startsWith('MISSING-')))];
 assert.deepEqual(row.files.map(f=>f.token),tokens);
 const missing=row.files.filter(f=>!f.present);
 if(row.setupClass==='explicit-missing-compound'){
  assert.equal(row.id,'late-role-before-read');assert.deepEqual(missing.map(f=>f.token),['MISSING-u0','MISSING-u1']);
 }else{
  assert(['ordinary-controls','malformed-layout'].includes(row.setupClass));assert.equal(missing.length,0);
  assert(tokens.every(t=>t.startsWith('SOURCE-')));
 }
 for(const f of row.files){
  const path=join(setup.dir,f.token);
  if(f.present){assert.equal(f.text,'"use strict";\n0;');assert.equal(readFileSync(path,'utf8'),f.text);}
  else{assert.equal(f.text,null);assert.equal(existsSync(path),false);}
 }
 assert.deepEqual(setup.args,row.argv.map(a=>a==='RESULT'?setup.result:tokens.includes(a)?join(setup.dir,a):a));
 assert.equal(existsSync(setup.result),false);
}
function setupNegative(row,dir){
 const result=join(dir,'child.json');
 for(const f of row.files)if(f.present)writeFileSync(join(dir,f.token),f.text,{flag:'wx'});
 const setup={dir,result,args:row.argv.map(a=>a==='RESULT'?result:row.files.some(f=>f.token===a)?join(dir,a):a)};
 assertNegativeSetup(row,setup);return setup;
}
// END offline-audited negative setup.
export {setupNegative};
