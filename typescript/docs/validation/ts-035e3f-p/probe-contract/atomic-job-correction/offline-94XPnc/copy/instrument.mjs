// Source authoring only. Does not compile C# or start any process.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const here=import.meta.dirname,read=n=>readFileSync(join(here,n),'utf8');
function replace(s,a,b){assert.equal(s.split(a).length,2,a);return s.replace(a,b);}
let s=read('supervisor.cs');
s=replace(s,'if(!OperatingSystem.IsWindowsVersionAtLeast(10))','if(TestHooks.Fault=="unsupported"||!OperatingSystem.IsWindowsVersionAtLeast(10))');
s=replace(s,'jobs=Marshal.AllocHGlobal(IntPtr.Size);Marshal.WriteIntPtr(jobs,job);','TestHooks.Fail("job-list-setup");jobs=Marshal.AllocHGlobal(IntPtr.Size);Marshal.WriteIntPtr(jobs,TestHooks.Fault=="invalid-job"?IntPtr.Zero:job);');
s=replace(s,'clock.Start();bool created=CreateProcessW','TestHooks.Point("before-create");clock.Start();bool created=CreateProcessW');
s=replace(s,'r.Pid=pi.Pid;r.CreatedSuspended=true;','TestHooks.Point("after-create",pi.Pid);r.Pid=pi.Pid;r.CreatedSuspended=true;');
s=replace(s,'if(!member)throw new Exception','if(TestHooks.Fault=="membership-false")member=false;if(!member)throw new Exception');
s=replace(s,'r.MembershipVerified=true;r.Events.Add("membership-verified");','r.MembershipVerified=true;r.Events.Add("membership-verified");TestHooks.Point("membership-verified",pi.Pid);');
s=replace(s,'Need(ResumeThread(pi.Thread)','TestHooks.Point("before-resume",pi.Pid);Need(ResumeThread(pi.Thread)');
s=replace(s,'r.Resumed=true;r.Events.Add("resumed");Close(ref pi.Thread);','r.Resumed=true;r.Events.Add("resumed");Close(ref pi.Thread);TestHooks.Point("after-resume",pi.Pid);');
// Force an actual invalid ReadFile handle in the owned pump; zero the owned
// field first, so release cannot close the old handle again.
s=replace(s,'try {worker.Start();','try {TestHooks.BeforePumpStart();if(TestHooks.Fault=="stdout-read"&&file.Name.EndsWith("compiler.stdout.bin")){IntPtr old=Interlocked.Exchange(ref handle,IntPtr.Zero);CloseHandle(old);}worker.Start();');
writeFileSync(join(here,'supervisor.lifecycle.cs'),s+'\n'+read('test-hooks.cs'),{flag:'wx'});
let legacy=readFileSync(join(here,'../supervisor.cs'),'utf8');
legacy=replace(legacy,'r.Pid=pi.Pid;r.CreatedSuspended=true;','TestHooks.Point("after-create",pi.Pid);r.Pid=pi.Pid;r.CreatedSuspended=true;');
writeFileSync(join(here,'supervisor.legacy-control.cs'),legacy+'\n'+read('test-hooks.cs'),{flag:'wx'});
console.log('Two full test-only C# sources authored; no compilation or execution.');
