import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectCoff,sha256} from './reader.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..');
const json=p=>JSON.parse(fs.readFileSync(p));
const git=(...a)=>execFileSync('git',['-c','core.longpaths=true',...a],{cwd:repo,maxBuffer:20000000}).toString();
const baseline=json(join(here,'preservation.json'));
assert.equal(baseline.base,'84d6a0541802ca16469ce16399c734e72cd021d9');
assert.deepEqual(baseline.excluded,['typescript/TASKS.md','typescript/COORDINATION.md']);
const baseRows=git('ls-tree','-rz',baseline.base).split('\0').filter(Boolean).map(x=>{const [h,path]=x.split('\t'),[mode,type,gitOid]=h.split(' ');assert.equal(type,'blob');return {path,mode,gitOid};}).filter(r=>!baseline.excluded.includes(r.path));
assert.deepEqual(baseRows,baseline.rows.map(({bytes,sha256,...r})=>r));
function check(r){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(sha256(b),r.sha256,r.path);}
baseline.rows.forEach(check);
const prefix=fs.readFileSync(join(here,'prior-tasks.md'),'utf8');assert.equal(git('show',baseline.base+':typescript/TASKS.md'),prefix);
assert.equal(fs.readFileSync(join(repo,'typescript/TASKS.md'),'utf8').replaceAll('\r\n','\n'),prefix+fs.readFileSync(join(here,'task-entry.txt'),'utf8'));
const allowed=p=>p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p.startsWith('typescript/docs/validation/ts-035e3g/');
for(const p of git('diff','--name-only',baseline.base).trim().split('\n').filter(Boolean))assert(allowed(p),p);
const known=new Set(baseRows.map(r=>r.path));for(const p of git('ls-files','-z').split('\0').filter(Boolean))assert(known.has(p)||allowed(p),p);
for(const t of json(join(here,'guard-transformations.json'))){const b=fs.readFileSync(join(repo,t.source));assert.equal(b.length,t.sourceBytes);assert.equal(sha256(b),t.sourceSha256);let out=b.toString();for(const r of t.changes){assert.equal(out.split(r.old).length-1,r.count);out=r.all?out.replaceAll(r.old,r.next):out.replace(r.old,r.next);}const actual=fs.readFileSync(join(here,'_preserve',t.name));assert.equal(actual.length,t.bytes);assert.equal(sha256(actual),t.sha256);assert.equal(actual.toString(),out);}
const p=join(repo,'typescript/docs/validation/ts-035e3g-p');assert.equal(fs.readFileSync(join(here,'guard-tasks.md'),'utf8'),fs.readFileSync(join(p,'prior-tasks.md'),'utf8')+fs.readFileSync(join(p,'task-entry.txt'),'utf8')+fs.readFileSync(join(p,'correction-1/task-append.txt'),'utf8'));
await import('./_preserve/design-guard.mjs');
json(join(here,'source-identities.json')).forEach(check);
const report=json(join(here,'test-attempt-3.json'));assert.equal(report.status,'passed');assert.equal(report.observations.length,226);assert(report.observations.every(r=>r.status==='passed'));assert.equal(report.realArchiveAdapterInvocations,0);assert.equal(report.realObjectsInterpreted,0);
assert.equal(json(join(here,'test-attempt-1.json')).status,'failed');assert(json(join(here,'test-attempt-1.json')).error.message.includes('EPERM'));
assert.equal(json(join(here,'boundary-results.json')).boundaries.length,8);
for(const f of json(join(p,'correction-1/fixtures.json')).cases)assert.deepEqual(inspectCoff(Buffer.from(f.bytesHex,'hex')),f.expected);
for(const r of json(join(here,'filesystem-fixtures.json'))){check(r);const s=fs.lstatSync(join(repo,r.path),{bigint:true});for(const key of ['dev','ino','nlink'])assert.equal(String(s[key]),r[key]);}
const seal=json(join(here,'manifest.json'));seal.forEach(check);const paths=[];
function walk(dir){for(const n of fs.readdirSync(dir)){const file=join(dir,n),s=fs.lstatSync(file);assert(!s.isSymbolicLink());if(s.isDirectory())walk(file);else{assert(s.isFile()&&s.nlink===1);if(file!==join(here,'manifest.json'))paths.push(relative(repo,file).replaceAll('\\','/'));}}}walk(here);assert.deepEqual(paths.sort(),seal.map(r=>r.path).sort());
console.log(JSON.stringify({acceptedBaseFiles:baseline.rows.length,syntheticTests:226,additionalBoundaries:8,actualFrozenLiteralComparisons:83,realArchiveAdapterInvocations:0,realObjectsInterpreted:0,passed:true}));
