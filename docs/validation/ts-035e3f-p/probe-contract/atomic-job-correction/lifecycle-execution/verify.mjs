// Read-only preservation and archive checks. No compiler or lifecycle execution.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const here=import.meta.dirname,correction=resolve(here,'..'),contract=resolve(here,'../..'),original=resolve(here,'../../..'),repo=resolve(here,'../../../../../../..');
const doc='typescript/docs/script-build-provenance.md',json=p=>JSON.parse(readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
function check(r){const b=readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
function prefix(r,saved){const b=readFileSync(saved);assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);assert(readFileSync(join(repo,doc)).subarray(0,b.length).equals(b));}
function paths(base,skip){const out=[];function walk(p){for(const n of readdirSync(p).sort()){const q=join(p,n);if(q===skip)continue;const s=lstatSync(q);assert(!s.isSymbolicLink());if(s.isDirectory())walk(q);else{assert(s.isFile()&&s.nlink===1);out.push(relative(repo,q).replaceAll('\\','/'));}}}walk(base);return out.sort();}
const baseline=json(join(original,'preservation.json'));baseline.forEach(check);
json(join(here,'prior-manifests.json')).forEach(check);
json(join(contract,'prior-seals.json')).rows.forEach(check);
check(json(join(correction,'seal-links.json')).parentGuard);
const levels=[
 [original,contract,'artifact-manifest.json',join(contract,'original-design.md')],
 [contract,correction,'guard-manifest.json',join(correction,'prior-design.md')],
 [correction,here,'correction-manifest.json',join(here,'prior-design.md')]
];
const counts=[];
for(const [base,skip,name,saved] of levels){const rows=json(join(base,name));counts.push(rows.length);for(const r of rows)r.path===doc?prefix(r,saved):check(r);assert.deepEqual(paths(base,skip),rows.filter(r=>r.path!==doc).map(r=>r.path).concat(relative(repo,join(base,name)).replaceAll('\\','/')).sort());}
const inventory=json(join(here,'inventory.json')),files=JSON.parse(gunzipSync(readFileSync(join(here,'attempt-files.json.gz'))));
assert.deepEqual(files.map(({base64,...r})=>r),inventory.files);assert.equal(files.length,163);
const map=new Map();for(const r of files){assert(!map.has(r.path));assert(!r.path.startsWith('/')&&!r.path.split('/').includes('..'));const b=Buffer.from(r.base64,'base64');assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);map.set(r.path,b);}
const archived=p=>JSON.parse(map.get(p));
const rows=archived('failed-results.json'),plan=json(join(correction,'lifecycle-cases.json'));
assert.deepEqual(archived('plan.json'),plan);assert.equal(rows.length,11);
for(let i=0;i<rows.length;i++){
 const r=rows[i];assert.equal(r.id,plan[i].id);assert.deepEqual(r.expectation,plan[i]);assert.deepEqual(archived(r.id+'/result.json'),r);
 assert.equal(r.emptyBeforeSafety,true);assert.deepEqual(r.membersBeforeSafety,[]);assert.equal(r.safetyCleanup,false);
 assert.equal(r.status,i===10?'failed-stop-review':'matched-future-literal');
 for(const s of archived(r.id+'/copied-source-identities.json')){const b=map.get(r.id+'/'+s.path);assert.equal(hash(b),s.sha256);assert.equal(b.length,s.bytes);const source=s.path==='supervisor-under-test.cs'?'supervisor.lifecycle.cs':s.path;assert(b.equals(readFileSync(join(correction,source))));}
}
assert(map.get('observer.cs').equals(readFileSync(join(correction,'observer.cs'))));
assert(map.get('membership-false/result.json').equals(readFileSync(join(here,'failed-result.json'))));
assert.deepEqual(rows[10].errors,['inner cleanup unconfirmed']);assert.equal(rows[10].statusData.CleanupConfirmed,false);
assert.equal(rows[10].statusData.Resumed,false);assert.equal(rows[10].statusData.NativeExitCode,null);
assert(rows[10].statusData.Errors.some(s=>s.includes('Win32Exception (5): terminate-unverified-root')));
assert(!files.some(r=>plan.slice(11).some(c=>r.path.startsWith(c.id+'/'))));
const replacement=json(join(here,'source-replacement.json'));
for(const name of replacement.files){const before=readFileSync(join(correction,name),'utf8');assert.equal(before.split(replacement.old).length,2);assert.equal(readFileSync(join(here,'proposed-'+name),'utf8'),before.replace(replacement.old,replacement.next));}
const build=join(repo,inventory.root);
if(process.argv.includes('--check-original-build')){assert(existsSync(build));assert.deepEqual(paths(build),files.map(r=>inventory.root+'/'+r.path).sort());for(const r of files){assert.equal(hash(readFileSync(join(build,r.path))),r.sha256);}assert(readFileSync(join(repo,'typescript/build/ts035e3fp-lifecycle-attempt.log')).equals(readFileSync(join(here,'attempt.log'))));}
const heading='### TS-035E3f-P - Controlled build-input provenance design';
const prior=execFileSync('git',['show','629def3aef75594fd7db2f0bb77b3b242ba8dac1:typescript/TASKS.md'],{cwd:repo,encoding:'utf8'}).replaceAll('\r\n','\n');
const task=readFileSync(join(repo,'typescript/TASKS.md'),'utf8').replaceAll('\r\n','\n');assert.equal(task.split(heading)[0],prior.split(heading)[0]);
const suffix=s=>{const i=s.indexOf('\n### ',s.indexOf(heading)+heading.length);return i<0?'':s.slice(i);};assert.equal(suffix(task),suffix(prior));
const seal=json(join(here,'manifest.json'));seal.forEach(check);
assert.deepEqual(paths(here).filter(p=>!p.endsWith('/manifest.json')).concat(doc).sort(),seal.map(r=>r.path).sort());
console.log(JSON.stringify({baseline:baseline.length,priorSealedRows:counts,archiveFiles:files.length,archiveBytes:files.reduce((n,r)=>n+r.bytes,0),matched:10,failed:1,unrun:14,outerEmptyBeforeFallback:11,sourceProposalsChecked:2,lifecycleRetries:0,passed:true}));
