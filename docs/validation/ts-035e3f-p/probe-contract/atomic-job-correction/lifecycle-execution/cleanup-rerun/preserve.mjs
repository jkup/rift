// Preserve the single authorized cleanup rerun. Does not start any process.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync,mkdirSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const here=import.meta.dirname,prior=resolve(here,'..'),correction=resolve(here,'../..'),repo=resolve(here,'../../../../../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex'),write=(n,b)=>writeFileSync(join(here,n),b,{flag:'wx'}),json=(n,v)=>write(n,JSON.stringify(v,null,2)+'\n');
const root=join(repo,'typescript/build/ts035e3fp-atomic-job-lifecycle-cleanup'),files=[],directories=[];
function walk(p){for(const n of readdirSync(p).sort()){const q=join(p,n),s=lstatSync(q);assert(!s.isSymbolicLink());if(s.isDirectory()){directories.push(relative(root,q).replaceAll('\\','/'));walk(q);}else{assert(s.isFile()&&s.nlink===1);const b=readFileSync(q);files.push({path:relative(root,q).replaceAll('\\','/'),bytes:b.length,sha256:hash(b),base64:b.toString('base64')});}}}walk(root);
json('inventory.json',{root:relative(repo,root).replaceAll('\\','/'),directories,files:files.map(({base64,...r})=>r)});
write('attempt-files.json.gz',gzipSync(Buffer.from(JSON.stringify(files)),{level:9}));
write('attempt.log',readFileSync(join(repo,'typescript/build/ts035e3fp-lifecycle-cleanup-attempt.log')));
mkdirSync(join(here,'reviewed-inputs'));
for(const n of readdirSync(join(repo,'typescript/build/ts035e3fp-cleanup-reviewed-inputs')))write('reviewed-inputs/'+n,readFileSync(join(repo,'typescript/build/ts035e3fp-cleanup-reviewed-inputs',n)));
write('prior-design.md',readFileSync(join(repo,'typescript/docs/script-build-provenance.md')));
const seal=readFileSync(join(prior,'manifest.json'));json('prior-manifest.json',{path:relative(repo,join(prior,'manifest.json')).replaceAll('\\','/'),bytes:seal.length,sha256:hash(seal)});
const rows=JSON.parse(readFileSync(join(root,'failed-results.json')));assert.equal(rows.length,14);assert(rows.slice(0,13).every(r=>r.status==='matched-future-literal'&&r.emptyBeforeSafety===true&&r.safetyCleanup===false));
const fail=rows[13];assert.equal(fail.id,'stdout-read-error');assert.equal(fail.status,'failed-stop-review');assert.equal(fail.safetyCleanup,true);assert.equal(fail.errors.length,1);assert(fail.errors[0].includes('because it is being used by another process'));
write('failed-result.json',readFileSync(join(root,'stdout-read-error/result.json')));
json('outcomes.json',{authorizedRerunInvocations:1,totalAuthorizedInvocationsIncludingOriginal:2,exitCode:1,planned:25,attempted:14,matched:13,failed:1,unrun:11,scriptcInvocations:0,rows:rows.map(r=>({id:r.id,status:r.status,errors:r.errors,supervisorPid:r.supervisorPid,childPid:r.statusData?.Pid,stop:r.statusData?.StopReason,nativeExitCode:r.statusData?.NativeExitCode,innerCleanupConfirmed:r.statusData?.CleanupConfirmed,emptyBeforeSafety:r.emptyBeforeSafety,membersBeforeSafety:r.membersBeforeSafety,safetyCleanup:r.safetyCleanup}))});
// Proposed checkpoint publication only: flush and close staging file, then move
// without overwrite to the existing observed name. No retry or wait change.
const old='    using(var f=new System.IO.FileStream(System.IO.Path.Combine(Root,"point-"+name+".txt"),System.IO.FileMode.CreateNew,System.IO.FileAccess.Write,System.IO.FileShare.Read)) {\r\n      byte[] b=System.Text.Encoding.ASCII.GetBytes(pid.ToString()+"\\n");f.Write(b,0,b.Length);f.Flush(true);\r\n    }';
const next='    string published=System.IO.Path.Combine(Root,"point-"+name+".txt");\r\n    string staging=published+".pending";\r\n    using(var f=new System.IO.FileStream(staging,System.IO.FileMode.CreateNew,System.IO.FileAccess.Write,System.IO.FileShare.None)) {\r\n      byte[] b=System.Text.Encoding.ASCII.GetBytes(pid.ToString()+"\\n");f.Write(b,0,b.Length);f.Flush(true);\r\n    }\r\n    System.IO.File.Move(staging,published);';
json('checkpoint-replacement.json',{old,next,compiled:false,executed:false,files:['test-hooks.cs','supervisor.lifecycle.cs','supervisor.legacy-control.cs']});
for(const name of ['test-hooks.cs','supervisor.lifecycle.cs','supervisor.legacy-control.cs']){const path=name==='test-hooks.cs'?join(correction,name):join(here,'reviewed-inputs',name);const s=readFileSync(path,'utf8');assert.equal(s.split(old).length,2,name);write('proposed-'+name,s.replace(old,next));}
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,r)=>n+r.bytes,0),matched:13,failed:1,unrun:11,outerEmptyBeforeFallback:13,confirmedSafetyCleanup:1,proposalsExecuted:0}));
