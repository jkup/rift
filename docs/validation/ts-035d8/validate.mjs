import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {here,proposal,read,run,prepare,observe,results} from './driver.mjs';
const actualChildren=new Map();
const matrix=read('semantic-matrix.json'),controls=read('future-controls.json');
// Coordinator-approved correction: nine frozen ready metadata rows used a matrix
// ID rather than their literal request ID. All other fields and rows stay frozen.
const metadataRows=structuredClone(controls.metadataRows),amendments=[];
for(const row of metadataRows)if(row.expected.kind==='complete'){
 assert.equal(row.unit.id,'same');assert.equal(row.unit.text,'let x; x=7; x;');
 assert.equal(row.expected.unit.id,'valid-ready');assert.equal(row.expected.unit.text,row.unit.text);
 const original=structuredClone(row.expected);row.expected.unit.id='same';
 assert.deepEqual(row.expected,{...original,unit:{...original.unit,id:'same'}});
 amendments.push({variant:row.variant,negative:row.negative,request:row.unit,original,amended:row.expected});
}
assert.equal(amendments.length,9);assert.equal(metadataRows.filter(r=>r.expected.kind!=='complete').length,27);
for(let i=0;i<metadataRows.length;i++)if(metadataRows[i].expected.kind!=='complete')assert.deepEqual(metadataRows[i],controls.metadataRows[i]);
writeFileSync(here+'/metadata-amendment.json',JSON.stringify({approval:'Coordinator 2026-11-05; new D8 tests only; frozen D8-P bytes preserved',rows:amendments},null,2)+'\n');
const counts={sources:matrix.rows.length,contexts:matrix.rows.reduce((n,r)=>n+r.contexts.length,0),wire:read('wire-matrix.json').rows.length,mutations:controls.oracleMutations.length,profiles:controls.profileRows.length,prefix:controls.prefixRows.length,history:controls.historyRows.length,metadata:controls.metadataRows.length,budgets:controls.budgetRows.length,ready:controls.readyRows.length};
assert.deepEqual(counts,{sources:140,contexts:527,wire:320,mutations:880,profiles:12,prefix:24,history:36,metadata:36,budgets:72,ready:2});
writeFileSync(here+'/frozen-inputs.json',JSON.stringify({counts,files:['semantic-matrix.json','wire-matrix.json','future-controls.json','inputs/alpha.js','inputs/beta.js'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(proposal+'/'+path)).digest('hex')}))},null,2));
try{
for(const lane of process.argv.includes('--node')?['node']:['node','native']){
 for(const row of matrix.rows){assert.deepEqual(prepare(lane,row.futurePreparation.unit),row.futurePreparation,row.id);for(const c of row.contexts){const bytes=observe(lane,c.request);assert.deepEqual(JSON.parse(bytes),c.expected,row.id);assert.equal(bytes,c.ascii,row.id+' ASCII');actualChildren.set(JSON.stringify(c.expected),JSON.parse(bytes));}}
 for(const row of controls.profileRows)assert.deepEqual(prepare(lane,{id:'profile',text:row.text},row.profile),row.expected);
 for(const row of controls.historyRows)assert.deepEqual(prepare(lane,row.expected.unit),row.expected);
 for(const [i,row] of metadataRows.entries()){const actual=prepare(lane,row.unit);assert.deepEqual(actual,row.expected);if(row.expected.kind==='complete')assert.notDeepEqual(actual,controls.metadataRows[i].expected,'old wrong-ID oracle must fail');}
 for(const row of [...controls.prefixRows,...controls.budgetRows,...controls.readyRows])assert.deepEqual(JSON.parse(observe(lane,row.request)),row.expected);
 let malformed=0;for(const row of controls.prefixRows)for(let i=0;i<row.request.units.length;i++)for(const wrong of ['bad','u99',i?'u0':'u1']){const request=structuredClone(row.request);request.units[i].id=wrong;assert.equal(observe(lane,request,'script-observation','plain','none','invalid'),'invalid occurrence rejected');malformed++;}assert.equal(malformed,180);
 for(const order of [['alpha','beta'],['beta','alpha']]){const args=[...order.map(n=>'test/fixtures/script-lexical-statement-dispatch/'+n+'.js')];const actual=JSON.parse(run(lane,[args[0],'controls','controls',args[1]],'identity-controls/'+order.join('/')));const histories=actual.histories.map(JSON.parse);delete actual.histories;assert.equal(histories.length,72);for(const history of histories){const id=order[0]==='alpha'?history.id:history.id==='R0'?'R1':history.id==='R1'?'R0':history.id;const expected=controls.historyRows.find(r=>r.id===id&&r.realmId===history.realmId&&r.seeded===history.seeded&&r.prefixCount===history.prefixCount);assert.ok(expected);for(const key of ['before','after','savedCompletion'])assert.deepEqual(history[key],expected[key],id+'/'+key);}assert.deepEqual(actual,{checks:864,runtimeInputs:2,effectSources:3,orders:2,seededHistories:2,realms:2,profiles:3,sameId:6,ready:2});}
}
for(const row of controls.oracleMutations){const actual=actualChildren.get(JSON.stringify(row.expected));assert.ok(actual,row.id);assert.deepEqual(actual,row.expected);assert.notDeepEqual(row.wrong,actual,row.id);}
console.log(JSON.stringify({counts,runs:results.length}));
}finally{writeFileSync(here+'/source-results'+(process.argv.includes('--node')?'-node':'')+'.json',JSON.stringify(results,null,2)+'\n');}
