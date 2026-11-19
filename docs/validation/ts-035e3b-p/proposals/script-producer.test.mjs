// Implementation-only test. This design does not run or build these drivers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseScriptProducerArguments,validateScriptProducerRequest} from '../../build/node/src/script-producer-request.js';
const evidence='docs/validation/ts-035e3b-p';
const read=n=>JSON.parse(readFileSync(join(evidence,n)));
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
function launch(row){
 const dir=mkdtempSync(resolve('build','producer-')),result=join(dir,'child.json'),args=row.argv.slice();
 const start=row.request.mode==='conformance'?14:8;
 args[row.request.mode==='conformance'?6:5]=result;
 for(let n=0;n<row.request.units.length;n++){
  const path=join(dir,'u'+n+'.js');args[start+3*n+2]=path;
  if(row.scenario==='late-source-missing'&&n===row.request.units.length-1)continue;
  writeFileSync(path,row.request.units[n].text,{flag:'wx'});
 }
 if(row.scenario==='result-write-failure')mkdirSync(result);
 if(row.scenario==='result-exists')writeFileSync(result,'original',{flag:'wx'});
 const node=row.lane==='node',entry=resolve(node?'build/node/src/script-observation-driver.js':'build/native/script-observation-driver.exe');
 const p=spawnSync(node?process.execPath:entry,node?[entry,...args]:args,{encoding:'utf8',timeout:10000,windowsHide:true,maxBuffer:1048576});
 assert.equal(p.error,undefined);assert.equal(p.signal,null);
 return {p,result,dir};
}
test('complete literal children in both hosts, observation unchanged',()=>{
 for(const row of read('future-wire-literals.json')){
  const {p,result}=launch(row);assert.equal(p.status,0,row.id);assert.equal(p.stdout,'',row.id);assert.equal(p.stderr,'',row.id);
  assert.deepEqual(JSON.parse(readFileSync(result)),row.expected,row.id);
 }
});
test('pure parser errors separately from generic driver rejection with checked sources',()=>{
 for(const row of read('argv-negatives.json'))assert.throws(()=>parseScriptProducerArguments(row.argv),{message:row.error});
 for(const lane of ['node','native'])for(const row of read('correction/driver-negative-cases.json')){
  const {args,result}=setupNegative(row,mkdtempSync(resolve('build','producer-negative-')));
  const node=lane==='node',entry=resolve(node?'build/node/src/script-observation-driver.js':'build/native/script-observation-driver.exe');
  const p=spawnSync(node?process.execPath:entry,node?[entry,...args]:args,{encoding:'utf8',timeout:10000,windowsHide:true});
  // Generic70 cannot prove zero reads/Realm creation or exact error priority:
  // producer validation could still reject after IO. Pure parser checks above
  // and source inspection provide different evidence; no production seam.
  assert.equal(p.error,undefined);assert.equal(p.signal,null);assert.equal(p.status,row.expectedDriver.exitCode,row.id);assert.equal(p.stdout,row.expectedDriver.stdout);assert.equal(p.stderr.replaceAll('\r\n','\n'),row.expectedDriver.stderr);assert.equal(existsSync(result),row.expectedDriver.childPresent);
 }
 const positives=read('future-producer-literals.json').filter(r=>r.request.mode==='conformance');
 for(const row of positives)validateScriptProducerRequest(row.request);
});
test('late source/transform/output failure remains driver fault without child',()=>{
 for(const row of read('future-late-failures.json')){
  const {p,result}=launch(row);assert.equal(p.status,row.expected.exitCode,row.id);assert.equal(p.stdout,row.expected.stdout,row.id);assert.equal(p.stderr.replaceAll('\r\n','\n'),row.expected.stderr,row.id);
  if(row.scenario==='result-exists')assert.equal(readFileSync(result,'utf8'),'original');
  else if(row.scenario!=='result-write-failure')assert.equal(existsSync(result),false,row.id);
 }
});
