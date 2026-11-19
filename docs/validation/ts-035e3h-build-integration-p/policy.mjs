// Pure policies; no I/O or execution authority.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const keys=(v,n)=>assert.deepEqual(Object.keys(v).sort(),n.slice().sort());
export function validateExecution(outer,status,streams,expected){
 keys(outer,['exe','argv','cwd','environment','spawned','pid','error','exit','signal','watchdog','killRequested','killReturned','closeObserved','streams','ioErrors']);
 for(const k of ['exe','argv','cwd','environment'])assert.deepEqual(outer[k],expected[k]);
 assert.equal(outer.spawned,true);assert(Number.isInteger(outer.pid)&&outer.pid>0);assert.equal(outer.exit,0);assert.equal(outer.error,null);assert.equal(outer.signal,null);assert.equal(outer.watchdog,false);assert.equal(outer.killRequested,false);assert.equal(outer.killReturned,null);assert.equal(outer.closeObserved,true);assert.deepEqual(outer.ioErrors,[]);
 keys(outer.streams,['stdout','stderr']);for(const s of Object.values(outer.streams)){keys(s,['bytes','overflow']);assert(Number.isSafeInteger(s.bytes)&&s.bytes>=0&&s.bytes<=1048576);assert.equal(s.overflow,false);}
 keys(status,['Outcome','StopReason','Errors','Events','Pid','NativeExitCode','Signal','CreatedSuspended','Assigned','Resumed','JobListConfigured','MembershipVerified','CleanupConfirmed','FinalActiveProcesses','ElapsedMs','Stdout','Stderr','ExternalEffects']);
 assert.equal(status.Outcome,'completed-observation');assert.equal(status.StopReason,'root-exit');assert.equal(status.NativeExitCode,0);assert.equal(status.Signal,null);assert.deepEqual(status.Errors,[]);
 assert.deepEqual(status.Events,['job-kill-on-close','creation-time-job-list-configured','created-suspended-in-job','membership-verified','resumed','terminate-job']);
 assert(Number.isInteger(status.Pid)&&status.Pid>0);assert(Number.isSafeInteger(status.ElapsedMs)&&status.ElapsedMs>=0);
 assert.equal(status.ExternalEffects,'not monitored outside enumerated roots; cooperative installed-tool and OS trust');
 for(const k of ['CreatedSuspended','Assigned','Resumed','JobListConfigured','MembershipVerified','CleanupConfirmed'])assert.equal(status[k],true);
 assert.equal(status.FinalActiveProcesses,0);keys(streams,['stdout','stderr']);
 for(const [key,name] of [['Stdout','stdout'],['Stderr','stderr']]){const s=status[key],b=streams[name];keys(s,['ObservedBytes','RetainedBytes','ObservedSha256','Error','Eof','Complete','Overflow']);assert(Buffer.isBuffer(b)&&b.length<=8388608);assert.equal(s.ObservedBytes,b.length);assert.equal(s.RetainedBytes,b.length);assert.equal(s.ObservedSha256,createHash('sha256').update(b).digest('hex'));assert.equal(s.Error,null);assert.equal(s.Eof,true);assert.equal(s.Complete,true);assert.equal(s.Overflow,false);}
 return {kind:'compiler-exited-zero',cleanup:'reported-not-independent',compilerInvocations:1,authority:'none'};
}
export function validateAliases(actual,expected){
 assert.deepEqual(Object.keys(actual).sort(),['groups','utility']);
 assert.deepEqual(actual.utility,expected.utility,'utility identity drift');
 assert.equal(actual.groups.length,6);
 for(let i=0;i<6;i++){
  const a=actual.groups[i],e=expected.groups[i];assert.deepEqual(Object.keys(a).sort(),['named','names','records']);
  assert.equal(a.named,e.named);assert.deepEqual(a.names,e.names,'alias names/order');assert.equal(a.records.length,a.names.length);
  for(let j=0;j<a.records.length;j++){
   const r=a.records[j];assert.equal(r.path,a.names[j]);assert.equal(r.canonical,r.path);
   assert.equal(Number(r.nlink),a.names.length);assert.equal(r.dev,a.records[0].dev);assert.equal(r.ino,a.records[0].ino);assert.equal(r.bytes,a.records[0].bytes);assert.equal(r.sha256,a.records[0].sha256);
   assert(r.chain.length>=2);for(let k=0;k<r.chain.length;k++){const row=r.chain[k];assert.equal(row.path,row.canonical);assert.equal(row.attributes&0x400,0);assert.equal(row.kind,k===r.chain.length-1?'file':'directory');assert.equal(Boolean(row.attributes&0x10),row.kind==='directory');}
   assert.deepEqual(r,e.records[j],'named alias identity/ancestor drift');
  }
 }
 return {kind:'named-aliases-match',authority:'none'};
}
export function classify(rows,policy,privateDirs){
 const failures=[];let files=0,totalBytes=0,tempFiles=0,tempBytes=0;
 const allowedDir=p=>privateDirs.includes(p)||p==='tmp'||p.startsWith('tmp/')||Object.keys(policy.fixed).some(f=>f.startsWith(p+'/'));
 for(const r of rows){
  if(r.kind==='directory'){if(r.path.startsWith('tmp/')&&r.path.split('/').length-1>policy.opaqueTemp.maxDepth)failures.push('temp-directory-depth:'+r.path);if(!allowedDir(r.path))failures.push('unexpected-directory:'+r.path);continue;}
  if(r.kind!=='file'||r.nlink!==1){failures.push('alias-or-nonordinary:'+r.path);continue;}
  files++;totalBytes+=r.bytes;
  if(Object.hasOwn(policy.fixed,r.path)){if(r.bytes>policy.fixed[r.path])failures.push('fixed-file-cap:'+r.path);}
  else if(r.path.startsWith('tmp/')){tempFiles++;tempBytes+=r.bytes;if(r.path.split('/').length-1>policy.opaqueTemp.maxDepth||r.bytes>policy.opaqueTemp.maxFileBytes)failures.push('temp-file-cap:'+r.path);}
  else failures.push('unexpected-file:'+r.path);
 }
 if(files>policy.maxFiles||totalBytes>policy.maxBytes)failures.push('root-cap');
 if(tempFiles>policy.opaqueTemp.maxFiles||tempBytes>policy.opaqueTemp.maxTotalBytes)failures.push('temp-total-cap');
 return {kind:failures.length?'rejected':'bounded-output-set',files,totalBytes,tempFiles,tempBytes,failures,authority:'none'};
}
