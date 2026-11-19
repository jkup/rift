// Read-only accepted-base and design preservation. No COFF parser.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=import.meta.dirname,repo=resolve(here,'../../../..');
const json=p=>JSON.parse(readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const preservation=json(join(here,'preservation.json'));
assert.equal(preservation.base,'903a7e56ef9c081d57662d5bcabb9221d6555389');
assert.deepEqual(preservation.excluded,['typescript/TASKS.md','typescript/COORDINATION.md']);
const git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{cwd:repo,maxBuffer:20000000}).toString();
const baseRows=git('ls-tree','-rz',preservation.base).split('\0').filter(Boolean).map(s=>{const [header,path]=s.split('\t'),[mode,type,gitOid]=header.split(' ');assert.equal(type,'blob');return {path,mode,gitOid};}).filter(r=>!preservation.excluded.includes(r.path));
assert.deepEqual(preservation.rows.map(({bytes,sha256,...r})=>r),baseRows);
for(const r of preservation.rows){const p=join(repo,r.path),s=lstatSync(p);assert(s.isFile()&&!s.isSymbolicLink());const b=readFileSync(p);assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
const prefix=readFileSync(join(here,'prior-tasks.md'),'utf8'),tasks=readFileSync(join(repo,'typescript/TASKS.md'),'utf8').replaceAll('\r\n','\n');assert.equal(git('show',preservation.base+':typescript/TASKS.md'),prefix);assert.equal(tasks,prefix+readFileSync(join(here,'task-entry.txt'),'utf8'));
const allowed=p=>p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p==='typescript/docs/script-object-inventory.md'||p.startsWith('typescript/docs/validation/ts-035e3g-p/');
for(const p of git('diff','--name-only',preservation.base).trim().split('\n').filter(Boolean))assert(allowed(p),'out-of-scope tracked edit '+p);
const priorPaths=new Set(baseRows.map(r=>r.path));for(const p of git('ls-files','-z').split('\0').filter(Boolean))assert(priorPaths.has(p)||allowed(p),'out-of-scope indexed addition '+p);
function check(r){const b=readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
json(join(here,'input-links.json')).forEach(check);
assert(readFileSync(join(here,'ordered-inputs.json')).equals(readFileSync(join(repo,'typescript/docs/validation/ts-035e3f-p/link-info-analysis/ordered-input-literal.json'))));
const transformation=json(join(here,'guard-transform.json'));const priorGuard=readFileSync(join(repo,transformation.source));assert.equal(priorGuard.length,transformation.sourceBytes);assert.equal(hash(priorGuard),transformation.sourceSha256);let transformed=priorGuard.toString();for(const r of transformation.replacements){assert.equal(transformed.split(r.old).length-1,r.count);transformed=r.all?transformed.replaceAll(r.old,r.next):transformed.replace(r.old,r.next);}const exactCopy=readFileSync(join(here,'prior-guard.mjs'));assert.equal(exactCopy.length,transformation.outputBytes);assert.equal(hash(exactCopy),transformation.outputSha256);assert.equal(exactCopy.toString(),transformed);
await import('./prior-guard.mjs');
await import('./check-design.mjs');
const seal=json(join(here,'manifest.json'));seal.forEach(check);
const paths=[];function walk(p){for(const n of readdirSync(p)){const q=join(p,n),s=lstatSync(q);assert(!s.isSymbolicLink());if(s.isDirectory())walk(q);else{assert(s.isFile()&&s.nlink===1);if(q!==join(here,'manifest.json'))paths.push(relative(repo,q).replaceAll('\\','/'));}}}walk(here);paths.push('typescript/docs/script-object-inventory.md');assert.deepEqual(paths.sort(),seal.map(r=>r.path).sort());
console.log(JSON.stringify({baseTrackedFiles:preservation.rows.length,baseBytes:preservation.rows.reduce((n,r)=>n+r.bytes,0),taskBoundaryExact:true,oldSealsUnchanged:true,parserImplemented:false,archivedObjectsInterpreted:0,passed:true}));
