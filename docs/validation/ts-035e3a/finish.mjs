// Resume after retained Windows sandbox EPERM failures, without repeating the
// already successful constructor/A/C suites or rewriting their evidence.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..');
const json=p=>JSON.parse(readFileSync(p));
const save=(p,v)=>writeFileSync(join(here,p),JSON.stringify(v,null,2)+'\n');
const {sandbox}=json(join(here,'run-location.json'));
const results=[];
for(const [name,args] of [
 ['host73-permissions',['--test',...readdirSync(join(sandbox,'tools/test262')).filter(n=>n.endsWith('.test.mjs')&&!n.startsWith('script-')).map(n=>'tools/test262/'+n)]],
 ['observations22',['tools/test262/observation.integration.mjs']],
 ['runner20',['--test','tools/probe-verdict.test.mjs']],
 ['typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']],
]){
 console.log('START '+name+' '+new Date().toISOString());
 const r=spawnSync(process.execPath,args,{cwd:sandbox,encoding:'utf8',maxBuffer:32e6,timeout:300000});
 writeFileSync(join(here,name+'.txt'),(r.stdout??'')+(r.stderr??''));
 results.push({name,args,status:r.status,signal:r.signal,error:r.error?.message??null});save('completion-suite-results.json',results);
 console.log('END '+name+' status='+r.status);assert.equal(r.status,0,r.stderr);assert.equal(r.signal,null);assert.equal(r.error,undefined);
}
const copied=json(join(here,'copied-inputs.json'));
for(const row of copied)assert.equal(createHash('sha256').update(readFileSync(row.path)).digest('hex'),row.sha256,row.path);
const retained={};for(const lane of ['node','native']){const rows=json(join(root,'docs/validation/ts-035d8/guest-'+lane+'-results.json'));assert.equal(rows.length,212);assert(rows.every(r=>r.verdict==='PASS'));retained[lane]=rows.length;}
const gates=json(join(root,'docs/validation/ts-035d8/native-build-results.json'));assert.equal(gates.length,71);assert(gates.every(r=>r.verdict==='PASS'));
const {frozenManifest,variants}=await import('../../../tools/test262/input.mjs');
const {reconstructScriptDebts}=await import('../../../tools/test262/script-capabilities.mjs');
const {manifest}=await frozenManifest();
const debts=manifest.entries.flatMap(e=>{const m=Object.fromEntries(['flags','features','includes','locale','negative'].map(k=>[k,structuredClone(e[k]??(k==='negative'?null:[]))]));return variants(m).map(v=>({id:e.id,variant:v,debts:reconstructScriptDebts(m,v,e.id)}));});
assert.equal(debts.length,60);assert.equal(debts.filter(r=>r.debts[0].status==='unsupported-feature').length,19);assert.equal(debts.filter(r=>r.debts[0].status==='unsupported-profile').length,41);
save('corpus-debts.json',debts);save('preservation-results.json',{protected:6703,exactReplacements:2,copiedOriginalsUnchanged:copied.length,retained,retainedNativeGates:gates.length,blocked:60,feature:19,profile:41,freshBuild:false,sandbox});
