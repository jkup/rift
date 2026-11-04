import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { variants,blockers } from '../../../tools/test262/input.mjs';
import { newLedger,appendAttempt } from '../../../tools/test262/ledger.mjs';
const base='c4310c7',root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url);
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const read=p=>readFileSync(new URL(p,root));
const sha=x=>createHash('sha256').update(x).digest('hex');
const oldFiles=git(['ls-tree','-r','--name-only',base]).split('\n');
const allowed=new Set(['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/script-admission.md','typescript/docs/feature-inventory.md','typescript/tools/build-native.mjs']);
const newOwned=p=>p.startsWith('typescript/docs/validation/ts-035a/')||p.startsWith('typescript/test/fixtures/script-observation-serialization/')||[
 'typescript/src/script-observation-types.ts','typescript/src/script-observation-json.ts','typescript/tools/test262/script-driver-result.mjs',
 'typescript/tools/test262/script-result.mjs','typescript/tools/test262/script-driver-result.test.mjs','typescript/tools/test262/script-result.test.mjs',
 'typescript/test/script-observation-serialization.ts'].includes(p);
const changed=git(['diff','--name-only',base]).split('\n').filter(Boolean);
assert.deepEqual(changed.filter(p=>!allowed.has(p)&&!newOwned(p)),[]);
const oldGate=git(['show',base+':typescript/tools/build-native.mjs']);
const gate=read('typescript/tools/build-native.mjs').toString().replace(/\r\n/g,'\n').trim();
assert.equal(gate,oldGate.replace('["test/harness-bundle.ts", "harness-bundle"]])','["test/harness-bundle.ts", "harness-bundle"], ["test/script-observation-serialization.ts", "script-observation-serialization"]])'));
const frozen=read('typescript/test/fixtures/script-observation-serialization/frozen.json');
assert.equal(sha(frozen),readFileSync(new URL('frozen-sha256.txt',here),'utf8').trim());
const manifest=JSON.parse(read('typescript/fixtures/assistance/test262-starter-corpus/manifest.json'));
const planned=manifest.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});
assert.equal(manifest.entries.length,33);assert.equal(planned.length,60);assert.ok(planned.every(v=>v.blockers.length>0));
const rows=JSON.parse(frozen);
for(const lane of ['node','native']) {
 const prior=JSON.parse(read('typescript/docs/validation/ts-034h7/guest-'+lane+'-results.json'));
 const current=JSON.parse(readFileSync(new URL('guest-'+lane+'-results.json',here)));
 assert.equal(current.length,212);assert.ok(current.every(x=>x.verdict==='PASS'));
 assert.deepEqual(current.map(x=>({name:x.name,expected:x.expected})),prior.map(x=>({name:x.name,expected:x.expected})));
}
const oldGates=JSON.parse(read('typescript/docs/validation/ts-034h7/native-build-results.json'));
const gates=JSON.parse(readFileSync(new URL('native-build-results.json',here)));
assert.equal(gates.length,60);assert.ok(gates.every(x=>x.verdict==='PASS'));
assert.deepEqual(gates.slice(0,59).map(x=>x.entry),oldGates.map(x=>x.entry));
const ledger=newLedger({lane:'node',files:[],excludedFixtures:[]});
assert.throws(()=>appendAttempt(ledger,'synthetic',rows[0].envelope));assert.deepEqual(ledger.attempts,[]);
const report={base,protectedTrackedFiles:oldFiles.filter(p=>!allowed.has(p)).length,oldTestFiles:oldFiles.filter(p=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&p.endsWith('.test.mjs')).length,
 oldGuestRecordsPerLane:212,oldNativeGates:59,newNativeGates:1,selectedFiles:33,variantsPerLane:60,blockedPerLane:60,
 frozenRows:rows.length,frozenSha256:sha(frozen),oldLedgerRejectsV2:true,changedTrackedFiles:changed,coordinatorExcluded:true,
 protectedInventory:oldFiles.filter(p=>!allowed.has(p)).map(path=>({path,sha256:sha(read(path))})),planned};
writeFileSync(new URL('preservation.json',here),JSON.stringify(report,null,2)+'\n');
console.log(`PASS ${report.protectedTrackedFiles} protected files; 212 old records/59 old gates; 33 files/60 variants all blocked; v1 ledger rejects v2`);
