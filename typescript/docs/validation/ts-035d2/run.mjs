import {spawnSync} from 'node:child_process';
import {writeFileSync,copyFileSync} from 'node:fs';
const here='docs/validation/ts-035d2',results=[];
for(const [name,args] of [
 ['node-build',['node_modules/typescript/bin/tsc','-p','tsconfig.json']],
 ['guest-node',['tools/run-guests.mjs','node']],
 ['full-native',['tools/build-native.mjs']],
 ['guest-native',['tools/run-guests.mjs','native']],
 ['matrix',['docs/validation/ts-035d2/validate.mjs']],
 ['wire',['--test','tools/test262/script-strict-rule-dispatch.test.mjs']],
 ['required',['docs/validation/ts-035d2/required-suites.mjs']],
 ['old-tests',['docs/validation/ts-035d2/verify-old-files.mjs']],
 ['extra',['docs/validation/ts-035d2/extra-controls.mjs']],
 ['preserve',['docs/validation/ts-035d2/preserve.mjs']],
]){
 if(name==='preserve')for(const file of ['native-build-results.json','guest-node-results.json','guest-native-results.json'])copyFileSync('build/'+file,here+'/'+file);
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024});
 writeFileSync(here+'/'+name+'.log',(r.stdout??'')+(r.stderr??''));results.push({name,status:r.status,signal:r.signal,error:r.error?.message??null});writeFileSync(here+'/completion.json',JSON.stringify(results,null,2)+'\n');console.log(name,r.status);
 if(r.status!==0||r.signal||r.error){process.exitCode=1;break;}
}
for(const file of ['native-build-results.json','guest-node-results.json','guest-native-results.json'])copyFileSync('build/'+file,here+'/'+file);
