import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyGates} from './verify-gates.mjs';
const here='docs/validation/ts-035d3',results=[];
const sources=JSON.parse(readFileSync(here+'/run-source-hashes.json'));
function check(){for(const s of sources)assert.equal(createHash('sha256').update(readFileSync(s.path)).digest('hex'),s.sha256);}
check();const gates=JSON.parse(readFileSync('build/native-build-results.json'));
writeFileSync(here+'/native-build-summary.json',JSON.stringify(verifyGates(gates),null,2)+'\n');
writeFileSync(here+'/gate.json',JSON.stringify(gates.at(-1),null,2)+'\n');
for(const [name,args] of [['guest-native',['tools/run-guests.mjs','native']],['matrix',['docs/validation/ts-035d3/validate.mjs']],['required',['docs/validation/ts-035d3/required-suites.mjs']]]){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024});
 writeFileSync(here+'/'+name+'.log',(r.stdout??'')+(r.stderr??''));results.push({name,status:r.status,signal:r.signal,error:r.error?.message??null});writeFileSync(here+'/continuation.json',JSON.stringify(results,null,2)+'\n');console.log(name,r.status);check();
 if(r.status!==0||r.signal||r.error){process.exitCode=1;break;}
}
for(const file of ['native-build-results.json','guest-node-results.json','guest-native-results.json'])copyFileSync('build/'+file,here+'/'+file);
