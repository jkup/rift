import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
import {frozenManifest} from '../../../tools/test262/input.mjs';
const here=import.meta.dirname,fixture='test/fixtures/harness-bundle/';
const hash=b=>createHash('sha256').update(b).digest('hex');
const {manifest}=await frozenManifest();
const corpus=JSON.parse(readFileSync('docs/validation/ts-033p/corpus.json'));
for(const e of JSON.parse(readFileSync(here+'/identities.json'))){
 assert.deepEqual(e,corpus.find(c=>c.id===e.id));const b=readFileSync(fixture+e.id.split('/').at(-1));assert.equal(b.toString(),e.text);assert.equal(b.length,e.bytes);assert.equal(hash(b),e.sha256);assert.equal(createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),e.blob);
 if(e.id!=='LICENSE')assert.equal(e.blob,manifest.upstream.harnessBlobs[e.id]);
 const altered=Buffer.concat([b,Buffer.from(' ')]);assert.notEqual(hash(altered),e.sha256);
}
const frozen=JSON.parse(readFileSync(here+'/frozen-rows.json'));assert.equal(frozen.length,18);
const driver=readFileSync('test/harness-bundle.ts','utf8');assert.ok(driver.includes('const rows: Row[] = '+JSON.stringify(frozen,null,2)+';'));
const gate=JSON.parse(readFileSync(here+'/gate.json'));assert.equal(gate.verdict,'PASS');
const results=[];
try{for(const input of JSON.parse(readFileSync(here+'/frozen-inputs.json'))){
 const path=fixture+input.id+'.js';assert.equal(hash(readFileSync(path)),input.sha256);
 const expected=frozen.map(r=>'PASS '+r.id+'\n').join('')+`PASS runtime ${input.expectedThrow}\nPASS fresh/seeded cross-Realm prefixes=24\nPASS repeated occurrence identity\nPASS retained message identity\nPASS stage/failure priority controls=7\n`;
 const row={id:input.id};
 for(const lane of ['node','native']){const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-bundle.exe',lane==='node'?['build/node/test/harness-bundle.js',path]:[path],{encoding:'utf8',timeout:60000});row[lane]={status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};}
 results.push(row);assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
}
for(const lane of ['node','native']){
 const file=fixture+'input-a.js',args=lane==='node'?['build/node/test/harness-bundle.js',file,'timeout-control']:[file,'timeout-control'];
 const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-bundle.exe',args,{encoding:'utf8',timeout:2000});
 const row={id:'timeout',lane,status:r.status,signal:r.signal,error:r.error?.code??null,stdout:r.stdout,stderr:r.stderr};results.push(row);
 assert.equal(row.error,'ETIMEDOUT');assert.ok(row.stdout.includes('READY timeout stage=test harnessValidated=true'));assert.notEqual(row.status,0);
}
}finally{writeFileSync(here+'/bundle-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS verified original bytes/blob/license/order; two inputs both hosts; timeout precedence');
