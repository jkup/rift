import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {blockers} from '../../../tools/test262/input.mjs';
const here=import.meta.dirname,root=resolve(here,'../../..'),repo=resolve(root,'..'),base='a578ddc';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:repo,maxBuffer:64*1024*1024});
const manifest=JSON.parse(readFileSync(join(here,'frozen/replacement-manifest.json')));
assert.equal(manifest.files.length,3);assert.equal(manifest.files.reduce((n,f)=>n+f.replacements.length,0),7);
for(const f of manifest.files){const before=git('show',base+':'+f.path);assert.equal(sha(before),f.baseSha256);let text=before.toString();for(const r of [...f.replacements].reverse()){assert.equal(text.slice(r.start,r.end),r.old);text=text.slice(0,r.start)+r.new+text.slice(r.end);}const after=readFileSync(join(repo,f.path));assert.equal(sha(after),f.proposedSha256);assert.equal(after.toString(),text);assert.deepEqual(after,readFileSync(join(here,'../ts-034h6-cp2/proposed',f.path.replace('typescript/',''))));}
const allowed=['src/realm.ts','src/builtins/string.ts','src/builtins/object.ts','test/harness-formatting.ts','tools/build-native.mjs','TASKS.md','docs/feature-inventory.md'].map(f=>'typescript/'+f).concat(manifest.files.map(f=>f.path));
const owned=p=>allowed.includes(p)||p.startsWith('typescript/docs/validation/ts-034h6-c/')||p.startsWith('typescript/test/fixtures/harness-formatting/');
const canonicalBaseline=JSON.parse(readFileSync(join(here,'canonical-baseline-hashes.json')));
let protectedFiles=0,oldTests=0;
for(const [f,h] of Object.entries(JSON.parse(readFileSync(join(here,'baseline-hashes.json'))))){if(owned(f)||f==='typescript/COORDINATION.md')continue;const bytes=readFileSync(join(repo,f));assert.ok(sha(bytes)===h||!bytes.includes(0)&&bytes.equals(Buffer.from(bytes.toString()))&&sha(Buffer.from(bytes.toString().replaceAll('\r\n','\n')))===canonicalBaseline[f],'protected '+f);protectedFiles++;if(f.startsWith('typescript/test/'))oldTests++;}
const changed=git('diff','--name-only',base).toString().trim().split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').toString().trim().split('\n').filter(Boolean);assert.ok(changed.every(f=>owned(f)||f==='typescript/COORDINATION.md'));assert.ok(untracked.every(owned));
for(const [f,h] of Object.entries(JSON.parse(readFileSync(join(here,'freeze.json'))).sha256)){assert.equal(sha(readFileSync(join(here,'frozen',f))),h);assert.equal(sha(readFileSync(join(here,'../ts-034h6-cp2',f))),h);}
const norm=s=>s.replaceAll('\r\n','\n');
for(const [f,marker] of [['string.ts','export type StringCompletion'],['object.ts','export function registerObjectValueOf']]){const old=norm(git('show',base+':typescript/src/builtins/'+f).toString()),now=norm(readFileSync(join(root,'src/builtins',f),'utf8'));assert.equal(now.slice(now.indexOf(marker)),old.slice(old.indexOf(marker)),'legacy methods byte content');}
const oldRealm=norm(git('show',base+':typescript/src/realm.ts').toString()),newRealm=norm(readFileSync(join(root,'src/realm.ts'),'utf8'));assert.equal(newRealm,oldRealm.replace('registerObjectValueOf, registerObjectToString','registerObject, registerObjectValueOf, registerObjectToString').replace('registerStringConversions }','registerString, registerStringConversions }').replace('            registerErrors(this);','            registerErrors(this);\n            registerString(this);\n            registerObject(this);'));
const build=norm(readFileSync(join(root,'tools/build-native.mjs'),'utf8')),oldBuild=norm(git('show',base+':typescript/tools/build-native.mjs').toString());assert.equal(build,oldBuild.replace('["test/harness-map-default.ts", "harness-map-default"]]','["test/harness-map-default.ts", "harness-map-default"], ["test/harness-formatting.ts", "harness-formatting"]]'));
const task=norm(readFileSync(join(root,'TASKS.md'),'utf8')),oldTask=norm(git('show',base+':typescript/TASKS.md').toString());assert.equal(task.split('### TS-034H6-C —')[0],oldTask.split('### TS-034H6-C —')[0]);
const variants=JSON.parse(readFileSync(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json'))).entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length));
writeFileSync(join(here,'source-preservation.json'),JSON.stringify({base,protectedFiles,oldTests,migratedFiles:3,replacements:7,changed,variants},null,2)+'\n');console.log('PASS source protected='+protectedFiles+' oldTests='+oldTests+' exact3files7replacements/60blocked');
if(process.argv.includes('--source-only'))process.exit(0);
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json'))),oldBuilds=JSON.parse(readFileSync(join(here,'../ts-034h6-m/native-build-results.json')));assert.equal(builds.length,58);assert.equal(oldBuilds.length,57);assert.deepEqual(builds.slice(0,57).map(r=>r.entry),oldBuilds.map(r=>r.entry));
const coverage=[];for(const row of builds){assert.equal(row.verdict,'PASS',row.entry);for(const r of [row.build,row.coverage]){assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,null);}const report=row.coverage.stdout,a=/statements analyzed\s+(\d+)/.exec(report),s=/compile statically\s+(\d+)\s+\(100%\)/.exec(report);assert.ok(a&&s);assert.equal(a[1],s[1]);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(report));coverage.push({entry:row.entry,static:Number(s[1]),dynamic:0});}
for(const lane of ['node','native']){const f='guest-'+lane+'-results.json',records=JSON.parse(readFileSync(join(root,'build',f))),old=JSON.parse(readFileSync(join(here,'../ts-034h6-m',f)));assert.equal(records.length,212);assert.deepEqual(records,old);copyFileSync(join(root,'build',f),join(here,f));}
for(const f of ['native-build-results.json','probe-results.json'])copyFileSync(join(root,'build',f),join(here,f));
writeFileSync(join(here,'preservation.json'),JSON.stringify({base,records:212,oldGates:57,newGates:1,coverage},null,2)+'\n');console.log('PASS 212 exact records/lane 57+1 static-only/separate zero-dynamic gates');
