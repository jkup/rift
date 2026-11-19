import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {candidates,scopeRows,conflictRows} from './expected.mjs';
const here='docs/validation/ts-035d1';
const frozen=JSON.parse(readFileSync(here+'/frozen.json'));
assert.equal(frozen.rows.length,62);
mkdirSync('build/ts035d1-inputs',{recursive:true});
const results=[];
for(const lane of process.argv.includes('--node')?['node']:['node','native'])for(const row of frozen.rows){
 const path=row.id==='R0'?'test/fixtures/script-strict-rule-audit/a.js':row.id==='R1'?'test/fixtures/script-strict-rule-audit/b.js':'build/ts035d1-inputs/'+row.id+'.js';
 if(!row.id.startsWith('R'))writeFileSync(path,row.text);
 assert.equal(readFileSync(path,'utf8'),row.text);
 const run=spawnSync(lane==='node'?process.execPath:'build/native/script-strict-rule-audit.exe',lane==='node'?['build/node/test/script-strict-rule-audit.js',path,row.id]:[path,row.id],{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});
 results.push({lane,id:row.id,status:run.status,signal:run.signal,error:run.error?.message??null,stdout:run.stdout,stderr:run.stderr});
 writeFileSync(here+'/matrix-results'+(process.argv.includes('--node')?'-node':'')+'.json',JSON.stringify(results,null,2)+'\n');
 assert.equal(run.status,0,row.id+': '+run.stderr);assert.equal(run.signal,null);
 const result=JSON.parse(run.stdout),audit=result.audit;
 assert.deepEqual(result.ordinary,row.ordinary,'ordinary '+row.id);
 assert.equal(JSON.stringify(result.ordinary),JSON.stringify(row.ordinary),'ordinary serialization '+row.id);
 assert.equal(audit.kind,row.expectedKind,row.id);
 if(audit.kind==='eligible')assert.deepEqual(audit,{kind:'eligible',sourceUnits:row.text.length,consumedUnits:row.text.length,candidates:candidates[row.id]},row.id);
 else if(audit.kind==='none')assert.deepEqual(audit,{kind:'none',sourceUnits:row.text.length,consumedUnits:row.text.length});
 else{
  const reason=scopeRows.includes(row.id)?'scope-restriction':conflictRows.includes(row.id)?'other-conflict':'grammar-or-resource';
  assert.equal(audit.reason,reason,row.id);
  if(reason==='other-conflict'){
   assert.equal(audit.rejection,null);
   if(row.id==='B16'||row.id==='B21')assert.deepEqual(audit.diagnostic,{phase:'parse',name:'SyntaxError',message:'duplicate-lexical: '+(row.id==='B16'?'x':'f'),loc:{line:1,column:row.id==='B16'?59:50}});
   else assert.deepEqual(audit.diagnostic,row.ordinary.bounded.diagnostic);
  }
  else if(row.id==='B15'){
   assert.deepEqual(audit.rejection,{kind:'unsupported-syntax',capabilityCode:'parse.declaration-statement'});
   assert.deepEqual(audit.diagnostic,{phase:'parse',name:'SyntaxError',message:'unsupported catch binding conflict or non-strict catch',loc:{line:1,column:60}});
  }
  else{assert.deepEqual(audit.rejection,row.ordinary.bounded.rejection,row.id);assert.deepEqual(audit.diagnostic,row.ordinary.bounded.diagnostic,row.id);}
  assert.notEqual(audit.rejection?.kind,'syntax-error');
 }
}
console.log('PASS '+results.length+' runtime-read matrix runs; literal candidates and frozen ordinary outputs');
