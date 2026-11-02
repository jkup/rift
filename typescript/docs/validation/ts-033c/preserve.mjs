import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'),here=import.meta.dirname,base='abca67a';
const git=(...args)=>execFileSync('git',args,{cwd:resolve(root,'..'),encoding:'utf8'}).trimEnd();
const allowed=['typescript/TASKS.md','typescript/docs/feature-inventory.md','typescript/tools/build-native.mjs','typescript/src/realm.ts','typescript/src/builtins/number.ts','typescript/src/interpreter.ts','typescript/src/observation.ts','typescript/src/evaluator.ts','typescript/test/script-realm-bootstrap.ts'];
const owned=p=>allowed.includes(p)||p.startsWith('typescript/docs/validation/ts-033c/')||p.startsWith('typescript/fixtures/script-realm-bootstrap/');
const changes=git('diff','--name-only',base).split('\n').filter(Boolean);
const untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changes.every(x=>owned(x)||x==='typescript/COORDINATION.md'),changes.join('\n'));
assert.ok(untracked.every(owned),untracked.join('\n'));
const oldBuild=git('show',base+':typescript/tools/build-native.mjs');
assert.equal(readFileSync(join(root,'tools/build-native.mjs'),'utf8').replaceAll('\r\n','\n').trimEnd(),oldBuild.replace('["test/global-environment.ts", "global-environment"]]','["test/global-environment.ts", "global-environment"], ["test/script-realm-bootstrap.ts", "script-realm-bootstrap"]]'));
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json')));
const oldBuilds=JSON.parse(git('show',base+':typescript/docs/validation/ts-033b/native-build-results.json'));
assert.equal(oldBuilds.length,39);assert.equal(builds.length,40);
assert.deepEqual(builds.slice(0,39).map(x=>x.entry),oldBuilds.map(x=>x.entry));
assert.ok(builds.every(x=>x.verdict==='PASS'));
for(const lane of ['node','native']){
 const records=JSON.parse(readFileSync(join(root,`build/guest-${lane}-results.json`)));
 const old=JSON.parse(git('show',base+`:typescript/docs/validation/ts-033b/guest-${lane}-results.json`));
 assert.equal(records.length,212);assert.deepEqual(records,old,'exact 212 guest records '+lane);
 copyFileSync(join(root,`build/guest-${lane}-results.json`),join(here,`guest-${lane}-results.json`));
}
copyFileSync(join(root,'build/native-build-results.json'),join(here,'native-build-results.json'));
copyFileSync(join(root,'build/probe-results.json'),join(here,'probe-results.json'));
const hashes={};
for(const file of allowed.filter(x=>x.startsWith('typescript/src/')||x.startsWith('typescript/test/')).map(x=>x.slice(11))) hashes[file]=createHash('sha256').update(readFileSync(join(root,file))).digest('hex');
const manifest=JSON.parse(readFileSync(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json')));
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
const protectedFiles=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md');
assert.ok(!changes.some(x=>protectedFiles.includes(x)));
const report={base,changedTracked:changes,protectedFiles:protectedFiles.length,guestCasesPerLane:212,oldGates:39,newGates:1,sourceSha256:hashes,variants};
writeFileSync(join(here,'preservation.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS: exact 212 records per lane; 39 old gates plus 1; '+protectedFiles.length+' protected files; 60 variants blocked');


