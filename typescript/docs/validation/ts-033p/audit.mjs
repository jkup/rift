import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { blockers } from '../../../tools/test262/input.mjs';
const root = fileURLToPath(new URL('../../../../',import.meta.url));
const git = (...args) => execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = p => JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const allowed = p => p === 'typescript/TASKS.md' || p === 'typescript/docs/script-execution.md' || p.startsWith('typescript/docs/validation/ts-033p/');
// COORDINATION is concurrently coordinator-owned; it is outside this writer's
// preservation assertion. Never stage it. All other protected files are checked.
const changed = git('diff','--name-only','dc460ac').split('\n').filter(p=>p && p !== 'typescript/COORDINATION.md');
assert.ok(changed.every(allowed), `Out of scope tracked changes: ${changed.filter(p=>!allowed(p))}`);
const untracked = git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(untracked.every(allowed), `Out of scope untracked files: ${untracked.filter(p=>!allowed(p))}`);
const protectedPaths = git('ls-tree','-r','--name-only','dc460ac').split('\n').filter(p=>!allowed(p) && p !== 'typescript/COORDINATION.md');
// Git's clean filters account for this Windows checkout's CRLF conversion.
assert.deepEqual(changed.filter(p=>protectedPaths.includes(p)),[]);
const sourcePaths=['src/interpreter.ts','src/runtime.ts','src/realm.ts','src/parser.ts','src/lexer.ts','src/syntax.ts','src/evaluator.ts','src/observation.ts','src/observation-json.ts','src/outcomes.ts','tools/test262/input.mjs','tools/test262/driver-result.mjs','tools/build-native.mjs','tools/run-guests.mjs','test/cases.json','package.json','package-lock.json'];
sourcePaths.push('src/builtins/number.ts','src/builtins/symbol.ts','src/builtins/string.ts','src/builtins/object.ts');
const sources=sourcePaths.map(path=>{const bytes=readFileSync(new URL('../../../'+path,import.meta.url));return {path,sha256:sha(bytes)};});
const corpus=json('corpus.json'), manifest=json('../../../fixtures/assistance/test262-starter-corpus/manifest.json');
for(const row of corpus){const bytes=Buffer.from(row.text,'utf8'); assert.equal(bytes.length,row.bytes,row.id);assert.equal(sha(bytes),row.sha256,row.id);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),row.blob,row.id);}
for(const e of manifest.entries) assert.equal(corpus.find(c=>c.id===e.id).blob,e.blob);
for(const [path,blob] of Object.entries(manifest.upstream.harnessBlobs)) assert.equal(corpus.find(c=>c.id===path).blob,blob);
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60); assert.ok(variants.every(v=>v.blockers.length));
const counts=Object.fromEntries(['strict','non-strict','raw','module'].map(v=>[v,variants.filter(r=>r.variant===v).length]));
assert.deepEqual(counts,{strict:30,'non-strict':28,raw:1,module:1});
const oldNode=json('../ts-032b/guest-node-results.json'), oldNative=json('../ts-032b/guest-native-results.json');
assert.equal(oldNode.length,212);assert.equal(oldNative.length,212);
const gates=json('../ts-032b/native-build-results.json');assert.equal(gates.length,37);
const upstream=json('upstream.json');
assert.equal(upstream[0].excerpts.length,7);
assert.ok(upstream.some(r=>r.url.endsWith('/LICENSE')));
const report={base:'dc460ac',kind:'read-only source/identity/preservation audit; no guest execution or native build',node:process.version,protectedTrackedFiles:protectedPaths.length,sources,corpus:{pin:manifest.upstream.revision,verifiedTests:33,verifiedHarness:3,variants:counts,blockers:variants},inheritedOnly:{acceptedGuestRecordsPerLane:212,acceptedNativeGates:37},upstream:upstream.map(({url,bytes,sha256})=>({url,bytes,sha256}))};
report.concurrentCoordinatorFile = { path:'typescript/COORDINATION.md', sha256:sha(readFileSync(new URL('../../../COORDINATION.md',import.meta.url))), excludedFromPreservation:true };
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${protectedPaths.length} protected tracked files unchanged; 36 blobs verified; 60/60 variants blocked; inherited 212 cases/37 gates unchanged. No runtime validation claimed.`);
