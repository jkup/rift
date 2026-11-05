// Apply the existing bounded UNKNOWN/open retry to outer restoration too.
import './capture-history.mjs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,copyFileSync,unlinkSync,existsSync} from 'node:fs';
const here='docs/validation/ts-035d8';
process.env.D8_STAGE='orchestrator';
const gates=JSON.parse(readFileSync('build/native-build-results.json'));assert.equal(gates.length,71);assert.ok(gates.every(g=>g.verdict==='PASS'));
const inheritedGates=JSON.parse(readFileSync('docs/validation/ts-035d7/native-build-results.json'));
assert.deepEqual(gates.map(g=>g.entry),[...inheritedGates.map(g=>g.entry),'test/script-lexical-statement-dispatch.ts']);
for(const g of gates)assert.equal(probeVerdict({build:g.build,coverage:g.coverage,node:{status:0,signal:null,error:null,stdout:''},native:{status:0,signal:null,error:null,stdout:''}}),'PASS',g.entry+' independent coverage');
const results=[];
function run(name,args){const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024,env:{...process.env,D8_STAGE:name.replaceAll('/','-'),NODE_OPTIONS:(process.env.NODE_OPTIONS??'')+' --import='+pathToFileURL(resolve(here+'/capture-history.mjs')).href}});const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};results.push(row);writeFileSync(here+'/required-suite-results.json',JSON.stringify(results,null,2)+'\n');console.log(name+': '+r.status);assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(row));}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
const roots=readdirSync('docs/validation',{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='ts-035d8').map(e=>'docs/validation/'+e.name),backups=new Map(roots.flatMap(files).map(p=>[p,readFileSync(p)]));
mkdirSync(here+'/inherited',{recursive:true});
const historicalInventory=[...backups].map(([path,bytes])=>({path,sha256:createHash('sha256').update(bytes).digest('hex')}));
writeFileSync(here+'/historical-inventory.json',JSON.stringify(historicalInventory,null,2)+'\n');
copyFileSync('build/native-build-results.json',here+'/native-build-results.json');
try{
 run('D8-matrix',['docs/validation/ts-035d8/validate.mjs']);
 run('D8-wire',['--test','tools/test262/script-lexical-statement-dispatch.test.mjs']);
 run('D8-malformed',['docs/validation/ts-035d8-p/wire.mjs','--future']);
 run('D8-production',['docs/validation/ts-035d8-p/production-check.mjs','--dispatch-applied']);
 run('D7-matrix',['docs/validation/ts-035d7/validate.mjs']);
 run('guest-node',['tools/run-guests.mjs','node']);
 copyFileSync('build/guest-node-results.json',here+'/guest-node-results.json');
 run('guest-native',['tools/run-guests.mjs','native']);
 copyFileSync('build/guest-native-results.json',here+'/guest-native-results.json');
 run('D6-source',['docs/validation/ts-035d6/validate.mjs']);
 run('D6-wire',['--test','tools/test262/script-assignment-target-dispatch.test.mjs']);
 run('D6-wire-mutations',['docs/validation/ts-035d6-p/wire.mjs','--future']);
 run('D5-source',['docs/validation/ts-035d5/validate.mjs']);
 copyFileSync('docs/validation/ts-035d5/matrix-results.json',here+'/D5-source-results.json');
 run('D5-future-wire',['docs/validation/ts-035d5-p/wire.mjs','--future']);
 run('D2-future-wire',['docs/validation/ts-035d2-p/verify-future-wire.mjs']);
 run('C-codecs',['--test','tools/test262/script-observe-codec.test.mjs']);
 run('D4-source',['docs/validation/ts-035d4/validate.mjs']);
 copyFileSync('docs/validation/ts-035d4/matrix-results.json',here+'/D4-source-results.json');
 run('D4-wire',['--test','tools/test262/script-strict-parameter-dispatch.test.mjs']);
 copyFileSync('docs/validation/ts-035d4/wire-results.json',here+'/D4-wire-results.json');
 copyFileSync('docs/validation/ts-035d4/metadata-results.json',here+'/D4-metadata-results.json');
 run('D4-controls',['docs/validation/ts-035d4/controls.mjs']);
 copyFileSync('docs/validation/ts-035d4/controls-results.json',here+'/D4-controls-results.json');
 run('D5-oracle',['docs/validation/ts-035d5-p/oracle-controls.mjs']);
 copyFileSync('docs/validation/ts-035d5-p/oracle-controls.json',here+'/oracle-controls.json');
 run('D3-source',['docs/validation/ts-035d3/validate.mjs']);
 copyFileSync('docs/validation/ts-035d3/matrix-results.json',here+'/D3-source-results.json');
 run('D2-source',['docs/validation/ts-035d2/validate.mjs']);
 copyFileSync('docs/validation/ts-035d2/matrix-results.json',here+'/D2-source-results.json');
 run('D2-wire',['--test','tools/test262/script-strict-rule-dispatch.test.mjs']);
 copyFileSync('docs/validation/ts-035d2/wire-results.json',here+'/D2-wire-results.json');
 run('D2-extra',['docs/validation/ts-035d2/extra-controls.mjs']);
 copyFileSync('docs/validation/ts-035d2/extra-results.json',here+'/D2-extra-results.json');
 run('D1-unchanged-matrix',['docs/validation/ts-035d1/validate.mjs']);
 copyFileSync('docs/validation/ts-035d1/matrix-results.json',here+'/D1-source-results.json');
 run('D1-unchanged-extra',['docs/validation/ts-035d1/extra-controls.mjs']);
 copyFileSync('docs/validation/ts-035d1/extra-results.json',here+'/D1-extra-results.json');
 run('C-real-transport',['tools/test262/script-observation.integration.mjs']);
 run('C-host21',['docs/validation/ts-035c/new-host-suites.mjs']);
 for(const [scope,entry] of [['ts-035b','test/script-throw-inspection.ts'],['ts-034h7','test/harness-bundle.ts']])writeFileSync('docs/validation/'+scope+'/gate.json',JSON.stringify(gates.find(g=>g.entry===entry),null,2)+'\n');
 run('B-XU-P01-P09',['docs/validation/ts-035b/validate.mjs']);run('B-boundary',['docs/validation/ts-035b/boundary.mjs']);
 run('H7',['docs/validation/ts-034h7/validate.mjs']);
 const c='docs/validation/ts-034h6-c';
 for(const name of ['validate','validate-map','replay-errors-b','replay-catch','replay-switch','replay-for-update','replay-nonstrict','replay-construct','replay-errors-a','node-slots','replays/validate','replays/node-boundary','replays/bounded-boundary','replays/replays'])run(name,[c+'/'+name+'.mjs']);
 run('A-both-serializer-lanes',['docs/validation/ts-035a/capture.mjs']);run('A21',['--test','tools/test262/script-driver-result.test.mjs','tools/test262/script-result.test.mjs']);
}finally{
 try {
 for(const path of roots.flatMap(files)){const prior=backups.get(path),now=readFileSync(path);if(!prior||!prior.equals(now))copyFileSync(path,here+'/inherited/'+path.slice('docs/validation/'.length).replaceAll('/','__'));if(!prior)unlinkSync(path);}
 } finally {
 for(const [path,bytes] of backups){if(!existsSync(path)||!readFileSync(path).equals(bytes))writeFileSync(path,bytes);assert.deepEqual(readFileSync(path),bytes);}
 writeFileSync('build/native-build-results.json',JSON.stringify(gates,null,2));
 writeFileSync(here+'/restoration.json',JSON.stringify({files:backups.size,allBytesRestored:true},null,2)+'\n');
 }
}
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('host73',['--test',...readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')&&!f.startsWith('script-')).map(f=>'tools/test262/'+f)]);
run('observations22',['tools/test262/observation.integration.mjs']);
run('probes10',['tools/run-probes.mjs']);
for(const file of ['native-build-results.json','guest-node-results.json','guest-native-results.json','probe-results.json'])copyFileSync('build/'+file,here+'/'+file);
assert.equal(results.length,50,'46 inherited stages plus four D8 stages');
console.log('PASS 46 inherited stages and four D8 stages; all historical evidence recursively restored');
