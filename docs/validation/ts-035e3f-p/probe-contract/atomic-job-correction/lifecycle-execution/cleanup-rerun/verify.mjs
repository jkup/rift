// Read-only preservation and archive checks. No compiler or lifecycle execution.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const here=resolve(import.meta.dirname,'..'),correction=resolve(here,'..'),contract=resolve(here,'../..'),original=resolve(here,'../../..'),repo=resolve(here,'../../../../../../..');
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
const seal=json(join(here,'manifest.json'));for(const r of seal)r.path===doc?prefix(r,join(import.meta.dirname,'prior-design.md')):check(r);
assert.deepEqual(paths(here,import.meta.dirname).filter(p=>!p.endsWith('/manifest.json')).concat(doc).sort(),seal.map(r=>r.path).sort());
console.log(JSON.stringify({baseline:baseline.length,priorSealedRows:counts,archiveFiles:files.length,archiveBytes:files.reduce((n,r)=>n+r.bytes,0),matched:10,failed:1,unrun:14,outerEmptyBeforeFallback:11,sourceProposalsChecked:2,lifecycleRetries:0,passed:true}));
// New layer checks the authorized rerun without changing any earlier verifier.
const current=import.meta.dirname;check(json(join(current,'prior-manifest.json')));
const freshInventory=json(join(current,'inventory.json')),freshFiles=JSON.parse(gunzipSync(readFileSync(join(current,'attempt-files.json.gz'))));
assert.deepEqual(freshFiles.map(({base64,...r})=>r),freshInventory.files);
const freshMap=new Map();for(const r of freshFiles){assert(!freshMap.has(r.path));assert(!r.path.startsWith('/')&&!r.path.split('/').includes('..'));const b=Buffer.from(r.base64,'base64');assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);freshMap.set(r.path,b);}
const freshJson=p=>JSON.parse(freshMap.get(p)),freshRows=freshJson('failed-results.json');
assert.equal(freshRows.length,14);assert.deepEqual(freshJson('plan.json'),plan);
const transformations=json(join(current,'reviewed-inputs/transformations.json')).transformations;
assert.equal(transformations.length,11);
for(const t of transformations){const before=readFileSync(join(correction,t.name));assert.equal(hash(before),t.originalSha256);assert.equal(before.length,t.originalBytes);let expected=before.toString();for(const r of t.replacements){assert.equal(expected.split(r.old).length,2);expected=expected.replace(r.old,r.next);}const actual=readFileSync(join(current,'reviewed-inputs',t.name));assert.equal(hash(actual),t.sha256);assert.equal(actual.length,t.bytes);assert(actual.equals(Buffer.from(expected)));if(t.name==='supervisor.cs'||t.name==='supervisor.lifecycle.cs')assert(actual.equals(readFileSync(join(here,'proposed-'+t.name))));}
assert.equal(transformations.filter(t=>t.replacements.length===0).length,8);
assert.equal(transformations.find(t=>t.name==='lifecycle-runner.ps1').replacements.length,2);
for(let i=0;i<freshRows.length;i++){
 const r=freshRows[i];assert.equal(r.id,plan[i].id);assert.deepEqual(r.expectation,plan[i]);assert.deepEqual(freshJson(r.id+'/result.json'),r);
 assert.equal(r.status,i===13?'failed-stop-review':'matched-future-literal');
 if(i<13){assert.equal(r.emptyBeforeSafety,true);assert.deepEqual(r.membersBeforeSafety,[]);assert.equal(r.safetyCleanup,false);assert.equal(r.statusData.CleanupConfirmed,true);}
 for(const identity of freshJson(r.id+'/copied-source-identities.json')){const b=freshMap.get(r.id+'/'+identity.path);assert.equal(hash(b),identity.sha256);assert.equal(b.length,identity.bytes);const name=identity.path==='supervisor-under-test.cs'?'supervisor.lifecycle.cs':identity.path;assert(b.equals(readFileSync(join(current,'reviewed-inputs',name))));}
}
const last=freshRows[13];assert.equal(last.id,'stdout-read-error');assert.equal(last.safetyCleanup,true);assert.equal(last.emptyBeforeSafety,null);assert.equal(last.membersBeforeSafety,null);assert.equal(last.statusData,null);assert.equal(last.errors.length,1);assert(last.errors[0].includes('because it is being used by another process'));assert(freshMap.get('stdout-read-error/result.json').equals(readFileSync(join(current,'failed-result.json'))));
assert(!freshFiles.some(r=>plan.slice(14).some(c=>r.path.startsWith(c.id+'/'))));
assert(!freshMap.has('stdout-read-error/status.json'));assert(!freshMap.has('stdout-read-error/release-after-resume.txt'));
assert(freshRows[10].statusData.Errors.some(e=>e.includes('Win32Exception (5): terminate-unverified-root')));assert.equal(freshRows[10].statusData.FinalActiveProcesses,0);assert.equal(freshRows[10].statusData.Resumed,false);
assert(freshMap.get('observer.cs').equals(readFileSync(join(correction,'observer.cs'))));
for(const r of json(join(current,'checkpoint-replacement-final.json')).changes){const before=readFileSync(r.name==='test-hooks.cs'?join(correction,r.name):join(current,'reviewed-inputs',r.name),'utf8');assert.equal(before.split(r.old).length,2);assert.equal(readFileSync(join(current,'proposed-'+r.name),'utf8'),before.replace(r.old,r.next));}
if(process.argv.includes('--check-original-build')){const b=join(repo,freshInventory.root);assert.deepEqual(paths(b),freshFiles.map(r=>freshInventory.root+'/'+r.path).sort());for(const r of freshFiles)assert.equal(hash(readFileSync(join(b,r.path))),r.sha256);assert(readFileSync(join(repo,'typescript/build/ts035e3fp-lifecycle-cleanup-attempt.log')).equals(readFileSync(join(current,'attempt.log'))));for(const n of readdirSync(join(current,'reviewed-inputs')))assert(readFileSync(join(current,'reviewed-inputs',n)).equals(readFileSync(join(repo,'typescript/build/ts035e3fp-cleanup-reviewed-inputs',n))));}
const currentSeal=json(join(current,'manifest.json'));currentSeal.forEach(check);assert.deepEqual(paths(current).filter(p=>p!==relative(repo,join(current,'manifest.json')).replaceAll('\\','/')).concat(doc).sort(),currentSeal.map(r=>r.path).sort());
console.log(JSON.stringify({rerunFiles:freshFiles.length,rerunBytes:freshFiles.reduce((n,r)=>n+r.bytes,0),matched:13,failed:1,unrun:11,outerEmptyBeforeFallback:13,safetyCleanupReturnedSuccessfully:1,sourceTransformations:11,checkpointProposalsUnexecuted:3,scriptcInvocations:0,passed:true}));
