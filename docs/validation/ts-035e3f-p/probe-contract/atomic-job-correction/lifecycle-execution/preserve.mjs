// Archive the single completed attempt. No process creation or lifecycle retry.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const here=import.meta.dirname, parent=resolve(here,'..'), repo=resolve(here,'../../../../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const write=(n,b)=>writeFileSync(join(here,n),b,{flag:'wx'});
const json=(n,v)=>write(n,JSON.stringify(v,null,2)+'\n');
const root=join(repo,'typescript/build/ts035e3fp-atomic-job-lifecycle');
const files=[],dirs=[];
function walk(p){for(const name of readdirSync(p).sort()){const q=join(p,name),s=lstatSync(q);assert(!s.isSymbolicLink());if(s.isDirectory()){dirs.push(relative(root,q).replaceAll('\\','/'));walk(q);}else{assert(s.isFile()&&s.nlink===1);const b=readFileSync(q);files.push({path:relative(root,q).replaceAll('\\','/'),bytes:b.length,sha256:hash(b),base64:b.toString('base64')});}}}
walk(root);
const log=readFileSync(join(repo,'typescript/build/ts035e3fp-lifecycle-attempt.log'));
write('attempt.log',log);
json('inventory.json',{root:relative(repo,root).replaceAll('\\','/'),directories:dirs,files:files.map(({base64,...r})=>r)});
write('attempt-files.json.gz',gzipSync(Buffer.from(JSON.stringify(files)),{level:9}));
const rows=JSON.parse(readFileSync(join(root,'failed-results.json')));
assert.equal(rows.length,11);assert(rows.slice(0,10).every(r=>r.status==='matched-future-literal'));
assert.equal(rows[10].id,'membership-false');assert.equal(rows[10].status,'failed-stop-review');
assert(rows.every(r=>r.emptyBeforeSafety===true&&r.membersBeforeSafety.length===0&&r.safetyCleanup===false));
json('outcomes.json',{attempts:1,harnessExitCode:1,planned:25,attempted:11,matched:10,failed:1,unrun:14,scriptcInvocations:0,compilerProbeAuthorized:false,rows:rows.map(r=>({id:r.id,status:r.status,errors:r.errors,supervisorPid:r.supervisorPid,childPid:r.statusData?.Pid,stop:r.statusData?.StopReason,nativeExitCode:r.statusData?.NativeExitCode,innerCleanupConfirmed:r.statusData?.CleanupConfirmed,emptyBeforeSafety:r.emptyBeforeSafety,membersBeforeSafety:r.membersBeforeSafety,safetyCleanup:r.safetyCleanup}))});
write('failed-result.json',readFileSync(join(root,'membership-false/result.json')));
write('prior-design.md',readFileSync(join(repo,'typescript/docs/script-build-provenance.md')));
// Exact source-only proposal. Neither proposed file is compiled or invoked.
const old='if(!r.MembershipVerified&&WaitForSingleObject(pi.Process,0)!=0) {Need(TerminateProcess(pi.Process,0xe0350002),"terminate-unverified-root");r.Events.Add("terminate-unverified-root");}';
const next='if(!r.MembershipVerified&&WaitForSingleObject(pi.Process,0)!=0) {\r\n            // Preserve termination failure, then measure cleanup independently.\r\n            if(TerminateProcess(pi.Process,0xe0350002))r.Events.Add("terminate-unverified-root");\r\n            else r.Errors.Add(new Win32Exception(Marshal.GetLastWin32Error(),"terminate-unverified-root").ToString());\r\n          }';
json('source-replacement.json',{old,next,files:['supervisor.cs','supervisor.lifecycle.cs'],compiled:false,executed:false});
for(const name of ['supervisor.cs','supervisor.lifecycle.cs']){const s=readFileSync(join(parent,name),'utf8');assert.equal(s.split(old).length,2);write('proposed-'+name,s.replace(old,next));}
console.log(JSON.stringify({archivedFiles:files.length,archivedBytes:files.reduce((n,r)=>n+r.bytes,0),attempted:rows.length,outerJobsEmpty:rows.length,proposalsExecuted:0}));
