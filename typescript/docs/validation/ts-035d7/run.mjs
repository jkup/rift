import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const here='docs/validation/ts-035d7',results=[];
function run(name,args){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024});
 const record={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};
 results.push(record);writeFileSync(here+'/'+name+'.log',record.stdout+record.stderr);
 writeFileSync(here+'/run-results.json',JSON.stringify(results,null,2)+'\n');
 assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(record));
}
// --built consumes the current full build; it never invokes historical fixed-count orchestrators.
if(!process.argv.includes('--built')){
 run('node-build',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
 run('native-build',['tools/build-native.mjs']);
}
run('freeze-source',['docs/validation/ts-035d7/freeze-source.mjs']);
run('required',['docs/validation/ts-035d7/required-suites.mjs']);
run('preserve',['docs/validation/ts-035d7/preserve.mjs']);
console.log('PASS D7 current-build orchestration, fresh replay archival and restored historical bytes');
