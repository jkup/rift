import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const records=[];
for(const lane of ['node','native']){
 const args=['fixtures/script-strict-parameter-dispatch/alpha.js','controls','controls','fixtures/script-strict-parameter-dispatch/beta.js'];
 const r=spawnSync(lane==='node'?process.execPath:'build/native/script-strict-parameter-dispatch.exe',lane==='node'?['build/node/test/script-strict-parameter-dispatch.js',...args]:args,{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});
 records.push({lane,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});writeFileSync('docs/validation/ts-035d4/controls-results.json',JSON.stringify(records,null,2)+'\n');
 assert.equal(r.status,0,r.stderr);assert.equal(r.signal,null);assert.deepEqual(JSON.parse(r.stdout),{checks:192,runtimeInputs:2,orders:2,seededHistories:2,realms:2,profiles:3,sameId:6,ready:2});
}
console.log('PASS 384 prefix/action/role/realm/history controls plus profile, effects, source mutation and ready controls');
