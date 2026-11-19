import {spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const here='docs/validation/ts-035d1';
const results=process.argv.includes('--resume')?JSON.parse(readFileSync(here+'/completion.json')).filter(r=>r.status===0&&r.signal===null&&r.error===null):[];
for(const [name,args] of [
 ['guest-native',['tools/run-guests.mjs','native']],
 ['matrix',['docs/validation/ts-035d1/validate.mjs']],
 ['extra',['docs/validation/ts-035d1/extra-controls.mjs']],
 ['required',['docs/validation/ts-035d1/required-suites.mjs']],
 ['preserve',['docs/validation/ts-035d1/preserve.mjs']],
]){
 if(results.some(r=>r.name===name))continue;
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024});
 writeFileSync(here+'/'+name+'.log',(r.stdout??'')+(r.stderr??''));
 results.push({name,status:r.status,signal:r.signal,error:r.error?.message??null});
 writeFileSync(here+'/completion.json',JSON.stringify(results,null,2)+'\n');console.log(name,r.status);
 assert.ok(r.status===0&&!r.signal&&!r.error,name+' failed');
}
