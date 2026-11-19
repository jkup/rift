import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditBoundedScriptNumericAssignments,parseBoundedScriptPreparation} from '../../../build/node/src/parser.js';
const here=new URL('./',import.meta.url),root=new URL('../../../',import.meta.url),matrix=JSON.parse(readFileSync(new URL('semantic-matrix.json',here))),results=[];
mkdirSync(new URL('probe-inputs/',here),{recursive:true});
for(const order of [['alpha','beta'],['beta','alpha']])for(const row of matrix.rows){
 const path=new URL('probe-inputs/current.js',here);writeFileSync(path,row.text);
 const args=[fileURLToPath(new URL('build/node/test/script-assignment-target-audit.js',root)),fileURLToPath(path),row.id,...order.map(n=>fileURLToPath(new URL('inputs/'+n+'.js',here)))];
 const run=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:32*1024*1024});
 const record={id:row.id,order,status:run.status,signal:run.signal,error:run.error?.message??null,stdout:run.stdout,stderr:run.stderr};results.push(record);
 if(run.status!==0){writeFileSync(new URL('probe-failure.json',here),JSON.stringify(record,null,2));}
 assert.equal(run.status,0,row.id);assert.equal(run.signal,null);assert.equal(run.error,undefined);
 const actual=JSON.parse(run.stdout);assert.deepEqual(actual.audit,row.audit);assert.deepEqual(actual.ordinary,row.current);
 const n=JSON.parse(actual.nodes[2]);assert.deepEqual({source:n.source,body:n.body,scopes:n.scopes.map(({id,node,body})=>[id,{node,body}]),declarations:n.declarations.map(({id,node,initializer})=>[id,{node,initializer}]),assignmentNameEligible:n.assignments.map(({node,eligible})=>[node,eligible])},row.retention);
}
const d4=JSON.parse(readFileSync(new URL('../ts-035d4-p/inherited-expectations.json',here)));
let inheritedChecks=0;
for(const [scope,file] of [['D2','ts-035d2-p/semantic-matrix.json'],['D3','ts-035d3/frozen.json'],['D4','ts-035d4-p/semantic-matrix.json']]){
 const data=JSON.parse(readFileSync(new URL('../'+file,here)));
 for(const r of data.rows??data){
  const expected=scope==='D4'?r.futurePreparation:scope==='D2'?(d4.D2[r.id]?.preparation??r.futurePreparation):(d4.D3[r.id]?.preparation??r.ordinary.D2);
  const nodes={source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()};
  assert.deepEqual(parseBoundedScriptPreparation(expected.unit,nodes),expected,scope+'/'+r.id);
  assert.notEqual(auditBoundedScriptNumericAssignments(r.text).kind,'eligible',scope+'/'+r.id);inheritedChecks++;
 }
}
writeFileSync(new URL('probe-results.json',here),JSON.stringify({claim:'Current accepted D5 compiled Node audit driver only; no new code build or future emission/native execution',runtimeRuns:results.length,inheritedChecks,results},null,2)+'\n');
unlinkSync(new URL('probe-inputs/current.js',here));
console.log(JSON.stringify({runtimeRuns:results.length,inheritedChecks,fullD5Rows:102,blocked:56}));
