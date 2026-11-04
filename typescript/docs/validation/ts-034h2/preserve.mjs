import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'), repo=resolve(root,'..'), here=import.meta.dirname, base='4e01d44';
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024}).trimEnd();
const allowed=['src/syntax.ts','src/parser.ts','src/script-declarations.ts','src/script-execution-internal.ts','test/harness-switch.ts','tools/build-native.mjs','TASKS.md','docs/feature-inventory.md'].map(p=>'typescript/'+p);
const amendedTest='typescript/test/script-execution.ts';
// Coordinator approved exactly these two sites. Compare the entire file, so this
// exception cannot conceal any other changed assertion, label or test behavior.
const oldTest=git('show',base+':'+amendedTest);
const edits=JSON.parse(readFileSync(join(root,'docs/validation/ts-034h2-p/proposed-e4.txt'),'utf8')).edits;
let exactAmendment=oldTest;
for(const edit of edits){assert.equal(exactAmendment.split(edit.old).length,2);exactAmendment=exactAmendment.replace(edit.old,edit.new);}
assert.equal(readFileSync(join(repo,amendedTest),'utf8').replaceAll('\r\n','\n').trimEnd(),exactAmendment);
assert.ok(exactAmendment.includes('id: "H1-empty"'));
assert.ok(exactAmendment.includes('try{}catch(e){}finally{}'));
const owned=p=>p===amendedTest||allowed.includes(p)||p.startsWith('typescript/docs/validation/ts-034h2/')||p.startsWith('typescript/fixtures/harness-switch/');
const changes=git('diff','--name-only',base).split('\n').filter(Boolean), untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changes.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changes.join('\n'));assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedFiles=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md');
assert.ok(!changes.some(p=>protectedFiles.includes(p)));
const oldBuild=git('show',base+':typescript/tools/build-native.mjs');
assert.equal(readFileSync(join(root,'tools/build-native.mjs'),'utf8').replaceAll('\r\n','\n').trimEnd(),oldBuild.replace('["test/harness-catch.ts", "harness-catch"]]','["test/harness-catch.ts", "harness-catch"], ["test/harness-switch.ts", "harness-switch"]]'));
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json'))),oldBuilds=JSON.parse(git('show',base+':typescript/docs/validation/ts-034h1/native-build-results.json'));
assert.equal(oldBuilds.length,50);assert.equal(builds.length,51);assert.deepEqual(builds.slice(0,50).map(r=>r.entry),oldBuilds.map(r=>r.entry));
const coverage=[];
for(const row of builds){
 assert.equal(row.verdict,'PASS');for(const r of [row.build,row.coverage]){assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,null);}
 const report=row.coverage.stdout,a=/statements analyzed\s+(\d+)/.exec(report),s=/compile statically\s+(\d+)\s+\(100%\)/.exec(report);
 assert.ok(a&&s);assert.equal(a[1],s[1]);assert.ok(Number(a[1])>0);assert.match(report,/fully static — all analyzed statements compile to native code\./);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(report));coverage.push({entry:row.entry,static:Number(s[1]),dynamic:0});
}
for(const lane of ['node','native']){const records=JSON.parse(readFileSync(join(root,`build/guest-${lane}-results.json`)));const old=JSON.parse(git('show',base+`:typescript/docs/validation/ts-034h1/guest-${lane}-results.json`));assert.equal(records.length,212);assert.deepEqual(records,old);copyFileSync(join(root,`build/guest-${lane}-results.json`),join(here,`guest-${lane}-results.json`));}
for(const file of ['native-build-results.json','probe-results.json'])copyFileSync(join(root,'build',file),join(here,file));
const manifest=JSON.parse(readFileSync(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json')));
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
const hashes=[...allowed,amendedTest].filter(p=>p.includes('/src/')||p.includes('/test/')||p.includes('/tools/')).map(path=>({path,sha256:createHash('sha256').update(readFileSync(join(repo,path))).digest('hex')}));
writeFileSync(join(here,'final-source-hashes.json'),JSON.stringify(hashes,null,2)+'\n');
writeFileSync(join(here,'preservation.json'),JSON.stringify({base,changes,protectedFiles:protectedFiles.length,exactTwoSiteAmendment:amendedTest,records:212,oldGates:50,newGates:1,coverage,variants},null,2)+'\n');
console.log(`PASS 212 exact records/lane,50+1 static gates,${protectedFiles.length} protected files,60 blocked variants`);

const tasks=git('show',base+':typescript/TASKS.md'),now=readFileSync(join(root,'TASKS.md'),'utf8').replaceAll('\r\n','\n').trimEnd();
const section='### TS-034H2 — Strict Script switch implementation';
assert.equal(now.slice(0,now.indexOf(section)),tasks.slice(0,tasks.indexOf(section)));
for(const [file,hash] of Object.entries(JSON.parse(readFileSync(join(here,'frozen.json'))).files))assert.equal(createHash('sha256').update(readFileSync(join(root,file))).digest('hex'),hash);
