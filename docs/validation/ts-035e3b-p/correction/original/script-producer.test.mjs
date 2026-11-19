// Implementation-only test. This design does not run or build these drivers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseScriptProducerArguments,validateScriptProducerRequest} from '../../build/node/src/script-producer-request.js';
const evidence='docs/validation/ts-035e3b-p';
const read=n=>JSON.parse(readFileSync(join(evidence,n)));
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
test('all argv controls before source IO, exact pure parser priority',()=>{
 for(const row of read('argv-negatives.json'))assert.throws(()=>parseScriptProducerArguments(row.argv),{message:row.error});
 for(const lane of ['node','native'])for(const row of read('argv-negatives.json')){
  const dir=mkdtempSync(resolve('build','producer-negative-')),result=join(dir,'child.json');
  const args=row.argv.map(a=>a==='RESULT'?result:a.startsWith('SOURCE-')||a.startsWith('MISSING-')?join(dir,a):a);
  const node=lane==='node',entry=resolve(node?'build/node/src/script-observation-driver.js':'build/native/script-observation-driver.exe');
  const p=spawnSync(node?process.execPath:entry,node?[entry,...args]:args,{encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(p.error,undefined);assert.equal(p.signal,null);assert.equal(p.status,70,row.id);assert.equal(p.stdout,'');assert.equal(p.stderr.replaceAll('\r\n','\n'),'Script observation driver fault\n');assert.equal(existsSync(result),false);
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
