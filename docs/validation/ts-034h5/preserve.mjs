import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'),repo=resolve(root,'..'),base='7f80383',here=import.meta.dirname;
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024}).trimEnd();
const read=p=>readFileSync(join(repo,p),'utf8').replaceAll('\r\n','\n').trimEnd();
const allowed=['src/runtime.ts','src/script-execution-internal.ts','src/syntax.ts','src/parser.ts','src/script-declarations.ts','src/builtins/function.ts','src/symbols.ts','test/script-execution.ts','test/harness-nonstrict.ts','test/harness-construct.ts','test/script-realm-bootstrap.ts','tools/build-native.mjs','TASKS.md','docs/feature-inventory.md'].map(p=>'typescript/'+p);
const owned=p=>allowed.includes(p)||p.startsWith('typescript/docs/validation/ts-034h5/')||p.startsWith('typescript/fixtures/harness-construct/');
const changes=git('diff','--name-only',base).split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changes.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changes.join('\n'));assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedFiles=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md');assert.ok(protectedFiles.every(p=>!changes.includes(p)));
for(const [file,oldText,newText] of [['test/script-execution.ts','\'"use strict";new f();\'','\'"use strict";new f(...xs);\''],['test/harness-nonstrict.ts','"function f(){return 7;}new C();"','"function f(){return 7;}new C(...xs);"']]){
 const path='typescript/'+file,old=git('show',base+':'+path);assert.equal(old.split(oldText).length,2);assert.equal(read(path),old.replace(oldText,newText),file+' exact whole-file migration');
}
const bootstrapMigration=JSON.parse(readFileSync(join(here,'migration-investigation/proposed-migration.json')));
assert.equal(bootstrapMigration.base,base);assert.equal(bootstrapMigration.path,'typescript/test/script-realm-bootstrap.ts');
const baselineBytes=execFileSync('git',['show',base+':'+bootstrapMigration.path],{cwd:repo});
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'),bootstrapMigration.baselineSha256);
let expectedBootstrap=baselineBytes.toString('utf8').replaceAll('\r\n','\n');
for(const [from,to] of bootstrapMigration.changes){assert.equal(expectedBootstrap.split(from).length,2);expectedBootstrap=expectedBootstrap.replace(from,to);}
assert.equal(read(bootstrapMigration.path),expectedBootstrap.trimEnd(),'bootstrap exact whole-file migration');
const marker='### TS-034H5 — Ordinary base Script construction and instanceof';assert.equal(read('typescript/TASKS.md').split(marker)[0],git('show',base+':typescript/TASKS.md').split(marker)[0]);
for(const [name,hash] of Object.entries(JSON.parse(readFileSync(join(here,'freeze.json'))).files))assert.equal(createHash('sha256').update(readFileSync(join(here,name))).digest('hex'),hash,'frozen '+name);
const manifest=JSON.parse(readFileSync(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json'))),variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
writeFileSync(join(here,'source-preservation.json'),JSON.stringify({base,changes,protectedFiles:protectedFiles.length,oldTestMigrations:3,variants},null,2)+'\n');
console.log('PASS '+protectedFiles.length+' protected files, three exact whole-file migrations, frozen controls,60 blocked variants');

if(process.argv.includes('--source-only'))process.exit(0);
const oldBuild=git('show',base+':typescript/tools/build-native.mjs');assert.equal(read('typescript/tools/build-native.mjs'),oldBuild.replace('["test/harness-nonstrict.ts", "harness-nonstrict"]]','["test/harness-nonstrict.ts", "harness-nonstrict"], ["test/harness-construct.ts", "harness-construct"]]'));
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json'))),oldBuilds=JSON.parse(git('show',base+':typescript/docs/validation/ts-034h4/native-build-results.json'));assert.equal(oldBuilds.length,53);assert.equal(builds.length,54);assert.deepEqual(builds.slice(0,53).map(r=>r.entry),oldBuilds.map(r=>r.entry));
const coverage=[];for(const row of builds){assert.equal(row.verdict,'PASS',row.entry);for(const r of [row.build,row.coverage]){assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,null);}const report=row.coverage.stdout,a=/statements analyzed\s+(\d+)/.exec(report),s=/compile statically\s+(\d+)\s+\(100%\)/.exec(report);assert.ok(a&&s);assert.equal(a[1],s[1]);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(report));coverage.push({entry:row.entry,static:Number(s[1]),dynamic:0});}
for(const lane of ['node','native']){const file='guest-'+lane+'-results.json',records=JSON.parse(readFileSync(join(root,'build',file))),old=JSON.parse(git('show',base+':typescript/docs/validation/ts-034h4/'+file));assert.equal(records.length,212);assert.deepEqual(records,old);copyFileSync(join(root,'build',file),join(here,file));}
for(const file of ['native-build-results.json','probe-results.json'])copyFileSync(join(root,'build',file),join(here,file));
writeFileSync(join(here,'preservation.json'),JSON.stringify({base,records:212,oldGates:53,newGates:1,coverage},null,2)+'\n');
writeFileSync(join(here,'final-source-hashes.json'),JSON.stringify(allowed.filter(p=>p.includes('/src/')||p.includes('/test/')||p.includes('/tools/')).map(path=>({path,sha256:createHash('sha256').update(readFileSync(join(repo,path))).digest('hex')})),null,2)+'\n');
console.log('PASS 212 exact records/lane,53+1 static gates');
