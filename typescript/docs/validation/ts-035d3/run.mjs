import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
const here='docs/validation/ts-035d3',results=[];
const paths=['src/parser.ts','src/script-declarations.ts','test/script-strict-parameter-audit.ts','tools/build-native.mjs'];
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const sources=paths.map(path=>({path,sha256:hash(path)}));
writeFileSync(here+'/run-source-hashes.json',JSON.stringify(sources,null,2)+'\n');
for(const [name,args] of [
 ['node-build',['node_modules/typescript/bin/tsc','-p','tsconfig.json']],
 ['guest-node',['tools/run-guests.mjs','node']],
 ['full-native',['tools/build-native.mjs']],
 ['guest-native',['tools/run-guests.mjs','native']],
 ['matrix',['docs/validation/ts-035d3/validate.mjs']],
 ['required',['docs/validation/ts-035d3/required-suites.mjs']],
]){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024});
 writeFileSync(here+'/'+name+'.log',(r.stdout??'')+(r.stderr??''));results.push({name,status:r.status,signal:r.signal,error:r.error?.message??null});writeFileSync(here+'/completion.json',JSON.stringify(results,null,2)+'\n');console.log(name,r.status);
 for(const source of sources)assert.equal(hash(source.path),source.sha256,'source changed during validation: '+source.path);
 if(r.status!==0||r.signal||r.error){process.exitCode=1;break;}
}
for(const file of ['native-build-results.json','guest-node-results.json','guest-native-results.json'])copyFileSync('build/'+file,here+'/'+file);
