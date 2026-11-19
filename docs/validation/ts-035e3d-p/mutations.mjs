import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope} from '../../../tools/test262/script-result.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const rows=JSON.parse(readFileSync(here+'reduction.json')).rows.filter(r=>r.expectedAccepted);
const results=[];
for(const row of rows){
 assert.deepEqual(parseScriptDriverResult(Buffer.from(JSON.stringify(row.child)),row.binding),row.child);
 assert.deepEqual(parseScriptEnvelope(JSON.stringify(row.envelope),row.binding),row.envelope);
 for(const key of Object.keys(row.child)){
  const mutant=structuredClone(row.child);delete mutant[key];
  assert.throws(()=>parseScriptDriverResult(Buffer.from(JSON.stringify(mutant)),row.binding),{message:'protocol'});
  results.push({id:row.id,decoder:'child',mutation:'delete/'+key,error:'protocol'});
 }
 for(const key of Object.keys(row.envelope)){
  const mutant=structuredClone(row.envelope);delete mutant[key];
  assert.throws(()=>parseScriptEnvelope(JSON.stringify(mutant),row.binding),{message:'protocol'});
  results.push({id:row.id,decoder:'envelope',mutation:'delete/'+key,error:'protocol'});
 }
 for(const [name,change] of [
  ['unit',x=>x.operation.unitId='u9'],['realm',x=>x.operation.realmId='other'],
  ['role',x=>x.operation.stage=x.operation.stage==='test'?'harness':'test'],
  ['completed-omission',x=>x.completedUnits=[]],['nonce',x=>x.nonce='foreign'],
 ]){
  const mutant=structuredClone(row.child);change(mutant);
  assert.throws(()=>parseScriptDriverResult(Buffer.from(JSON.stringify(mutant)),row.binding),{message:'protocol'});
  results.push({id:row.id,decoder:'child',mutation:name,error:'protocol'});
 }
}
const result={kind:'offline-decoder-mutations-only',baselineRows:rows.length,results};
if(process.argv.includes('--write'))writeFileSync(here+'mutations.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
else assert.deepEqual(result,JSON.parse(readFileSync(here+'mutations.json')));
console.log(JSON.stringify({baselineRows:rows.length,rejections:results.length,engineExecutions:0,passed:true}));
