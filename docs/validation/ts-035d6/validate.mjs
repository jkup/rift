import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {here,proposal,read,run,prepare,observe,results} from './driver.mjs';
const actualChildren=new Map();
const matrix=read('semantic-matrix.json'),controls=read('future-controls.json');
const counts={sources:matrix.rows.length,contexts:matrix.rows.reduce((n,r)=>n+r.contexts.length,0),wire:read('wire-matrix.json').rows.length,mutations:controls.oracleMutations.length,profiles:controls.profileRows.length,prefix:controls.prefixRows.length,history:controls.noEffects.length,metadata:controls.metadataRows.length,budgets:controls.budgetRows.length,ready:controls.readyRows.length};
assert.deepEqual(counts,{sources:102,contexts:366,wire:256,mutations:512,profiles:8,prefix:24,history:12,metadata:36,budgets:72,ready:2});
writeFileSync(here+'/frozen-inputs.json',JSON.stringify({counts,files:['semantic-matrix.json','wire-matrix.json','future-controls.json','inputs/alpha.js','inputs/beta.js'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(proposal+'/'+path)).digest('hex')}))},null,2));
try{
for(const lane of process.argv.includes('--node')?['node']:['node','native']){
 for(const row of matrix.rows){assert.deepEqual(prepare(lane,row.futurePreparation.unit),row.futurePreparation,row.id);for(const c of row.contexts){const bytes=observe(lane,c.request);assert.deepEqual(JSON.parse(bytes),c.expected,row.id);assert.equal(bytes,c.ascii,row.id+' ASCII');actualChildren.set(JSON.stringify(c.expected),JSON.parse(bytes));}}
 for(const row of controls.profileRows)assert.deepEqual(prepare(lane,{id:'profile',text:row.text},row.profile),row.expected);
 for(const row of controls.noEffects)assert.deepEqual(prepare(lane,row.expectedPreparation.unit),row.expectedPreparation);
 for(const row of controls.metadataRows)assert.deepEqual(prepare(lane,row.unit),row.expected);
 for(const row of [...controls.prefixRows,...controls.budgetRows,...controls.readyRows])assert.deepEqual(JSON.parse(observe(lane,row.request)),row.expected);
 for(const order of [['alpha','beta'],['beta','alpha']]){const args=[...order.map(n=>'fixtures/script-assignment-target-dispatch/'+n+'.js')];const actual=JSON.parse(run(lane,[args[0],'controls','controls',args[1]],'identity-controls/'+order.join('/')));assert.deepEqual(actual,{checks:864,runtimeInputs:2,effectSources:3,orders:2,seededHistories:2,realms:2,profiles:3,sameId:6,ready:2});}
}
for(const row of controls.oracleMutations){const actual=actualChildren.get(JSON.stringify(row.expected));assert.ok(actual,row.id);assert.deepEqual(actual,row.expected);assert.notDeepEqual(row.wrong,actual,row.id);}
console.log(JSON.stringify({counts,runs:results.length}));
}finally{writeFileSync(here+'/source-results'+(process.argv.includes('--node')?'-node':'')+'.json',JSON.stringify(results,null,2)+'\n');}
