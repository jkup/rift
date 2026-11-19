import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'),repo=resolve(root,'..'),base='0b93310',here=import.meta.dirname;
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024}).trimEnd();
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const closure=JSON.parse(readFileSync(join(here,'closure.json'))),manifest=JSON.parse(readFileSync(join(here,'../ts-034h6-bp/replacement-manifest.json')));
const allowed=[...closure.paths.map(p=>'src/'+p),'test/harness-errors-b.ts','tools/build-native.mjs','TASKS.md','docs/feature-inventory.md'].map(p=>'typescript/'+p).concat(manifest.files.map(f=>f.path));
const owned=p=>allowed.includes(p)||p.startsWith('typescript/docs/validation/ts-034h6-b/')||p.startsWith('typescript/fixtures/harness-errors-b/');
const changes=git('diff','--name-only',base).split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changes.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changes.join('\n'));assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedFiles=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md');assert.ok(protectedFiles.every(p=>!changes.includes(p)));
for(const f of manifest.files){assert.equal(sha(join(repo,f.path)),f.afterSha256,'exact proposal '+f.path);assert.deepEqual(readFileSync(join(repo,f.path)),readFileSync(join(here,'../ts-034h6-bp/proposed',f.path.slice(11))));}
assert.equal(manifest.files.length,22);assert.equal(manifest.files.reduce((n,f)=>n+f.replacements.length,0),94);
const marker='### TS-034H6-B —';assert.equal(readFileSync(join(root,'TASKS.md'),'utf8').replaceAll('\r\n','\n').split(marker)[0],git('show',base+':typescript/TASKS.md').split(marker)[0]);
for(const [name,hash] of Object.entries(JSON.parse(readFileSync(join(here,'freeze.json'))).files))assert.equal(sha(join(here,name)),hash,'frozen '+name);
// Recheck all fifty original diagnostics at their originating migrated sites.
const producers=closure.sites.filter(s=>s.action.startsWith('languageFailure'));assert.equal(producers.length,50);
for(const s of producers){const realm=s.realm.startsWith('realm (')?'realm':s.realm;const expected=s.text.replace('failure(','languageFailure('+realm+', ');assert.ok(readFileSync(join(repo,s.path),'utf8').includes(expected),s.path+':'+s.line);}
const production=closure.paths.map(p=>readFileSync(join(root,'src',p),'utf8')).join('\n');
assert.equal([...production.matchAll(/\blanguageFailure\(/g)].length,52); // 50 migrated + definition + new toString receiver.
for(const name of ['toNumber','toString','toUint32','toIntegerOrInfinity','toLength','thisNumberValue','thisStringValue','thisBooleanValue','thisSymbolValue'])
 assert.match(production,new RegExp('export function '+name+'\\([^\\n]*loc: Location, realm: Realm \\| null\\)'));
const variants=JSON.parse(readFileSync(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json'))).entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
writeFileSync(join(here,'source-preservation.json'),JSON.stringify({base,changes,protectedFiles:protectedFiles.length,unchangedOldTests:protectedFiles.filter(p=>p.startsWith('typescript/test/')).length,migratedFiles:22,replacements:94,languageProducers:50,variants},null,2)+'\n');
console.log('PASS '+protectedFiles.length+' protected files,22 exact proposals/94 replacements,50 producers,60 blocked variants');
if(process.argv.includes('--source-only'))process.exit(0);
const normalize=s=>s.replaceAll('\r\n','\n').trimEnd();const oldBuild=git('show',base+':typescript/tools/build-native.mjs');assert.equal(normalize(readFileSync(join(root,'tools/build-native.mjs'),'utf8')),normalize(oldBuild.replace('["test/harness-errors-a.ts", "harness-errors-a"]]','["test/harness-errors-a.ts", "harness-errors-a"], ["test/harness-errors-b.ts", "harness-errors-b"]]')));
const builds=JSON.parse(readFileSync(join(root,'build/native-build-results.json'))),oldBuilds=JSON.parse(readFileSync(join(here,'../ts-034h6-a/native-build-results.json')));assert.equal(oldBuilds.length,55);assert.equal(builds.length,56);assert.deepEqual(builds.slice(0,55).map(r=>r.entry),oldBuilds.map(r=>r.entry));
const coverage=[];for(const row of builds){assert.equal(row.verdict,'PASS',row.entry);for(const r of [row.build,row.coverage]){assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,null);}const report=row.coverage.stdout,a=/statements analyzed\s+(\d+)/.exec(report),s=/compile statically\s+(\d+)\s+\(100%\)/.exec(report);assert.ok(a&&s);assert.equal(a[1],s[1]);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(report));coverage.push({entry:row.entry,static:Number(s[1]),dynamic:0});}
for(const lane of ['node','native']){const file='guest-'+lane+'-results.json',records=JSON.parse(readFileSync(join(root,'build',file))),old=JSON.parse(readFileSync(join(here,'../ts-034h6-a',file)));assert.equal(records.length,212);assert.deepEqual(records,old);copyFileSync(join(root,'build',file),join(here,file));}
for(const file of ['native-build-results.json','probe-results.json'])copyFileSync(join(root,'build',file),join(here,file));
writeFileSync(join(here,'preservation.json'),JSON.stringify({base,records:212,oldGates:55,newGates:1,coverage},null,2)+'\n');
writeFileSync(join(here,'final-source-hashes.json'),JSON.stringify(allowed.filter(p=>p.includes('/src/')||p.includes('/test/')||p.includes('/tools/')).map(path=>({path,sha256:sha(join(repo,path))})),null,2)+'\n');
console.log('PASS 212 exact records/lane,55+1 static-only and zero-dynamic gates');
