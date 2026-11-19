// Read-only preservation and archive checks. No compiler or lifecycle execution.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const here=resolve(resolve(resolve(resolve(import.meta.dirname,'..'),'..'),'..'),'..'),correction=resolve(here,'..'),contract=resolve(here,'../..'),original=resolve(here,'../../..'),repo=resolve(here,'../../../../../../..');
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
const seal=json(join(here,'manifest.json'));for(const r of seal)r.path===doc?prefix(r,join(resolve(resolve(resolve(import.meta.dirname,'..'),'..'),'..'),'prior-design.md')):check(r);
assert.deepEqual(paths(here,resolve(resolve(resolve(import.meta.dirname,'..'),'..'),'..')).filter(p=>!p.endsWith('/manifest.json')).concat(doc).sort(),seal.map(r=>r.path).sort());
console.log(JSON.stringify({baseline:baseline.length,priorSealedRows:counts,archiveFiles:files.length,archiveBytes:files.reduce((n,r)=>n+r.bytes,0),matched:10,failed:1,unrun:14,outerEmptyBeforeFallback:11,sourceProposalsChecked:2,lifecycleRetries:0,passed:true}));
// New layer checks the authorized rerun without changing any earlier verifier.
const current=resolve(resolve(resolve(import.meta.dirname,'..'),'..'),'..');check(json(join(current,'prior-manifest.json')));
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
const currentSeal=json(join(current,'manifest.json'));for(const r of currentSeal)r.path===doc?prefix(r,join(resolve(resolve(import.meta.dirname,'..'),'..'),'prior-design.md')):check(r);assert.deepEqual(paths(current,resolve(resolve(import.meta.dirname,'..'),'..')).filter(p=>p!==relative(repo,join(current,'manifest.json')).replaceAll('\\','/')).concat(doc).sort(),currentSeal.map(r=>r.path).sort());
console.log(JSON.stringify({rerunFiles:freshFiles.length,rerunBytes:freshFiles.reduce((n,r)=>n+r.bytes,0),matched:13,failed:1,unrun:11,outerEmptyBeforeFallback:13,safetyCleanupReturnedSuccessfully:1,sourceTransformations:11,checkpointProposalsUnexecuted:3,scriptcInvocations:0,passed:true}));
// Design-only descendant publication and remaining-case runner guard.
const design=resolve(resolve(import.meta.dirname,'..'),'..');check(json(join(design,'prior-manifest.json')));
const designRows=json(join(design,'transformations.json')).rows;assert.equal(designRows.length,11);
for(const r of designRows){const before=readFileSync(join(repo,r.source));assert.equal(before.length,r.sourceBytes);assert.equal(hash(before),r.sourceSha256);let expected=before.toString();for(const x of r.replacements){assert.equal(expected.split(x.old).length,2);expected=expected.replace(x.old,x.next);}const actual=readFileSync(join(design,r.name));assert.equal(actual.length,r.bytes);assert.equal(hash(actual),r.sha256);assert(actual.equals(Buffer.from(expected)));}
assert.equal(designRows.filter(r=>r.replacements.length!==0).length,2);
assert.deepEqual(designRows.filter(r=>r.replacements.length!==0).map(r=>[r.name,r.replacements.length]),[['benign-child.mjs',2],['lifecycle-runner.ps1',2]]);
for(const n of ['supervisor.lifecycle.cs','supervisor.legacy-control.cs','test-hooks.cs'])assert(readFileSync(join(design,n)).equals(readFileSync(join(current,'proposed-'+n))));
assert(readFileSync(join(design,'supervisor.cs')).equals(readFileSync(join(current,'reviewed-inputs/supervisor.cs'))));
const remaining=json(join(design,'lifecycle-cases.json'));assert.deepEqual(remaining,plan.slice(13));
assert.deepEqual(remaining.map(c=>c.id),['stdout-read-error','output-file-exists','death-before-create','death-after-create','death-membership','death-before-resume','death-after-resume','death-with-descendant','creation-race-0ms','creation-race-1ms','creation-race-5ms','legacy-gap-control']);
const designPlan=json(join(design,'plan.json'));assert.deepEqual(designPlan.caseIds,remaining.map(c=>c.id));assert.deepEqual(designPlan.caseOrdinals,[14,15,16,17,18,19,20,21,22,23,24,25]);assert.equal(designPlan.completedLifecycleInvocationsThisDesign,0);assert.equal(designPlan.compilerInvocations,0);
const runner=readFileSync(join(design,'lifecycle-runner.ps1'),'utf8');assert(runner.includes("$root='"+designPlan.root+"'"));assert(runner.includes("& $contract.node (Join-Path $here 'verify.mjs') --check-original-build --preflight"));
const syntax=json(join(design,'syntax-results.json'));assert.equal(syntax.nodeExitCode,0);assert.deepEqual(syntax.powershellErrors,[]);assert.equal(syntax.csharpCompilations,0);assert.equal(syntax.lifecycleInvocations,0);
if(false /* historical preflight: its output root is now occupied */){assert(!existsSync(designPlan.root),'occupied future output root');const tools=json(join(design,'contract.json'));for(const [p,sha]of [[tools.node,tools.nodeSha256],[tools.supervisor,tools.supervisorSha256]])assert.equal(hash(readFileSync(p)),sha);}
const designSeal=json(join(design,'manifest.json'));for(const r of designSeal)r.path===doc?prefix(r,join(resolve(import.meta.dirname,'..'),'prior-design.md')):check(r);assert.deepEqual(paths(design,resolve(import.meta.dirname,'..')).filter(p=>p!==relative(repo,join(design,'manifest.json')).replaceAll('\\','/')).concat(doc).sort(),designSeal.map(r=>r.path).sort());
console.log(JSON.stringify({designSourceTransformations:11,exactRemainingCases:12,approvedCheckpointSourcesUnchanged:3,supervisorCleanupUnchanged:true,lifecycleInvocations:0,scriptcInvocations:0,passed:true}));
// Actual runtime evidence for the one authorized cases14–25 invocation.
const run=resolve(import.meta.dirname,'..');check(json(join(run,'prior-manifest.json')));
const inv=json(join(run,'inventory.json')),entries=JSON.parse(gunzipSync(readFileSync(join(run,'attempt-files.json.gz'))));assert.deepEqual(entries.map(({base64,...r})=>r),inv.files);assert.equal(entries.length,108);
const data=new Map();for(const r of entries){assert(!data.has(r.path));assert(!r.path.startsWith('/')&&!r.path.split('/').includes('..'));const b=Buffer.from(r.base64,'base64');assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);data.set(r.path,b);}
const parse=p=>JSON.parse(data.get(p)),actualRows=parse('failed-results.json');assert.equal(actualRows.length,8);assert.deepEqual(parse('plan.json'),remaining);
for(let i=0;i<actualRows.length;i++){const r=actualRows[i];assert.equal(r.id,remaining[i].id);assert.deepEqual(r.expectation,remaining[i]);assert.deepEqual(parse(r.id+'/result.json'),r);assert.equal(r.status,i===7?'failed-stop-review':'matched-future-literal');if(i<7){assert.equal(r.emptyBeforeSafety,true);assert.deepEqual(r.membersBeforeSafety,[]);assert.equal(r.safetyCleanup,false);}for(const s of parse(r.id+'/copied-source-identities.json')){const b=data.get(r.id+'/'+s.path);assert.equal(hash(b),s.sha256);assert.equal(b.length,s.bytes);assert(b.equals(readFileSync(join(design,s.path==='supervisor-under-test.cs'?'supervisor.lifecycle.cs':s.path))));}}
assert(data.get('observer.cs').equals(readFileSync(join(design,'observer.cs'))));
const failure=actualRows[7];assert.deepEqual(failure.errors,['descendant not independently present']);assert.equal(failure.safetyCleanup,true);assert.equal(failure.emptyBeforeSafety,null);assert.equal(failure.membersBeforeSafety,null);assert.equal(failure.statusData,null);assert.deepEqual(failure.membersBeforeKill,[28800,568]);assert.equal(failure.supervisorPid,28800);assert.equal(failure.childMarker,'33336\n');assert.equal(data.get('death-with-descendant/descendant-pid.txt').toString(),'3272\n');assert(!failure.membersBeforeKill.includes(3272));assert(!data.has('death-with-descendant/leaf-started.json'));assert(!data.has('death-with-descendant/status.json'));assert(!data.has('death-with-descendant/release-after-resume.txt'));assert.equal(data.get('death-with-descendant/compiler.stderr.bin').length,0);
assert(data.get('death-with-descendant/result.json').equals(readFileSync(join(run,'failed-result.json'))));assert(!entries.some(r=>remaining.slice(8).some(c=>r.path.startsWith(c.id+'/'))));
const pairNames=['death-with-descendant/descendant-pid.txt','death-with-descendant/descendant-pid.txt.pending'],pair=pairNames.map(p=>entries.find(r=>r.path===p));
assert.deepEqual(entries.filter(r=>r.nlink!=='1').map(r=>r.path).sort(),pairNames.slice().sort());for(const r of pair){assert.equal(r.nlink,'2');assert.equal(r.dev,pair[0].dev);assert.equal(r.ino,pair[0].ino);assert.equal(r.base64,pair[0].base64);}assert.deepEqual(json(join(run,'hardlink-pair.json')),pair.map(({base64,...r})=>({...r,hex:Buffer.from(base64,'base64').toString('hex')})));
if(process.argv.includes('--check-original-build')){const root=join(repo,inv.root),found=[];function scan(p){for(const n of readdirSync(p)){const q=join(p,n),s=lstatSync(q,{bigint:true});assert(!s.isSymbolicLink());if(s.isDirectory())scan(q);else{assert(s.isFile());const name=relative(root,q).replaceAll('\\','/');found.push(name);const r=entries.find(r=>r.path===name);assert(r);assert.equal(String(s.dev),r.dev);assert.equal(String(s.ino),r.ino);assert.equal(String(s.nlink),r.nlink);assert.equal(hash(readFileSync(q)),r.sha256);}}}scan(root);assert.deepEqual(found.sort(),entries.map(r=>r.path).sort());assert(readFileSync(join(repo,'typescript/build/ts035e3fp-lifecycle-publication-attempt.log')).equals(readFileSync(join(run,'attempt.log'))));}
const runSeal=json(join(run,'manifest.json'));for(const r of runSeal)r.path===doc?prefix(r,join(import.meta.dirname,'prior-design.md')):check(r);assert.deepEqual(paths(run,import.meta.dirname).filter(p=>p!==relative(repo,join(run,'manifest.json')).replaceAll('\\','/')).concat(doc).sort(),runSeal.map(r=>r.path).sort());
console.log(JSON.stringify({runtimeFiles:entries.length,runtimeBytes:entries.reduce((n,r)=>n+r.bytes,0),matched:7,failed:1,unrun:4,outerEmptyBeforeFallback:7,safetyCleanupReturnedSuccessfully:1,exactHardlinkAliases:2,scriptcInvocations:0,passed:true}));
// New design layer: source reproduction and full case objects only.
const proposal=import.meta.dirname;check(json(join(proposal,'prior-manifest.json')));
const proposalRows=json(join(proposal,'transformations.json')).rows;assert.equal(proposalRows.length,12);
for(const r of proposalRows){const before=readFileSync(join(repo,r.source));assert.equal(before.length,r.sourceBytes);assert.equal(hash(before),r.sourceSha256);let expected=before.toString();for(const x of r.replacements){assert.equal(expected.split(x.old).length,2,r.name);expected=expected.replace(x.old,x.next);}const actual=readFileSync(join(proposal,r.name));assert.equal(actual.length,r.bytes);assert.equal(hash(actual),r.sha256);assert(actual.equals(Buffer.from(expected)));}
for(const n of ['supervisor.cs','supervisor.lifecycle.cs','supervisor.legacy-control.cs','test-hooks.cs','contract.json','pump-literals.json','stream-literals.json','lifecycle-supervise.ps1'])assert(readFileSync(join(proposal,n)).equals(readFileSync(join(design,n))));
const newCases=json(join(proposal,'lifecycle-cases.json')),expectedCases=structuredClone(remaining.slice(7));expectedCases[0].id='death-with-live-descendant';expectedCases[0].mode='descendant-live';assert.deepEqual(newCases,expectedCases);assert.deepEqual(newCases.map(c=>c.id),['death-with-live-descendant','creation-race-0ms','creation-race-1ms','creation-race-5ms','legacy-gap-control']);
assert.deepEqual(json(join(proposal,'diagnostic-cases.json')),[{id:'parent-exit-diagnostic',source:'corrected',mode:'descendant-exit-diagnostic',pauseAt:'after-resume',fault:'',action:'observe-parent-exit',expect:'diagnostic-observation',resumed:null,stop:null}]);
const originalFixture=readFileSync(join(design,'benign-child.mjs'),'utf8'),newFixture=readFileSync(join(proposal,'benign-child.mjs'),'utf8');assert.equal(newFixture.slice(newFixture.indexOf("if(mode==='zero')")),originalFixture.slice(originalFixture.indexOf("if(mode==='zero')")));
const addition=readFileSync(join(proposal,'fixture-addition.txt'),'utf8');assert(newFixture.includes(addition));assert(!addition.includes('detached:'));assert(!addition.includes('.unref('));assert(!addition.includes('setTimeout('));assert.equal((addition.match(/setInterval/g)||[]).length,1);
const newRunner=readFileSync(join(proposal,'lifecycle-runner.ps1'),'utf8');assert(newRunner.includes(readFileSync(join(proposal,'harness-readiness.txt'),'utf8')));assert(newRunner.includes("Need ($row.membersBeforeKill -contains $descendantId) 'descendant not independently present'"));assert(newRunner.includes("Need $row.emptyBeforeSafety 'survivor detected before fallback: failed lifecycle'"));
const observerText=readFileSync(join(proposal,'observer.cs'),'utf8');assert(observerText.includes(readFileSync(join(proposal,'observer-addition.txt'),'utf8')));
const newPlan=json(join(proposal,'plan.json'));assert.deepEqual(newPlan.remainingOriginalOrdinals,[21,22,23,24,25]);assert.equal(newPlan.executions,0);assert.equal(newPlan.compilerInvocations,0);assert.equal(newPlan.diagnosticSeparate,true);
const outcomes=json(join(proposal,'diagnostic-outcomes.json'));assert.equal(outcomes.executed,false);assert.equal(outcomes.notConformanceOrCleanupCoverage,true);assert.deepEqual(outcomes.observations.map(r=>r.diagnosticOutcome),newPlan.diagnosticVerdicts);
const checks=json(join(proposal,'syntax-results-final.json'));assert.equal(checks.nodeExitCode,0);assert(checks.powershell.every(r=>r.errors.length===0));assert.equal(checks.csharpCompilations,0);assert.equal(checks.fixtureInvocations,0);
if(process.argv.includes('--preflight')){assert(!existsSync(process.argv.includes('--diagnostic')?newPlan.diagnosticRoot:newPlan.root),'occupied future root');const pinned=json(join(proposal,'contract.json'));for(const [p,sha] of [[pinned.node,pinned.nodeSha256],[pinned.supervisor,pinned.supervisorSha256]])assert.equal(hash(readFileSync(p)),sha);}
const proposalSeal=json(join(proposal,'manifest.json'));proposalSeal.forEach(check);assert.deepEqual(paths(proposal).filter(p=>p!==relative(repo,join(proposal,'manifest.json')).replaceAll('\\','/')).concat(doc).sort(),proposalSeal.map(r=>r.path).sort());
console.log(JSON.stringify({parentLifetimeSourceTransformations:12,remainingPlanCases:5,distinctDiagnosticCases:1,originalDescendantBehaviorUnchanged:true,supervisorSourcesUnchanged:3,fixtureInvocations:0,csharpCompilations:0,scriptcInvocations:0,passed:true}));
