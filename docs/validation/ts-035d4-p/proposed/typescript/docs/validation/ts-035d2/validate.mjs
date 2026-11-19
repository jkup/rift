import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const here='docs/validation/ts-035d2', frozen=JSON.parse(readFileSync('docs/validation/ts-035d2-p/semantic-matrix.json'));
const d4=JSON.parse(readFileSync('docs/validation/ts-035d4-p/inherited-expectations.json')).D2;
mkdirSync('build/ts035d2-inputs',{recursive:true});
const results=[];
for(const lane of process.argv.includes('--node')?['node']:['node','native'])for(const input of ['alpha','beta'])for(const row of frozen.rows){
 const path='build/ts035d2-inputs/'+row.id+'.js';writeFileSync(path,row.text);
 const r=spawnSync(lane==='node'?process.execPath:'build/native/script-strict-rule-dispatch.exe',lane==='node'?['build/node/test/script-strict-rule-dispatch.js',path,row.id,'fixtures/script-strict-rule-dispatch/'+input+'.js']:[path,row.id,'fixtures/script-strict-rule-dispatch/'+input+'.js'],{encoding:'utf8',timeout:60000,maxBuffer:32*1024*1024});
 results.push({lane,input,id:row.id,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
 writeFileSync(here+'/matrix-results'+(process.argv.includes('--node')?'-node':'')+'.json',JSON.stringify(results,null,2)+'\n');
 assert.equal(r.status,0,row.id+': '+r.stderr);assert.equal(r.signal,null);
 const actual=JSON.parse(r.stdout);
 const migration=d4[row.id]; if(migration)assert.equal(row.text,migration.text,row.id+' exact D4 source');
 assert.deepEqual(actual.preparation,migration?migration.preparation:row.futurePreparation,row.id+' preparation');
 assert.deepEqual(actual.ordinary,row.ordinary,row.id+' ordinary');assert.deepEqual(actual.audit,row.audit,row.id+' audit');
 for(const [i,expected] of (migration?migration.contexts:row.contexts).entries()){
  const context=actual.contexts[i];for(const key of ['operation','source','testBodyEvaluated','inspection','completedUnits','result'])assert.deepEqual(context[key],expected[key],row.id+'/'+expected.action+'/'+expected.role+'/'+key);
 }
}
console.log('PASS '+results.length+' runtime-read source runs, four contexts and two Realms each');
