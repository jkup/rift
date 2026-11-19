import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const here='docs/validation/ts-035d4',rows=JSON.parse(readFileSync('docs/validation/ts-035d4-p/semantic-matrix.json')).rows;
assert.equal(rows.length,193);mkdirSync('build/ts035d4-inputs',{recursive:true});
const results=[];
for(const lane of process.argv.includes('--node')?['node']:['node','native'])for(const order of [['alpha','beta'],['beta','alpha']])for(const row of rows){
 const path='build/ts035d4-inputs/'+row.id.replaceAll('/','-')+'.js';writeFileSync(path,row.text);
 const id=row.futurePreparation.unit.id,args=[path,id,...order.map(n=>'fixtures/script-strict-parameter-dispatch/'+n+'.js')];
 const r=spawnSync(lane==='node'?process.execPath:'build/native/script-strict-parameter-dispatch.exe',lane==='node'?['build/node/test/script-strict-parameter-dispatch.js',...args]:args,{encoding:'utf8',timeout:60000,maxBuffer:32*1024*1024});
 results.push({lane,order,id:row.id,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
 if(r.status!==0)writeFileSync(here+'/matrix-failure.json',JSON.stringify(results.at(-1),null,2));
 assert.equal(r.status,0,row.id+': '+r.stderr);assert.equal(r.signal,null);
 const actual=JSON.parse(r.stdout),{D2,...ordinary}=row.current;
 assert.deepEqual(actual.preparation,row.futurePreparation,row.id+' preparation');assert.deepEqual(actual.ordinary,ordinary,row.id+' ordinary');
 for(const [i,expected] of row.contexts.entries())for(const key of ['operation','source','testBodyEvaluated','inspection','completedUnits','result'])assert.deepEqual(actual.contexts[i][key],expected[key],row.id+'/'+expected.action+'/'+expected.role+'/'+key);
}
writeFileSync(here+'/matrix-results'+(process.argv.includes('--node')?'-node':'')+'.json',JSON.stringify(results,null,2)+'\n');
console.log('PASS '+results.length+' runtime source runs; 193 literals, both input orders, four contexts, two Realms and unchanged ordinary/node controls');
