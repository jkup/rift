import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,copyFileSync,unlinkSync} from 'node:fs';
const here='docs/validation/ts-035d2';
const gates=JSON.parse(readFileSync('build/native-build-results.json'));assert.equal(gates.length,65);assert.ok(gates.every(g=>g.verdict==='PASS'));
const results=[];
function run(name,args){const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024});const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};results.push(row);writeFileSync(here+'/required-suite-results.json',JSON.stringify(results,null,2)+'\n');console.log(name+': '+r.status);assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(row));}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
const roots=readdirSync('docs/validation',{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='ts-035d2').map(e=>'docs/validation/'+e.name),backups=new Map(roots.flatMap(files).map(p=>[p,readFileSync(p)]));
mkdirSync(here+'/inherited',{recursive:true});
try{
 run('D1-unchanged-matrix',['docs/validation/ts-035d1/validate.mjs']);
 run('D1-unchanged-extra',['docs/validation/ts-035d1/extra-controls.mjs']);
 run('C-real-transport',['tools/test262/script-observation.integration.mjs']);
 run('C-host21',['docs/validation/ts-035c/new-host-suites.mjs']);
 for(const [scope,entry] of [['ts-035b','test/script-throw-inspection.ts'],['ts-034h7','test/harness-bundle.ts']])writeFileSync('docs/validation/'+scope+'/gate.json',JSON.stringify(gates.find(g=>g.entry===entry),null,2)+'\n');
 run('B-XU-P01-P09',['docs/validation/ts-035b/validate.mjs']);run('B-boundary',['docs/validation/ts-035b/boundary.mjs']);
 run('H7',['docs/validation/ts-034h7/validate.mjs']);
 const c='docs/validation/ts-034h6-c';
 for(const name of ['validate','validate-map','replay-errors-b','replay-catch','replay-switch','replay-for-update','replay-nonstrict','replay-construct','replay-errors-a','node-slots','replays/validate','replays/node-boundary','replays/bounded-boundary','replays/replays'])run(name,[c+'/'+name+'.mjs']);
 run('A-both-serializer-lanes',['docs/validation/ts-035a/capture.mjs']);run('A21',['--test','tools/test262/script-driver-result.test.mjs','tools/test262/script-result.test.mjs']);
}finally{
 for(const path of roots.flatMap(files)){const prior=backups.get(path),now=readFileSync(path);if(!prior||!prior.equals(now))copyFileSync(path,here+'/inherited/'+path.slice('docs/validation/'.length).replaceAll('/','__'));if(!prior)unlinkSync(path);}
 for(const [path,bytes] of backups){if(!readFileSync(path).equals(bytes))writeFileSync(path,bytes);assert.deepEqual(readFileSync(path),bytes);}
 writeFileSync('build/native-build-results.json',JSON.stringify(gates,null,2));
}
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('host73',['--test',...readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')&&!f.startsWith('script-')).map(f=>'tools/test262/'+f)]);
run('observations22',['tools/test262/observation.integration.mjs']);
run('probes10',['tools/run-probes.mjs']);
for(const file of ['native-build-results.json','guest-node-results.json','guest-native-results.json','probe-results.json'])copyFileSync('build/'+file,here+'/'+file);
console.log('PASS required suites; all historical evidence recursively restored');
