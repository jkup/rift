import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {variants,blockers} from '../../../tools/test262/input.mjs';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='91ae047';
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const read=p=>readFileSync(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');
const paths=git(['ls-tree','-r','--name-only',base]).split('\n');
const allowed=new Set(['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/feature-inventory.md','typescript/tools/build-native.mjs','typescript/src/script-execution-internal.ts','typescript/docs/script-admission.md']);
assert.deepEqual(read('typescript/docs/script-admission.md'),readFileSync(new URL('correction/coordinator-admission.md.txt',here)));
const owned=p=>p.startsWith('typescript/docs/validation/ts-035b/')||p.startsWith('typescript/test/fixtures/script-throw-inspection/')||['typescript/src/script-throw-inspection.ts','typescript/test/script-throw-inspection.ts'].includes(p);
const changed=git(['diff','--name-only',base]).split('\n').filter(Boolean);
assert.deepEqual(changed.filter(p=>!allowed.has(p)&&!owned(p)),[]);
const gate=read('typescript/tools/build-native.mjs').toString().replaceAll('\r\n','\n').trim();
assert.equal(gate,git(['show',base+':typescript/tools/build-native.mjs']).replace('["test/script-observation-serialization.ts", "script-observation-serialization"]])','["test/script-observation-serialization.ts", "script-observation-serialization"], ["test/script-throw-inspection.ts", "script-throw-inspection"]])'));
const manifest=JSON.parse(read('typescript/fixtures/assistance/test262-starter-corpus/manifest.json'));
const planned=manifest.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});
assert.equal(manifest.entries.length,33);assert.equal(planned.length,60);assert.ok(planned.every(v=>v.blockers.length));
for(const lane of ['node','native']) {
 const prior=JSON.parse(read('typescript/docs/validation/ts-035a/guest-'+lane+'-results.json'));
 const current=JSON.parse(readFileSync(new URL('guest-'+lane+'-results.json',here)));
 assert.equal(current.length,212);assert.ok(current.every(r=>r.verdict==='PASS'));
 assert.deepEqual(current.map(r=>({name:r.name,expected:r.expected})),prior.map(r=>({name:r.name,expected:r.expected})));
}
const gates=JSON.parse(readFileSync(new URL('native-build-results.json',here)));
assert.equal(gates.length,61);assert.ok(gates.every(g=>g.verdict==='PASS'));
assert.deepEqual(gates.slice(0,60).map(g=>g.entry),JSON.parse(read('typescript/docs/validation/ts-035a/native-build-results.json')).map(g=>g.entry));
const protectedPaths=paths.filter(p=>!allowed.has(p));
const report={base,protectedTrackedFiles:protectedPaths.length,oldTestFiles:paths.filter(p=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&p.endsWith('.test.mjs')).length,
 oldGuestRecordsPerLane:212,oldNativeGates:60,newNativeGates:1,files:33,variants:60,blocked:60,changed,coordinatorExcluded:true,
 protectedInventory:protectedPaths.map(path=>({path,sha256:sha(read(path))})),frozenControlsSha256:sha(readFileSync(new URL('frozen-controls.md',here))),planned};
writeFileSync(new URL('preservation.json',here),JSON.stringify(report,null,2)+'\n');
console.log(`PASS ${report.protectedTrackedFiles} protected paths, ${report.oldTestFiles} old tests, 212 records each lane, 60 old gates, all60blocked`);
