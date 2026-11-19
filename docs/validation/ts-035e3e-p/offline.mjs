import assert from 'node:assert/strict';
import {readFileSync as read,writeFileSync as write,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,join} from 'node:path';
const here=fileURLToPath(new URL('./',import.meta.url)),root=fileURLToPath(new URL('../../../',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const load=p=>JSON.parse(read(join(here,p)));
const save=(p,x)=>write(join(here,p),JSON.stringify(x,null,2)+'\n');
const expected=load('descriptor-literals.json');
const test=join(here,'proposals/script-host-services.test.mjs');
let testText=read(test,'utf8');if(testText.includes('LITERAL_HASH_PLACEHOLDER'))write(test,testText.replace('LITERAL_HASH_PLACEHOLDER',sha(read(join(here,'descriptor-literals.json')))));
// Exact new-file test in an ordinary source-only isolated tree. No build output.
const isolated=join(here,'offline-copy');mkdirSync(join(isolated,'tools/test262'),{recursive:true});
for(const row of load('construction-source.json')){const target=join(isolated,row.path);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(root,row.path),target);}
mkdirSync(join(isolated,'docs/validation/ts-035e3e-p'),{recursive:true});
copyFileSync(join(here,'descriptor-literals.json'),join(isolated,'docs/validation/ts-035e3e-p/descriptor-literals.json'));
for(const name of ['script-host-services.mjs','script-host-services.test.mjs'])copyFileSync(join(here,'proposals',name),join(isolated,'tools/test262',name));
const run=spawnSync(process.execPath,[join(isolated,'tools/test262/script-host-services.test.mjs')],{encoding:'utf8',windowsHide:true});
save('proposal-test-result.json',{status:run.status,signal:run.signal,error:run.error?.message??null,stdout:run.stdout,stderr:run.stderr});assert.equal(run.status,0);assert.equal(run.signal,null);assert.equal(run.error,undefined);
const source=read(join(here,'proposals/script-host-services.mjs'),'utf8');
const mutants=[
 ['mode',"mode: 'conformance'","mode: 'script-observation'"],['profile',"profile: 'script'","profile: 'legacy'"],
 ['sink',"realm('test', 'unexpected Script output')","realm('test', 'control output')"],
 ['other-collapse',"if (control === 'B09')","if (control === 'NEVER')"],
 ['control-purpose','purpose, control,','purpose: "main", control,'],
 ['service-omission',"hostServices: [{ path:","unusedServices: [{ path:"],
 ['global-order',"['undefined',false,false,false], ['NaN',false,false,false]","['NaN',false,false,false], ['undefined',false,false,false]"],
 ['source-omit','structuredClone(sourceSnapshot)','structuredClone(sourceSnapshot.slice(1))'],
 ['source-reorder','structuredClone(sourceSnapshot)','structuredClone(sourceSnapshot.toReversed())'],
 ['source-transitive','structuredClone(sourceSnapshot)','structuredClone(sourceSnapshot.map((x,i)=>i===0?{...x,sha256:"0".repeat(64)}:x))'],
 ['authority',"authority: 'none'","authority: 'success'"],
 ['freshness','currentSourceVerified: false','currentSourceVerified: true']];
const rejected=[];
for(const [name,from,to] of mutants){assert.ok(source.includes(from),'mutation setup '+name);const p=join(here,'mutant-'+name+'.mjs');write(p,source.replace(from,to));const api=await import(pathToFileURL(p));let comparisons=0,denials=0;for(const row of expected){const actual=api.describeScriptHostServices(...row.args);comparisons++;try{assert.deepEqual(actual,row.expected);}catch(e){assert.equal(e.code,'ERR_ASSERTION');denials++;}}assert.ok(denials>0,'escaped '+name);rejected.push({name,completed:comparisons,denied:denials});}
save('descriptor-mutants.json',rejected);
// Independently pinned lists, not their self-reported digests, are the oracle.
// This tests witness sensitivity only. It cannot certify compiler provenance.
const accepted=join(root,'docs/validation/ts-035e3d');
const generated=JSON.parse(read(join(accepted,'generated-closure.json')));
const witness={inventory:load('closure-inventory.json'),generated:generated.generated,native:JSON.parse(read(join(accepted,'fresh-native-outputs.json'))),node:generated.node,zig:generated.zig,host:{version:process.version,platform:process.platform,arch:process.arch},requests:JSON.parse(read(join(root,load('request-literal-reference.json').path)))};
save('identity-witness.json',witness);
const mutations=[['generated',x=>x.generated[0].sha256='0'.repeat(64)],['binary',x=>x.native[0].sha256='0'.repeat(64)],['package',x=>x.inventory.configuration[0].sha256='0'.repeat(64)],['compiler',x=>x.inventory.installedPackages.find(r=>r.path.endsWith('scriptc.exe')).sha256='0'.repeat(64)],['node',x=>x.node.sha256='0'.repeat(64)],['zig',x=>x.zig.sha256='0'.repeat(64)],['platform',x=>x.host.arch='arm64'],['partial',x=>x.inventory.installedPackages.pop()],['source-omit',x=>x.inventory.source.pop()],['source-order',x=>x.inventory.source.reverse()],['transitive',x=>x.inventory.source[0].sha256='0'.repeat(64)],['request-omit',x=>x.requests.pop()],['occurrence-reorder',x=>x.requests[0].originalTexts.reverse()],['limit',x=>x.requests[0].binding.limits.calls=0],['role',x=>x.requests[0].binding.units[0].role='test'],['variant',x=>x.requests[0].binding.variant='raw']];
const results=[];
for(const [name,change] of mutations){const candidate=structuredClone(witness);change(candidate);const selfConsistent={data:candidate,sha256:sha(JSON.stringify(candidate))};assert.equal(selfConsistent.sha256,sha(JSON.stringify(selfConsistent.data)));assert.notDeepEqual(candidate,witness,'independent witness '+name);results.push({name,selfConsistentSha256:selfConsistent.sha256,rejected:true});}
save('identity-mutants.json',results);
console.log(run.stdout.trim());console.log(`${mutants.length} actual descriptor mutants; ${mutations.length} complete self-consistent witness mutants rejected (data oracle only)`);
