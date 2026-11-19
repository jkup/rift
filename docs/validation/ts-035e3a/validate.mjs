import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync,readdirSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..'),repo=resolve(root,'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(readFileSync(p));
const proposal=resolve(here,'../ts-035e3-p');
const manifest=json(join(proposal,'proposal-manifest.json'));
const save=(name,value)=>writeFileSync(join(here,name),JSON.stringify(value,null,2)+'\n');
function preserve(){
 const rows=json(join(proposal,'preservation.json'));
 assert.equal(rows.length,6703);
 for(const row of rows)assert.equal(hash(readFileSync(join(repo,row.path))),manifest.find(m=>m.path===row.path)?.after??row.sha256,row.path);
 for(const row of json(join(proposal,'artifacts.json')))assert.equal(hash(readFileSync(join(proposal,row.path))),row.sha256,row.path);
 for(const row of manifest)assert.equal(hash(readFileSync(join(repo,row.path))),row.after,row.path);
 assert(readFileSync(join(root,'tools/test262/script-compose.test.mjs')).equals(readFileSync(join(proposal,'proposals/script-compose.test.mjs'))));
 const original=spawnSync('git',['show','b32e833:typescript/tools/test262/script-result.mjs'],{cwd:repo,maxBuffer:4e6});assert.equal(original.status,0);
 const current=readFileSync(join(root,'tools/test262/script-result.mjs'));
 // Git text uses LF; the accepted proposal preserves the working-tree prefix.
 assert.equal(current.toString().replaceAll('\r\n','\n'),original.stdout.toString().replaceAll('\r\n','\n')+readFileSync(join(proposal,'classifier-addition.txt'),'utf8').replaceAll('\r\n','\n'));
 return {protected:rows.length,exactReplacements:2,exactNewTest:true,originalPrefixUnchanged:true,proposalHistoryUnchanged:true};
}
const initial=preserve();
const sandbox=mkdtempSync(join(root,'build/ts035e3a-validation-'));
const copied=[];
function copy(relative){
 const from=join(root,relative),to=join(sandbox,relative);
 function check(p){const s=lstatSync(p);assert(!s.isSymbolicLink(),p);if(s.isDirectory())for(const n of readdirSync(p))check(join(p,n));else copied.push({path:p,sha256:hash(readFileSync(p))});}
 check(from);mkdirSync(dirname(to),{recursive:true});cpSync(from,to,{recursive:true,errorOnExist:true,force:false});
}
for(const p of ['src','test','probes','tools','fixtures','package.json','package-lock.json','tsconfig.json','build/node','node_modules/yaml','node_modules/typescript','node_modules/@typescript','node_modules/@types','node_modules/undici-types','docs/validation/ts-035a/controls.mjs','docs/validation/ts-035c/test-lease.mjs','docs/validation/ts-035c/parse-only-review.json'])copy(p);
for(const n of ['script-observation-driver','script-observation','script-observation-serialization','observation-driver'])copy('build/native/'+n+'.exe');
save('copied-inputs.json',copied);save('run-location.json',{sandbox,base:'b32e833',initial});
const results=[];
function run(name,args,timeout=300000){
 console.log('START '+name+' '+new Date().toISOString());
 const r=spawnSync(process.execPath,args,{cwd:sandbox,encoding:'utf8',maxBuffer:32e6,timeout});
 writeFileSync(join(here,name+'.txt'),(r.stdout??'')+(r.stderr??''));
 results.push({name,args,status:r.status,signal:r.signal,error:r.error?.message??null});save('suite-results.json',results);
 console.log('END '+name+' status='+r.status);assert.equal(r.status,0,r.stderr);assert.equal(r.signal,null);assert.equal(r.error,undefined);
}
run('constructor',['--test','tools/test262/script-compose.test.mjs']);
run('A-decoders',['--test','tools/test262/script-result.test.mjs','tools/test262/script-driver-result.test.mjs']);
run('C-codec',['--test','tools/test262/script-observe-codec.test.mjs']);
run('C-transport',['tools/test262/script-observation.integration.mjs'],900000);
const transport=json(join(sandbox,'docs/validation/ts-035c/integration-latest.json'));assert.equal(transport.length,172);save('transport-results.json',transport);
run('C-live-codec',['--test','tools/test262/script-observe-live-codec.test.mjs']);
run('host73',['--test',...readdirSync(join(sandbox,'tools/test262')).filter(n=>n.endsWith('.test.mjs')&&!n.startsWith('script-')).map(n=>'tools/test262/'+n)]);
run('observations22',['tools/test262/observation.integration.mjs']);
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']);
for(const row of copied)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
const retained={};for(const lane of ['node','native']){const rows=json(join(root,'docs/validation/ts-035d8/guest-'+lane+'-results.json'));assert.equal(rows.length,212);assert(rows.every(r=>r.verdict==='PASS'));retained[lane]=rows.length;}
const gates=json(join(root,'docs/validation/ts-035d8/native-build-results.json'));assert.equal(gates.length,71);
const {frozenManifest,variants}=await import('../../../tools/test262/input.mjs');
const {reconstructScriptDebts}=await import('../../../tools/test262/script-capabilities.mjs');
const {manifest:corpus}=await frozenManifest();
const debts=corpus.entries.flatMap(e=>{const m=Object.fromEntries(['flags','features','includes','locale','negative'].map(k=>[k,structuredClone(e[k]??(k==='negative'?null:[]))]));return variants(m).map(v=>({id:e.id,variant:v,debts:reconstructScriptDebts(m,v,e.id)}));});
assert.equal(debts.length,60);assert.equal(debts.filter(r=>r.debts[0].status==='unsupported-feature').length,19);assert.equal(debts.filter(r=>r.debts[0].status==='unsupported-profile').length,41);
save('corpus-debts.json',debts);save('preservation-results.json',{...preserve(),copiedOriginalsUnchanged:copied.length,retained,retainedNativeGates:gates.length,blocked:60,feature:19,profile:41,freshBuild:false,sandbox});
