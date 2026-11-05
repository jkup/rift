import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const here='docs/validation/ts-035d2';
const gates=JSON.parse(readFileSync('build/native-build-results.json'));gates[64]=JSON.parse(readFileSync(here+'/gate.json'));writeFileSync('build/native-build-results.json',JSON.stringify(gates,null,2));copyFileSync('build/native-build-results.json',here+'/native-build-results.json');
const results=[];
for(const [name,args] of [
 ['matrix-paired',['docs/validation/ts-035d2/validate.mjs']],
 ['wire-final',['--test','tools/test262/script-strict-rule-dispatch.test.mjs']],
 ['extra',['docs/validation/ts-035d2/extra-controls.mjs']],
 ['unaffected',['docs/validation/ts-035d2/unaffected-suites.mjs']],
 ['old-tests',['docs/validation/ts-035d2-p/verify.mjs','--old-tests-only']],
]){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024});writeFileSync(here+'/'+name+'.log',(r.stdout??'')+(r.stderr??''));results.push({name,status:r.status,signal:r.signal,error:r.error?.message??null});writeFileSync(here+'/unaffected-completion.json',JSON.stringify(results,null,2)+'\n');console.log(name,r.status);if(r.status!==0||r.signal||r.error){process.exitCode=1;break;}
}
