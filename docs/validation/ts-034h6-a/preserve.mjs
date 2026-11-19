import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'),repo=resolve(root,'..'),base='fdac41d0754a838197fe828a5f11c819314f9a01',here=import.meta.dirname;
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024}).trimEnd();
const read=p=>readFileSync(join(repo,p),'utf8').replaceAll('\r\n','\n').trimEnd();
const allowed=['src/runtime.ts','src/realm.ts','src/builtins/object.ts','test/harness-errors-a.ts','tools/build-native.mjs','TASKS.md','docs/feature-inventory.md'].map(p=>'typescript/'+p);
const owned=p=>allowed.includes(p)||p.startsWith('typescript/docs/validation/ts-034h6-a/')||p.startsWith('typescript/fixtures/harness-errors-a/');
const changes=git('diff','--name-only',base).split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changes.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changes.join('\n'));assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedFiles=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md');assert.ok(protectedFiles.every(p=>!changes.includes(p)));
const oldTests=protectedFiles.filter(p=>p.startsWith('typescript/test/'));assert.ok(oldTests.length>50);
const marker='### TS-034H6-A — Internal Error allocation kernel';assert.equal(read('typescript/TASKS.md').split(marker)[0],git('show',base+':typescript/TASKS.md').split(marker)[0]);
for(const [name,hash] of Object.entries(JSON.parse(readFileSync(join(here,'freeze.json'))).files))assert.equal(createHash('sha256').update(readFileSync(join(here,name))).digest('hex'),hash,'frozen '+name);
const manifest=JSON.parse(readFileSync(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json'))),variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
writeFileSync(join(here,'source-preservation.json'),JSON.stringify({base,changes,protectedFiles:protectedFiles.length,oldTests:oldTests.length,oldTestMigrations:0,variants},null,2)+'\n');
console.log('PASS '+protectedFiles.length+' protected files, '+oldTests.length+' unchanged old tests,60 blocked variants');
if(process.argv.includes('--source-only'))process.exit(0);
const oldBuild=git('show',base+':typescript/tools/build-native.mjs');assert.equal(read('typescript/tools/build-native.mjs'),oldBuild.replace('["test/harness-construct.ts", "harness-construct"]]','["test/harness-construct.ts", "harness-construct"], ["test/harness-errors-a.ts", "harness-errors-a"]]'));
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json'))),oldBuilds=JSON.parse(git('show',base+':typescript/docs/validation/ts-034h5/native-build-results.json'));assert.equal(oldBuilds.length,54);assert.equal(builds.length,55);assert.deepEqual(builds.slice(0,54).map(r=>r.entry),oldBuilds.map(r=>r.entry));
const coverage=[];for(const row of builds){assert.equal(row.verdict,'PASS',row.entry);for(const r of [row.build,row.coverage]){assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,null);}const report=row.coverage.stdout,a=/statements analyzed\s+(\d+)/.exec(report),s=/compile statically\s+(\d+)\s+\(100%\)/.exec(report);assert.ok(a&&s);assert.equal(a[1],s[1]);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(report));coverage.push({entry:row.entry,static:Number(s[1]),dynamic:0});}
for(const lane of ['node','native']){const file='guest-'+lane+'-results.json',records=JSON.parse(readFileSync(join(root,'build',file))),old=JSON.parse(git('show',base+':typescript/docs/validation/ts-034h5/'+file));assert.equal(records.length,212);assert.deepEqual(records,old);copyFileSync(join(root,'build',file),join(here,file));}
for(const file of ['native-build-results.json','probe-results.json'])copyFileSync(join(root,'build',file),join(here,file));
writeFileSync(join(here,'preservation.json'),JSON.stringify({base,records:212,oldGates:54,newGates:1,coverage},null,2)+'\n');
writeFileSync(join(here,'final-source-hashes.json'),JSON.stringify(allowed.filter(p=>p.includes('/src/')||p.includes('/test/')||p.includes('/tools/')).map(path=>({path,sha256:createHash('sha256').update(readFileSync(join(repo,path))).digest('hex')})),null,2)+'\n');
console.log('PASS 212 exact records/lane,54+1 static gates');
