// Resume only the five stages not reached after the retained restoration failure.
import './capture-history.mjs';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const here='docs/validation/ts-035d8';process.env.D8_STAGE='finish';
const results=JSON.parse(readFileSync(here+'/required-suite-results.json'));
assert.equal(results.length,45);assert(results.every(r=>r.status===0&&r.signal===null&&r.error===null));
const inventory=JSON.parse(readFileSync(here+'/historical-inventory.json'));
const backups=new Map(inventory.map(row=>{const bytes=readFileSync(row.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.path);return [row.path,bytes];}));
function run(name,args){const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024,env:{...process.env,D8_STAGE:name.replaceAll('/','-'),NODE_OPTIONS:(process.env.NODE_OPTIONS??'')+' --import='+pathToFileURL(resolve(here+'/capture-history.mjs')).href}});const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};results.push(row);writeFileSync(here+'/required-suite-results.json',JSON.stringify(results,null,2)+'\n');console.log(name+': '+r.status);assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(row));}

try {
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('host73',['--test',...readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')&&!f.startsWith('script-')).map(f=>'tools/test262/'+f)]);
run('observations22',['tools/test262/observation.integration.mjs']);
run('probes10',['tools/run-probes.mjs']);
for(const file of ['native-build-results.json','guest-node-results.json','guest-native-results.json','probe-results.json'])copyFileSync('build/'+file,here+'/'+file);
assert.equal(results.length,50,'46 inherited stages plus four D8 stages');
console.log('PASS 46 inherited stages and four D8 stages; all historical evidence recursively restored');

} finally {
 for(const [path,bytes] of backups){if(!readFileSync(path).equals(bytes))writeFileSync(path,bytes);assert.deepEqual(readFileSync(path),bytes);}
 const restoration=JSON.parse(readFileSync(here+'/restoration.json'));restoration.finalFiveStagesHistoryRestored=true;writeFileSync(here+'/restoration.json',JSON.stringify(restoration,null,2)+'\n');
}
