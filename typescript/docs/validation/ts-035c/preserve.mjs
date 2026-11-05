import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {variants,blockers} from '../../../tools/test262/input.mjs';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='e66876d';
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:128*1024*1024}).trim();
const read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex'),normal=s=>s.replaceAll('\r\n','\n').trim();
const paths=git(['ls-tree','-r','--name-only',base]).split('\n');
const allowed=new Set(['typescript/COORDINATION.md','typescript/TASKS.md','typescript/docs/feature-inventory.md','typescript/docs/script-admission.md','typescript/tools/build-native.mjs','typescript/tools/test262/script-driver-result.mjs','typescript/tools/test262/script-result.mjs']);
const owned=p=>p.startsWith('typescript/docs/validation/ts-035c/')||p.startsWith('typescript/test/fixtures/script-observation/')||['typescript/src/script-observation.ts','typescript/src/script-observation-driver.ts','typescript/test/script-observation.ts','typescript/tools/test262/script-observe.mjs','typescript/tools/test262/script-observation.integration.mjs'].includes(p)||/^typescript\/tools\/test262\/script-observe.*\.test\.mjs$/.test(p);
const changed=git(['diff','--name-only',base]).split('\n').filter(Boolean);assert.deepEqual(changed.filter(p=>!allowed.has(p)&&!owned(p)),[]);
const oldTests=paths.filter(p=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&p.endsWith('.test.mjs'));assert.deepEqual(changed.filter(p=>oldTests.includes(p)),[]);
const priorBuild=git(['show',base+':typescript/tools/build-native.mjs']);
assert.equal(normal(read('typescript/tools/build-native.mjs').toString()),normal(priorBuild.replace('["test/script-throw-inspection.ts", "script-throw-inspection"]])','["test/script-throw-inspection.ts", "script-throw-inspection"], ["src/script-observation-driver.ts", "script-observation-driver"], ["test/script-observation.ts", "script-observation"]])')));
const before="need(b.action==='execute' && op.phase!=='parse' && ['resource-limit','unsupported-operation'].includes(o.kind));",after="need((b.action==='execute' || op.stage==='harness') && op.phase!=='parse' && ['resource-limit','unsupported-operation'].includes(o.kind));";
for(const file of ['script-driver-result.mjs','script-result.mjs']){const old=git(['show',base+':typescript/tools/test262/'+file]);assert.equal(old.split(before).length,2);assert.equal(normal(read('typescript/tools/test262/'+file).toString()),normal(old.replace(before,after)));}
assert.equal(sha(read('typescript/src/script-execution-internal.ts')),'a9d69ee2a0439653817aa116ad491c413d4a82f6aa4dcf1228cea3d42bba8614');
assert.deepEqual(read('typescript/docs/script-admission.md'),readFileSync(new URL('coordinator-admission.md.txt',here)));
for(const lane of ['node','native']){const prior=JSON.parse(read('typescript/docs/validation/ts-035b/guest-'+lane+'-results.json')),now=JSON.parse(readFileSync(new URL('guest-'+lane+'-results.json',here)));assert.equal(now.length,212);assert.ok(now.every(r=>r.verdict==='PASS'));assert.deepEqual(now.map(r=>({name:r.name,expected:r.expected})),prior.map(r=>({name:r.name,expected:r.expected})));}
const gates=JSON.parse(readFileSync(new URL('native-build-results.json',here))),priorGates=JSON.parse(read('typescript/docs/validation/ts-035b/native-build-results.json'));assert.equal(gates.length,63);assert.ok(gates.every(g=>g.verdict==='PASS'));assert.deepEqual(gates.slice(0,61).map(g=>g.entry),priorGates.map(g=>g.entry));
const manifest=JSON.parse(read('typescript/fixtures/assistance/test262-starter-corpus/manifest.json')),planned=manifest.entries.flatMap(e=>{const meta={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(meta).map(v=>({id:e.id,variant:v,blockers:blockers(meta,v,e.id)}));});assert.equal(manifest.entries.length,33);assert.equal(planned.length,60);assert.ok(planned.every(v=>v.blockers.length));
const registry=JSON.parse(read('typescript/test/fixtures/script-observation/controls.json')),runs=JSON.parse(readFileSync(new URL('integration-latest.json',here)));assert.equal(registry.rows.length,43);assert.equal(runs.length,172);
for(const lane of ['node','native'])for(const input of ['alpha','beta'])assert.deepEqual(runs.filter(r=>r.lane===lane&&r.input===input).map(r=>r.id),registry.rows.map(r=>r.id));
const protectedPaths=paths.filter(p=>!allowed.has(p));
const result={base,protectedTrackedFiles:protectedPaths.length,oldTestFiles:oldTests.length,oldGuestRecordsPerLane:212,oldNativeGates:61,newNativeGates:2,controlRows:43,realControlAttempts:172,files:33,variants:60,blocked:60,changed,coordinatorExcluded:true,protectedInventory:protectedPaths.map(path=>({path,sha256:sha(read(path))})),planned};
writeFileSync(new URL('preservation.json',here),JSON.stringify(result,null,2)+'\n');console.log(`PASS ${result.protectedTrackedFiles} protected paths, ${oldTests.length} unchanged old tests, 212 both, 61+2 static gates, 43x2x2 controls, all60blocked`);
