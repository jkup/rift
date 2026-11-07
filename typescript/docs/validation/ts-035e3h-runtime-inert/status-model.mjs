// Design oracle only: no status-file reader, subprocess or runtime integration.
export function assess(s){
 const reject=code=>({kind:'rejected',code,authority:'none',totalAttempts:null});
 const keys=['Outcome','StopReason','Errors','Events','Pid','NativeExitCode','Signal','CreatedSuspended','Assigned','Resumed','JobListConfigured','MembershipVerified','CleanupConfirmed','FinalActiveProcesses','ElapsedMs','Stdout','Stderr','ExternalEffects'];
 if(!s||JSON.stringify(Object.keys(s).sort())!==JSON.stringify(keys.sort()))return reject('SHAPE');
 if(s.CleanupConfirmed!==true||s.FinalActiveProcesses!==0)return reject('CLEANUP');
 const pipeKeys=['ObservedBytes','RetainedBytes','ObservedSha256','Error','Eof','Complete','Overflow'].sort();
 for(const p of [s.Stdout,s.Stderr])if(!p||JSON.stringify(Object.keys(p).sort())!==JSON.stringify(pipeKeys)||p.Eof!==true||p.Complete!==true||p.Overflow!==false||p.Error!==null||p.ObservedBytes!==0||p.RetainedBytes!==0||p.ObservedSha256!=='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')return reject('STREAM');
 if(!Array.isArray(s.Errors)||s.Errors.length||s.Signal!==null)return reject('ERROR');
 if(s.StopReason!=='capture-marker-closed'||s.Outcome!=='capture-stop-hint-review-required')return reject('STOP');
 if(s.NativeExitCode!==0xe0350001)return reject('EXIT');
 if(['CreatedSuspended','Assigned','Resumed','JobListConfigured','MembershipVerified'].some(k=>s[k]!==true)||!Number.isInteger(s.Pid)||s.Pid<1||!Number.isSafeInteger(s.ElapsedMs)||s.ElapsedMs<0)return reject('MEMBERSHIP');
 if(JSON.stringify(s.Events)!==JSON.stringify(['job-kill-on-close','creation-time-job-list-configured','created-suspended-in-job','membership-verified','resumed','terminate-job'])||s.ExternalEffects!=='not monitored outside enumerated roots; cooperative installed-tool and OS trust')return reject('EVENTS');
 return {kind:'stop-hint-only',authority:'none',totalAttempts:null};
}
