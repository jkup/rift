import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {root} from './baseline.mjs';
const here=process.env.RIFT_METADATA_EVIDENCE??import.meta.dirname, base='1f81bb2f6eae3ffe9efad8e051599db739ef3f71';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'});
const allowed=['typescript/TASKS.md','typescript/docs/feature-inventory.md','typescript/tools/build-native.mjs','typescript/src/script-metadata.ts','typescript/test/script-metadata.ts'];
const changes=git('diff','--name-only',base).trim().split('\n').filter(Boolean);
// The coordinator may update its own file concurrently; record but never edit it.
assert.ok(changes.every(x=>allowed.includes(x)||x.startsWith('typescript/docs/validation/ts-033a/')||x==='typescript/COORDINATION.md'),changes.join('\n'));
const oldBuild=git('show',base+':typescript/tools/build-native.mjs');
assert.equal(readFileSync(join(root,'tools/build-native.mjs'),'utf8').replaceAll('\r\n','\n'),oldBuild.replace('["test/number-radix.ts", "number-radix"]]','["test/number-radix.ts", "number-radix"], ["test/script-metadata.ts", "script-metadata"]]'));
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json')));
const oldBuilds=JSON.parse(git('show',base+':typescript/docs/validation/ts-032b/native-build-results.json'));
assert.equal(oldBuilds.length,37);assert.equal(builds.length,38);
assert.deepEqual(builds.slice(0,37).map(x=>x.entry),oldBuilds.map(x=>x.entry));
assert.ok(builds.every(x=>x.verdict==='PASS'));
for(const lane of ['node','native']){
 const records=JSON.parse(readFileSync(join(root,`build/guest-${lane}-results.json`)));
 const old=JSON.parse(git('show',base+`:typescript/docs/validation/ts-032b/guest-${lane}-results.json`));
 assert.equal(records.length,212);assert.deepEqual(records,old,'exact 212 guest result records '+lane);
 copyFileSync(join(root,`build/guest-${lane}-results.json`),join(here,`guest-${lane}-results.json`));
}
copyFileSync(join(root,'build/native-build-results.json'),join(here,'native-build-results.json'));
copyFileSync(join(root,'build/probe-results.json'),join(here,'probe-results.json'));
const hashes={};
for(const file of ['src/script-metadata.ts','test/script-metadata.ts','tools/build-native.mjs','src/parser.ts','src/lexer.ts','src/syntax.ts','src/outcomes.ts']) hashes[file]=createHash('sha256').update(readFileSync(join(root,file))).digest('hex');
const report={base,changedTracked:changes,coordinatorSha256:createHash('sha256').update(readFileSync(join(root,'COORDINATION.md'))).digest('hex'),guestCasesPerLane:212,oldGates:37,newGates:1,sourceSha256:hashes};
writeFileSync(join(here,'preservation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
