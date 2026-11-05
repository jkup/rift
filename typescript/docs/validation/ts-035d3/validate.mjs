import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const here='docs/validation/ts-035d3',rows=JSON.parse(readFileSync(here+'/frozen.json'));
const accepted=JSON.parse(readFileSync('docs/validation/ts-035d3-p/future-matrix.json'));
const prior=JSON.parse(readFileSync('docs/validation/ts-035d3-p/current-audit.json')).rows;
for(const [i,row] of rows.entries()){
 assert.equal(row.id,accepted[i].id);assert.equal(row.text,accepted[i].text);
 for(const [key,value] of Object.entries(accepted[i].expected))assert.deepEqual(row.expected[key],value,'accepted expected '+row.id);
 assert.deepEqual(row.ordinary,prior.find(x=>x.id===row.id).current,'accepted ordinary '+row.id);
}
const blockedDiagnostics=JSON.parse(readFileSync(here+'/blocked-diagnostics.json'));
assert.equal(rows.length,77);assert.equal(rows.flatMap(r=>r.expected.candidates??[]).length,30);
assert.equal(rows.filter(r=>r.expected.reason==='grammar-or-resource').length,26);
const raw=rows.find(r=>r.id==='S21-raw').text,bytes=Buffer.from(raw);
assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'),'69dc995f6fd6a07f9a5c3c5c16d50e2c5f88537b');
assert.equal(rows.find(r=>r.id==='S21').text,'"use strict";\n'+raw);
assert.ok(readFileSync('test/fixtures/script-strict-parameter-audit/b.js','utf8').includes('\r\n'));
mkdirSync('build/ts035d3-inputs',{recursive:true});
const results=[];
for(const lane of process.argv.includes('--node')?['node']:['node','native'])for(const row of rows){
 const path=row.id==='R0'?'test/fixtures/script-strict-parameter-audit/a.js':row.id==='R1'?'test/fixtures/script-strict-parameter-audit/b.js':'build/ts035d3-inputs/'+row.id+'.js';
 if(!row.id.startsWith('R'))writeFileSync(path,row.text);
 assert.equal(readFileSync(path,'utf8'),row.text);
 const run=spawnSync(lane==='node'?process.execPath:'build/native/script-strict-parameter-audit.exe',lane==='node'?['build/node/test/script-strict-parameter-audit.js',path,row.id]:[path,row.id],{encoding:'utf8',timeout:60000,maxBuffer:32*1024*1024});
 results.push({lane,id:row.id,status:run.status,signal:run.signal,error:run.error?.message??null,stdout:run.stdout,stderr:run.stderr});
 writeFileSync(here+'/matrix-results'+(process.argv.includes('--node')?'-node':'')+'.json',JSON.stringify(results,null,2)+'\n');
 assert.equal(run.status,0,row.id+': '+run.stderr);assert.equal(run.signal,null);
 const result=JSON.parse(run.stdout),audit=result.audit;
 assert.deepEqual(result.ordinary,row.ordinary,'ordinary '+row.id);
 assert.deepEqual(result.nodes,row.nodes,'nodes '+row.id);
 if(row.expected.kind!=='blocked')assert.deepEqual(audit,row.expected,row.id);
 else {
  if(blockedDiagnostics[row.id])assert.deepEqual(audit.diagnostic,blockedDiagnostics[row.id],row.id+' literal veto diagnostic');
  assert.equal(audit.kind,'blocked',row.id);assert.equal(audit.reason,row.expected.reason,row.id);
  for(const [key,value] of Object.entries(row.expected))assert.deepEqual(audit[key],value,row.id+' '+key);
  assert.deepEqual(Object.keys(audit).sort(),['diagnostic','kind','reason','rejection']);
  assert.notEqual(audit.rejection?.kind,'syntax-error');assert.equal(audit.diagnostic.phase,'parse');assert.equal(audit.diagnostic.name,'SyntaxError');
 }
}
console.log('PASS '+results.length+' runtime-read matrix runs, 30 literal pairs, 26 exact grammar diagnostics, six ordinary snapshots and node associations per run');
