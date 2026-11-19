import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {gunzipSync,gzipSync} from 'node:zlib';
const here='docs/validation/ts-035d7';
const rows=JSON.parse(readFileSync('docs/validation/ts-035d7-p/semantic-matrix.json')).rows;
const inherited=JSON.parse(gunzipSync(readFileSync('docs/validation/ts-035d7-p/inherited-preparations.json.gz'))).rows;
assert.equal(rows.length,140);assert.deepEqual(['eligible','blocked','none'].map(k=>rows.filter(r=>r.expected.kind===k).length),[44,85,11]);assert.equal(inherited.length,564);
const results=[];mkdirSync('build/ts035d7-inputs',{recursive:true});let mutations=0;
for(const lane of process.argv.includes('--node')?['node']:['node','native'])for(const order of [['alpha','beta'],['beta','alpha']])for(const [i,row] of [...rows,...inherited].entries()){
 const path='build/ts035d7-inputs/'+i+'.js';writeFileSync(path,row.text);
 const args=[path,row.id,...order.map(n=>'test/fixtures/script-lexical-statement-audit/'+n+'.js')];
 const run=spawnSync(lane==='node'?process.execPath:'build/native/script-lexical-statement-audit.exe',lane==='node'?['build/node/test/script-lexical-statement-audit.js',...args]:args,{encoding:'utf8',timeout:60000,maxBuffer:32*1024*1024});
 const record={lane,order,id:row.id,inherited:i>=140,status:run.status,signal:run.signal,error:run.error?.message??null,stdout:run.stdout,stderr:run.stderr};results.push(record);
 try {
 assert.equal(run.status,0,row.id+run.stderr);assert.equal(run.signal,null);assert.equal(run.error,undefined);const actual=JSON.parse(run.stdout);
 if(i<140){assert.deepEqual(actual.audit,row.expected,row.id+' full audit');if(lane==='node'&&order[0]==='alpha'&&row.expected.kind==='blocked'){
 const paths=[['reason'],['diagnostic','message'],['diagnostic','phase'],['diagnostic','name'],['diagnostic','loc','line'],['diagnostic','loc','column'],...(row.expected.rejection===null?[]:Object.keys(row.expected.rejection).map(k=>['rejection',k]))];
 for(const path of paths){const wrong=structuredClone(row.expected);let at=wrong;for(const k of path.slice(0,-1))at=at[k];const k=path.at(-1);at[k]=typeof at[k]==='number'?at[k]+1:'WRONG';assert.throws(()=>assert.deepEqual(actual.audit,wrong));mutations++;}
 }}
 assert.deepEqual(actual.ordinary,i<140?{...row.current,preparation:row.futurePreparation}:row.expected.result,row.id+' eight ordinary');
 const n=JSON.parse(actual.nodes[2]);assert.deepEqual({source:n.source,body:n.body,scopes:n.scopes.map(({id,node,body})=>[id,{node,body}]),declarations:n.declarations.map(({id,node,initializer})=>[id,{node,initializer}]),assignments:n.assignments.map(({node,eligible})=>[node,eligible])},i<140?row.retention:row.expected.retention,row.id+' retention');
 for(const runtime of actual.runtime){const expected=rows.find(r=>r.text===runtime.text);assert(expected);assert.deepEqual(runtime.audit,expected.expected);}
 }catch(e){writeFileSync(here+'/matrix-failure.json',JSON.stringify({record,error:String(e)},null,2));throw e;}
}
assert.equal(mutations,664);writeFileSync(here+'/matrix-results'+(process.argv.includes('--node')?'-node':'')+'.json.gz',gzipSync(JSON.stringify(results,null,2)+'\n'));console.log(`PASS ${results.length} source runs; 140 literals, 564 inherited, 664 full oracle mutations, eight ordinary APIs, retention and both runtime orders`);
