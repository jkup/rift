import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'), repo=resolve(root,'..'), here=import.meta.dirname, base='31cedae';
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024}).trimEnd();
const allowed=['src/realm.ts','src/builtins/restricted-function.ts','test/script-restricted-properties.ts','test/script-realm-bootstrap.ts','tools/build-native.mjs','TASKS.md','docs/feature-inventory.md'].map(p=>'typescript/'+p);
const owned=p=>allowed.includes(p)||p.startsWith('typescript/docs/validation/ts-033er-b/')||p.startsWith('typescript/fixtures/script-restricted-properties/');
const changes=git('diff','--name-only',base).split('\n').filter(Boolean), untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changes.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changes.join('\n'));assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedFiles=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md');
assert.ok(!changes.some(p=>protectedFiles.includes(p)));
const oldBuild=git('show',base+':typescript/tools/build-native.mjs');
assert.equal(readFileSync(join(root,'tools/build-native.mjs'),'utf8').replaceAll('\r\n','\n').trimEnd(),oldBuild.replace('["test/property-accessors.ts", "property-accessors"]]','["test/property-accessors.ts", "property-accessors"], ["test/script-restricted-properties.ts", "script-restricted-properties"]]'));
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json'))), oldBuilds=JSON.parse(git('show',base+':typescript/docs/validation/ts-033er-a/native-build-results.json'));
assert.equal(oldBuilds.length,47); assert.equal(builds.length,48);assert.deepEqual(builds.slice(0,47).map(r=>r.entry),oldBuilds.map(r=>r.entry));
const coverage=[];
for(const row of builds){
 assert.equal(row.verdict,'PASS');for(const r of [row.build,row.coverage]){assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,null);}
 const report=row.coverage.stdout,a=/statements analyzed\s+(\d+)/.exec(report),s=/compile statically\s+(\d+)\s+\(100%\)/.exec(report);
 assert.ok(a&&s);assert.equal(a[1],s[1]);assert.ok(Number(a[1])>0);assert.match(report,/fully static — all analyzed statements compile to native code\./);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(report));coverage.push({entry:row.entry,static:Number(s[1]),dynamic:0});
}
for(const lane of ['node','native']){const records=JSON.parse(readFileSync(join(root,`build/guest-${lane}-results.json`)));const old=JSON.parse(git('show',base+`:typescript/docs/validation/ts-033er-a/guest-${lane}-results.json`));assert.equal(records.length,212);assert.deepEqual(records,old);copyFileSync(join(root,`build/guest-${lane}-results.json`),join(here,`guest-${lane}-results.json`));}
for(const file of ['native-build-results.json','probe-results.json'])copyFileSync(join(root,'build',file),join(here,file));
const manifest=JSON.parse(readFileSync(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json')));
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
const hashes=allowed.filter(p=>p.includes('/src/')||p.includes('/test/')||p.includes('/tools/')).map(path=>({path,sha256:createHash('sha256').update(readFileSync(join(repo,path))).digest('hex')}));
writeFileSync(join(here,'final-source-hashes.json'),JSON.stringify(hashes,null,2)+'\n');
writeFileSync(join(here,'preservation.json'),JSON.stringify({base,changes,protectedFiles:protectedFiles.length,records:212,oldGates:47,newGates:1,coverage,variants},null,2)+'\n');
console.log(`PASS 212 exact records/lane,47+1 static gates,${protectedFiles.length} protected files,60 blocked variants`);
