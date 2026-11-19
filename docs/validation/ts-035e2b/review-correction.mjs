import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const own='docs/validation/ts-035e2b';
let verifier=readFileSync('docs/validation/ts-035e2b-p/verify.mjs','utf8');
verifier=verifier.replace("writeFileSync(own+'/verify-results.json',",`writeFileSync('${own}/review-preservation.json',`);
writeFileSync(own+'/review-verify.mjs',verifier);
const results=[];
for(const [name,args] of [
  ['review-E2b',['--test','tools/test262/script-ledger.test.mjs']],
  ['review-extended',[own+'/extended.mjs']],
  ['review-preservation',[own+'/review-verify.mjs','--proposed']],
]) {
  console.log('RUN '+name);
  const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:32e6,timeout:300000});
  writeFileSync(own+'/'+name+'.txt',result.stdout+result.stderr);
  results.push({name,status:result.status,signal:result.signal,error:result.error?.message??null});
  writeFileSync(own+'/review-suite-results.json',JSON.stringify(results,null,2)+'\n');
  assert.equal(result.status,0,result.stdout+result.stderr);assert.equal(result.signal,null);
  console.log(name+': 0');
}
