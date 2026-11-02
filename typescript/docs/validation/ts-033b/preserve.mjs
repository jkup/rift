import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../../..'),here=import.meta.dirname,base='f9073a7';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'});
const allowed=['typescript/TASKS.md','typescript/docs/feature-inventory.md','typescript/tools/build-native.mjs','typescript/src/global-environment.ts','typescript/test/global-environment.ts','typescript/test/fixtures/global-environment.txt'];
const changes=git('diff','--name-only',base).trim().split('\n').filter(Boolean);
assert.ok(changes.every(x=>allowed.includes(x)||x.startsWith('typescript/docs/validation/ts-033b/')||x==='typescript/COORDINATION.md'),changes.join('\n'));
const oldBuild=git('show',base+':typescript/tools/build-native.mjs');
assert.equal(readFileSync(join(root,'tools/build-native.mjs'),'utf8').replaceAll('\r\n','\n'),oldBuild.replace('["test/script-metadata.ts", "script-metadata"]]','["test/script-metadata.ts", "script-metadata"], ["test/global-environment.ts", "global-environment"]]'));
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json')));
const oldBuilds=JSON.parse(git('show',base+':typescript/docs/validation/ts-033a/stack-fix/native-build-results.json'));
assert.equal(oldBuilds.length,38);assert.equal(builds.length,39);
assert.deepEqual(builds.slice(0,38).map(x=>x.entry),oldBuilds.map(x=>x.entry));
assert.ok(builds.every(x=>x.verdict==='PASS'));
for(const lane of ['node','native']){
 const records=JSON.parse(readFileSync(join(root,`build/guest-${lane}-results.json`)));
 const old=JSON.parse(git('show',base+`:typescript/docs/validation/ts-033a/stack-fix/guest-${lane}-results.json`));
 assert.equal(records.length,212);assert.deepEqual(records,old,'exact 212 guest records '+lane);
 copyFileSync(join(root,`build/guest-${lane}-results.json`),join(here,`guest-${lane}-results.json`));
}
copyFileSync(join(root,'build/native-build-results.json'),join(here,'native-build-results.json'));
copyFileSync(join(root,'build/probe-results.json'),join(here,'probe-results.json'));
const hashes={};
for(const file of ['src/global-environment.ts','test/global-environment.ts','test/fixtures/global-environment.txt','tools/build-native.mjs','src/script-metadata.ts','src/parser.ts','src/lexer.ts','src/syntax.ts','src/outcomes.ts']) hashes[file]=createHash('sha256').update(readFileSync(join(root,file))).digest('hex');
const report={base,changedTracked:changes,guestCasesPerLane:212,oldGates:38,newGates:1,sourceSha256:hashes};
writeFileSync(join(here,'preservation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
