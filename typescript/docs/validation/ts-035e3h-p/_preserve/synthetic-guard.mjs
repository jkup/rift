import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=resolve(resolve(import.meta.dirname,'../../ts-035e3g-empty-observation/_preserve'),'../../ts-035e3g-empty'),repo=resolve(here,'../../../..'),json=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{cwd:repo,maxBuffer:20000000}).toString();
const preservation=json(join(here,'preservation.json'));assert.equal(preservation.base,'4b5bfa4df1ea22754882cfa88861505706cf982d');
const baseline=git('ls-tree','-rz',preservation.base).split('\0').filter(Boolean).map(r=>{const [head,path]=r.split('\t'),[mode,type,gitOid]=head.split(' ');assert.equal(type,'blob');return {path,mode,gitOid};}).filter(r=>!['typescript/TASKS.md','typescript/COORDINATION.md'].includes(r.path));
assert.deepEqual(baseline,preservation.rows.map(({bytes,sha256,...r})=>r));
function check(r){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
preservation.rows.forEach(check);
const prefix=fs.readFileSync(join(here,'prior-tasks.md'),'utf8');assert.equal(prefix,git('show',preservation.base+':typescript/TASKS.md'));
assert.equal(fs.readFileSync(join(resolve(import.meta.dirname,'../../ts-035e3g-empty-observation/_preserve'),'../guard-tasks.md'),'utf8').replaceAll('\r\n','\n'),prefix+fs.readFileSync(join(here,'task-entry.txt'),'utf8'));
const allowed=p=>p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p.startsWith('typescript/docs/validation/ts-035e3g-empty/')||p.startsWith('typescript/docs/validation/ts-035e3g-empty-observation/')||p.startsWith('typescript/docs/validation/ts-035e3h-p/')||p==='typescript/docs/script-link-observation.md';
for(const p of git('diff','--name-only',preservation.base).trim().split('\n').filter(Boolean))assert(allowed(p),p);
const known=new Set(baseline.map(r=>r.path));for(const p of git('ls-files','-z').split('\0').filter(Boolean))assert(known.has(p)||allowed(p),p);
for(const t of json(join(here,'guard-transformations.json'))){const source=fs.readFileSync(join(repo,t.source));assert.equal(source.length,t.sourceBytes);assert.equal(hash(source),t.sourceSha256);let expected=source.toString();for(const r of t.replacements){assert.equal(expected.split(r.old).length-1,r.count);expected=r.all?expected.replaceAll(r.old,r.next):expected.replace(r.old,r.next);}const actual=fs.readFileSync(join(here,'_preserve',t.name));assert.equal(actual.length,t.bytes);assert.equal(hash(actual),t.sha256);assert.equal(actual.toString(),expected);}
await import('./empty-design-guard.mjs');
const sources=json(join(here,'source-mapping.json'));assert.equal(sources.length,9);
for(const r of sources){check({...r,path:r.source});check({...r,path:r.target});assert.deepEqual(fs.readFileSync(join(repo,r.source)),fs.readFileSync(join(repo,r.target)));}
assert.equal(sources[0].sha256,'b86ec337a171f2c2ffa7987199ffa09c432b5fb4522429d8141398a394236a2c');
assert.equal(sources[1].sha256,'453571321aecf43dcd5e17b88a259f9c30842dc9a66f02295804088b71455a6e');
const tests=json(join(here,'test-results.json'));assert.equal(tests.status,'passed');assert.equal(tests.observations.length,260);assert(tests.observations.every(x=>x.status==='passed'));assert.equal(tests.actualFixtureComparisons,115);assert.equal(tests.realArchiveAdapterInvocations,0);assert.equal(tests.realObjectsInterpreted,0);
const boundaries=json(join(here,'boundary-results.json'));assert.equal(boundaries.status,'passed');assert.equal(boundaries.boundaries.length,8);
const purity=json(join(here,'purity-results.json'));assert.equal(purity.status,'passed');assert.equal(purity.controls.length,96);assert.deepEqual(purity.filesystemCalls,[]);assert(purity.controls.every(x=>x.filesystemCalls===0));assert.equal(purity.embeddedExactBytes,true);assert.equal(purity.frozenArrayAndRows,true);
const mutations=json(join(here,'mutation-results.json'));assert.equal(mutations.status,'passed');assert.equal(mutations.mutants.length,5);assert(mutations.mutants.every(x=>x.intendedAssertionFailed));
for(const r of json(join(here,'filesystem-fixtures.json'))){check(r);const s=fs.lstatSync(join(repo,r.path),{bigint:true});for(const k of ['dev','ino','nlink'])assert.equal(String(s[k]),r[k]);}
const seal=json(join(here,'manifest.json'));seal.forEach(check);const names=[];function walk(dir){for(const n of fs.readdirSync(dir)){const p=join(dir,n),s=fs.lstatSync(p);assert(!s.isSymbolicLink());if(s.isDirectory())walk(p);else{assert(s.isFile()&&s.nlink===1);if(p!==join(here,'manifest.json'))names.push(relative(repo,p).replaceAll('\\','/'));}}}walk(here);assert.deepEqual(names.sort(),seal.map(r=>r.path).sort());
console.log(JSON.stringify({acceptedBaseFiles:preservation.rows.length,acceptedBaseBytes:preservation.rows.reduce((n,r)=>n+r.bytes,0),exactApprovedSources:2,unchangedDependencies:7,syntheticControls:260,fullByteComparisons:115,resourceBoundaries:8,publicZeroIOControls:96,mutantsKilled:5,realArchiveAdapterInvocations:0,realObjectsInterpreted:0,oldSealsUnchanged:true,passed:true}));
