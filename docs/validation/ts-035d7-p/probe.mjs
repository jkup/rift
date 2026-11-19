import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import * as p from '../../../build/node/src/parser.js';
import {observeScripts} from '../../../build/node/src/script-observation.js';
const here=new URL('./',import.meta.url),json=f=>JSON.parse(readFileSync(new URL(f,here)));
function ordinary(text,id){const n={source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()},unit={id,text};const result={legacy:p.parse(text),returns:p.auditScriptReturns(text),declaration:p.parseDeclarationPlan(unit),bounded:p.parseBoundedScriptDeclarationPlan(unit),D1:p.auditBoundedScriptBlockFunctions(text),D3:p.auditBoundedScriptStrictParameters(text),D5:p.auditBoundedScriptNumericAssignments(text),preparation:p.parseBoundedScriptPreparation(unit,n)};return {result,retention:{source:n.source,body:n.body,scopes:[...n.scopes],declarations:[...n.declarations],assignments:[...n.assignmentNameEligible]}};}
if(process.argv[2]==='--runtime'){
 const outputs=process.argv.slice(3).map(path=>{const text=readFileSync(path,'utf8');return {path,text,current:ordinary(text,text.includes('alpha')?'R0':'R1')};});console.log(JSON.stringify(outputs));
}else{
 const matrix=json('semantic-matrix.json'),inherited=JSON.parse(gunzipSync(readFileSync(new URL('inherited-preparations.json.gz',here))));let contexts=0,mutations=0;
 for(const row of matrix.rows){assert.deepEqual(ordinary(row.text,row.id),{result:row.current,retention:row.retention},row.id);for(const c of row.contexts){assert.deepEqual(observeScripts(c.request),c.current);contexts++;}
  if(row.expected.kind==='blocked'){
   const paths=[['reason'],['diagnostic','message'],['diagnostic','phase'],['diagnostic','name'],['diagnostic','loc','line'],['diagnostic','loc','column'],...(row.expected.rejection===null?[]:Object.keys(row.expected.rejection).map(k=>['rejection',k]))];
   for(const path of paths){const wrong=structuredClone(row.expected);let at=wrong;for(const k of path.slice(0,-1))at=at[k];const k=path.at(-1);at[k]=typeof at[k]==='number'?at[k]+1:'WRONG';assert.throws(()=>assert.deepEqual(wrong,row.expected));mutations++;}
  }
 }
 for(const row of inherited.rows)assert.deepEqual(ordinary(row.text,row.id),row.expected,row.scope+'/'+row.id);
 const runtime=[];for(const order of [['alpha','beta'],['beta','alpha']]){const args=[fileURLToPath(import.meta.url),'--runtime',...order.map(n=>fileURLToPath(new URL('inputs/'+n+'.js',here)))];const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});runtime.push({order,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,undefined);for(const output of JSON.parse(r.stdout)){const row=matrix.rows.find(r=>r.text===output.text);assert(row);assert.deepEqual(output.current,{result:row.current,retention:row.retention});}}
 writeFileSync(new URL('probe-results.json',here),JSON.stringify({claim:'Read-only accepted D6 Node APIs; two disk inputs, both orders. No native/new audit implementation.',rows:matrix.rows.length,contexts,inherited:inherited.rows.length,blockedOracleMutations:mutations,runtime},null,2)+'\n');console.log(JSON.stringify({rows:matrix.rows.length,contexts,inherited:inherited.rows.length,blockedOracleMutations:mutations,runtimeProcesses:runtime.length}));
}
