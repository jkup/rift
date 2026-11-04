import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'),repo=resolve(root,'..'),base='3742d71',here=import.meta.dirname;
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024}).trimEnd();
const read=p=>readFileSync(join(repo,p),'utf8').replaceAll('\r\n','\n').trimEnd();
const allowed=['src/script-execution-internal.ts','src/script-record.ts','src/parser.ts','src/script-declarations.ts','src/script-environment.ts','src/global-environment.ts','src/runtime.ts','src/delete-reference.ts','src/script-global-declarations.ts','test/harness-nonstrict.ts','tools/build-native.mjs','TASKS.md','docs/feature-inventory.md'].map(p=>'typescript/'+p);
const owned=p=>allowed.includes(p)||p.startsWith('typescript/docs/validation/ts-034h4/')||p.startsWith('typescript/fixtures/harness-nonstrict/');
const changes=git('diff','--name-only',base).split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changes.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changes.join('\n'));assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedFiles=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md');assert.ok(protectedFiles.every(p=>!changes.includes(p)));
const oldBuild=git('show',base+':typescript/tools/build-native.mjs');assert.equal(read('typescript/tools/build-native.mjs'),oldBuild.replace('["test/harness-for-update.ts", "harness-for-update"]]','["test/harness-for-update.ts", "harness-for-update"], ["test/harness-nonstrict.ts", "harness-nonstrict"]]'));
const marker='### TS-034H4 — Atomic bounded non-strict Script implementation';assert.equal(read('typescript/TASKS.md').split(marker)[0],git('show',base+':typescript/TASKS.md').split(marker)[0]);
for(const [name,hash] of Object.entries(JSON.parse(readFileSync(join(here,'freeze.json'))).files))assert.equal(createHash('sha256').update(readFileSync(join(here,name))).digest('hex'),hash,'frozen '+name);
const manifest=JSON.parse(readFileSync(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json'))),variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
writeFileSync(join(here,'source-preservation.json'),JSON.stringify({base,changes,protectedFiles:protectedFiles.length,oldTestMigrations:0,variants},null,2)+'\n');
console.log('PASS '+protectedFiles.length+' protected files, zero old-test migrations, frozen controls,60 blocked variants');
if(process.argv.includes('--source-only'))process.exit(0);
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json'))),oldBuilds=JSON.parse(git('show',base+':typescript/docs/validation/ts-034h3/native-build-results.json'));assert.equal(oldBuilds.length,52);assert.equal(builds.length,53);assert.deepEqual(builds.slice(0,52).map(r=>r.entry),oldBuilds.map(r=>r.entry));
const coverage=[];for(const row of builds){assert.equal(row.verdict,'PASS',row.entry);for(const r of [row.build,row.coverage]){assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,null);}const report=row.coverage.stdout,a=/statements analyzed\s+(\d+)/.exec(report),s=/compile statically\s+(\d+)\s+\(100%\)/.exec(report);assert.ok(a&&s);assert.equal(a[1],s[1]);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(report));coverage.push({entry:row.entry,static:Number(s[1]),dynamic:0});}
for(const lane of ['node','native']){const records=JSON.parse(readFileSync(join(root,`build/guest-${lane}-results.json`))),old=JSON.parse(git('show',base+`:typescript/docs/validation/ts-034h3/guest-${lane}-results.json`));assert.equal(records.length,212);assert.deepEqual(records,old);copyFileSync(join(root,`build/guest-${lane}-results.json`),join(here,`guest-${lane}-results.json`));}
for(const file of ['native-build-results.json','probe-results.json'])copyFileSync(join(root,'build',file),join(here,file));
writeFileSync(join(here,'preservation.json'),JSON.stringify({base,records:212,oldGates:52,newGates:1,coverage},null,2)+'\n');
writeFileSync(join(here,'final-source-hashes.json'),JSON.stringify(allowed.filter(p=>p.includes('/src/')||p.includes('/test/')||p.includes('/tools/')).map(path=>({path,sha256:createHash('sha256').update(readFileSync(join(repo,path))).digest('hex')})),null,2)+'\n');
console.log('PASS 212 exact records/lane,52+1 static gates');
