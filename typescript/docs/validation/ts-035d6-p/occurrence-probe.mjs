import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {observeScripts} from '../../../build/node/src/script-observation.js';
const here=new URL('./',import.meta.url),copy=structuredClone,hash=b=>createHash('sha256').update(b).digest('hex');
const controls=JSON.parse(readFileSync(new URL('future-controls.json',here))),matrix=JSON.parse(readFileSync(new URL('semantic-matrix.json',here)));
const records=[],negativeControls=[];
function visit(value,path,found){
 if(value===null||typeof value!=='object')return;
 if(Object.hasOwn(value,'request')){assert(Array.isArray(value.request.units),path);found.push({path,holder:value,request:value.request});}
 for(const [key,child] of Object.entries(value))visit(child,path+'/'+key,found);
}
const requests=[];visit(controls,'future-controls.json',requests);const controlRequests=requests.length;
visit(matrix,'semantic-matrix.json',requests);
assert.equal(controlRequests,98);assert.equal(requests.length,464);
for(const {path,holder,request} of requests){
 // Check the full data contract before invoking the real producer. No alternate
 // guard or normalization is applied to the request passed to observeScripts.
 assert(request.units.length>0,path);
 for(const [i,u] of request.units.entries()){assert.equal(u.id,'u'+i,path);assert.equal(u.role,i===request.units.length-1?'test':'harness',path);}
 const actual=observeScripts(copy(request)),expected=holder.current??holder.expected;
 assert.deepEqual(actual,expected,path+' complete current child');
 records.push({path,requestSha256:hash(JSON.stringify(request)),actual});
 const mutations=[
  {id:'first-id',edits:[{index:0,key:'id',value:'h0'}]},
  {id:'last-id',edits:[{index:request.units.length-1,key:'id',value:'bad'}]},
  {id:'final-role',edits:[{index:request.units.length-1,key:'role',value:'harness'}]},
 ];
 if(request.units.length>1)mutations.push(
  {id:'nonfinal-role',edits:[{index:0,key:'role',value:'test'}]},
  {id:'duplicate-occurrence',edits:[{index:1,key:'id',value:'u0'}]},
  {id:'swapped-ids',edits:[{index:0,key:'id',value:'u1'},{index:1,key:'id',value:'u0'}]},
 );
 for(const m of mutations){
  const bad=copy(request);for(const e of m.edits)bad.units[e.index][e.key]=e.value;
  let error=null;try{observeScripts(bad);}catch(e){error={name:e.name,message:e.message};}
  assert.deepEqual(error,{name:'Error',message:'invalid Script occurrence order'},path+'/'+m.id);
  negativeControls.push({path,...m,expected:error});
 }
}
// Prefix metadata is not a request input. Preserve repeated paths, but require
// every producer ID/site/prefix to agree with the actual sequential request.
for(const p of controls.prefixRows){
 assert.deepEqual(p.request.units,p.units.map(({id,role,text})=>({id,role,text})));
 const failed=p.units.findIndex(u=>u.text===matrix.rows.find(r=>r.id===p.input).text);
 assert(failed>=0);assert.equal(p.expected.operation.unitId,'u'+failed);assert.equal(p.expected.source.unitId,'u'+failed);
 assert.deepEqual(p.expected.completedUnits,p.units.slice(0,failed).map(u=>u.id));
 assert.equal(p.expected.operation.stage,p.role);assert.equal(p.units[failed].path,'harness/repeated.js');
 assert(p.units.slice(0,failed).every(u=>u.path==='harness/repeated.js'));
 assert(!p.expected.completedUnits.includes('u'+failed));
 if(p.role==='harness'){assert.equal(p.units[failed+1].id,'u'+(failed+1));assert.equal(p.units[failed+1].role,'test');}
}
// The retained rejected fixture really does fail the current guard, before any
// guest execution. It is evidence of the review finding, not a future success.
const old=JSON.parse(readFileSync(new URL('original-occurrence-contract/future-controls.json',here))),originalFailures=[];
for(const [i,p] of old.prefixRows.entries()){
 const corrected=controls.prefixRows[i];assert.equal(corrected.input,p.input);assert.equal(corrected.action,p.action);assert.equal(corrected.role,p.role);
 assert.deepEqual(corrected.units.map(({role,path,text})=>({role,path,text})),p.units.map(({role,path,text})=>({role,path,text})),i+' preserve exact paths, roles and source bytes');
 const ids=new Map(p.units.map((u,n)=>[u.id,'u'+n])),expected=copy(p.expected);
 expected.operation.unitId=ids.get(expected.operation.unitId);expected.source.unitId=ids.get(expected.source.unitId);expected.completedUnits=expected.completedUnits.map(id=>ids.get(id));
 assert.deepEqual(corrected.expected,expected,i+' only occurrence identifiers change in frozen child');
 const request={nonce:'original-prefix',requestSha256:'a'.repeat(64),action:p.action,preflightId:'preflight',steps:10000,calls:64,units:p.units.map(({id,role,text})=>({id,role,text}))};
 assert.throws(()=>observeScripts(request),{name:'Error',message:'invalid Script occurrence order'});
 originalFailures.push({index:i,error:'invalid Script occurrence order'});
}
const history=readdirSync(new URL('original-occurrence-contract/',here)).filter(n=>n!=='manifest.json').sort().map(path=>({path,sha256:hash(readFileSync(new URL('original-occurrence-contract/'+path,here)))}));
const manifest=new URL('original-occurrence-contract/manifest.json',here);
if(existsSync(manifest))assert.deepEqual(JSON.parse(readFileSync(manifest)),history);else writeFileSync(manifest,JSON.stringify(history,null,2)+'\n');
writeFileSync(new URL('occurrence-results.json',here),JSON.stringify({claim:'Actual accepted D5 observeScripts with unmodified requests; harmless 0;/1; prefixes and ready execute reference control may run; every numeric source is rejected before its guest body and no later test executes. No native or future producer claim.',controlRequests,semanticRequests:requests.length-controlRequests,positiveRequests:requests.length,negativeCount:negativeControls.length,originalFailures,records,negativeControls,history},null,2)+'\n');
console.log(JSON.stringify({controlRequests,semanticRequests:requests.length-controlRequests,positiveRequests:requests.length,negativeControls:negativeControls.length,originalFailures:originalFailures.length}));
