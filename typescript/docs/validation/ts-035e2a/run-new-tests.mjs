import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const args=['--test','tools/test262/script-plan.test.mjs'];
const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:32e6,timeout:300000});
writeFileSync(new URL('E2a.txt',import.meta.url),result.stdout+result.stderr);
writeFileSync(new URL('E2a-result.json',import.meta.url),JSON.stringify({name:'E2a',args,status:result.status,signal:result.signal,error:result.error?.message??null},null,2)+'\n');
console.log(result.stdout+result.stderr);
assert.equal(result.status,0);assert.equal(result.signal,null);
