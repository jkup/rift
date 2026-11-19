import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,mkdirSync,constants} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {plan} from './runner.mjs';
const here=import.meta.dirname,read=p=>readFileSync(join(here,p),'utf8'),json=p=>JSON.parse(read(p));
const c=json('contract.json'),expected=json('expected-plan.json');assert.deepEqual(plan(c),expected);
for(const name of ['contract.json','expected-plan.json','supervise.ps1'])assert.equal(read(name),read('../'+name));
let original=read('../runner.mjs');
function replace(s,a,b){assert.equal(s.split(a).length,2,a);return s.replace(a,b);}
original=replace(original,"const here=import.meta.dirname,prior=resolve(here,'..');","const here=import.meta.dirname,prior=resolve(here,'../..');");
original=replace(original,"assert.equal(c.sourceRoot,resolve(here,'../../../..'));","assert.equal(c.sourceRoot,resolve(here,'../../../../..'));");
original=replace(original,"assert.equal(status.Outcome,'completed-observation');assert.equal(status.CleanupConfirmed,true);assert.equal(status.FinalActiveProcesses,0);assert.equal(status.NativeExitCode,0);","assert.equal(status.Outcome,'completed-observation');assert.equal(status.CleanupConfirmed,true);assert.equal(status.FinalActiveProcesses,0);assert.equal(status.NativeExitCode,0);\n      assert.equal(status.JobListConfigured,true);assert.equal(status.MembershipVerified,true);");
assert.equal(read('runner.mjs'),original,'complete runner change boundary');
const cs=read('supervisor.cs');assert(!cs.includes('AssignProcessToJobObject'));assert(!cs.includes('TestHooks'));
for(const needle of ['InitializeProcThreadAttributeList(IntPtr.Zero,2','InitializeProcThreadAttributeList(attrs,2','new IntPtr(0x2000d)','if(!OperatingSystem.IsWindowsVersionAtLeast(10))','IsProcessInJob(pi.Process,job,out member)','or=IntPtr.Zero;','er=IntPtr.Zero;','Interlocked.Exchange(ref closed,1)','Interlocked.Exchange(ref handle,IntPtr.Zero)','System.Threading.ThreadState.Unstarted','stdout.CloseUnstarted()','stderr.CloseUnstarted()'])assert(cs.includes(needle),needle);
assert(cs.indexOf('"creation-time-job-list");')<cs.indexOf('bool created=CreateProcessW'));
assert(cs.indexOf('IsProcessInJob(pi.Process,job,out member)')<cs.indexOf('Need(ResumeThread(pi.Thread)'));
assert(cs.indexOf('stdout=new Pump')<cs.indexOf('stdout.Start();'));
const cases=json('lifecycle-cases.json');assert.equal(cases.length,25);assert.equal(new Set(cases.map(x=>x.id)).size,25);
const required=['normal','nonzero','timeout','stdout-cap','stderr-cap','descendant-left','unsupported','job-list-setup','invalid-job-creation','missing-executable','membership-false','first-pump-start','second-pump-start','stdout-read-error','output-file-exists','death-before-create','death-after-create','death-membership','death-before-resume','death-after-resume','death-with-descendant','creation-race-0ms','creation-race-1ms','creation-race-5ms','legacy-gap-control'];assert.deepEqual(cases.map(x=>x.id),required);
assert.equal(cases.filter(x=>x.source==='legacy').length,1);assert.equal(cases.at(-1).expect,'survivor-detected-before-safety-cleanup');
const out=mkdtempSync(join(here,'offline-')),copy=join(out,'copy');mkdirSync(copy);
copyFileSync(join(here,'../supervisor.cs'),join(out,'supervisor.cs'),constants.COPYFILE_EXCL);
for(const name of ['supervisor.cs','test-hooks.cs','instrument.mjs'])copyFileSync(join(here,name),join(copy,name),constants.COPYFILE_EXCL);
try {
 await import(pathToFileURL(join(copy,'instrument.mjs'))); // Source generation only, never Add-Type.
 for(const name of ['supervisor.lifecycle.cs','supervisor.legacy-control.cs'])assert.equal(readFileSync(join(copy,name),'utf8'),read(name),'full instrumented source reproduction');
 const result={kind:'offline-only-not-win32-validation',wholePlanLiterals:1,exactUnchangedFiles:3,wholeRunnerBoundary:true,sourceChecks:true,fullInstrumentedSources:2,lifecyclePlanCases:25,executedLifecycleCases:0,csharpCompilations:0,scriptcCompilations:0,supervisorInvocations:0,benignChildInvocations:0};
 writeFileSync(join(out,'results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,...result}));
}catch(e){writeFileSync(join(out,'failure.json'),JSON.stringify({name:e.name,code:e.code,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx'});throw e;}
