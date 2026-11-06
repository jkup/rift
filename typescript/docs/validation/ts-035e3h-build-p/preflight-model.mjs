// Pure synthetic design check. Data consistency cannot authorize execution.
export function preflight(candidate,plan){
 const fail=code=>({kind:'refused',code,canExecute:false,authority:'none'});
 const keys=(v,expected)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===expected.sort().join('|');
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(!keys(candidate,['command','state']))return fail('SCHEMA');
 const {command:c,state:s}=candidate;
 if(!keys(c,['executable','argv','cwd','environment'])||!Array.isArray(c.argv)||!keys(s,['rootWasAbsent','ownedRoot','outputAbsent','copies','installed','systemHardlinksApproved','compilationActivities','runtimeGateClosed']))return fail('SCHEMA');
 if(c.executable!==plan.executable)return fail('EXECUTABLE');
 if(!same(c.argv,plan.argv))return fail('ARGV');
 if(c.cwd!==plan.cwd)return fail('CWD');
 if(!same(c.environment,plan.childEnvironment))return fail('ENVIRONMENT');
 if(s.rootWasAbsent!==true||s.ownedRoot!==plan.root||s.outputAbsent!==true)return fail('OWNERSHIP');
 if(!Array.isArray(s.copies)||s.copies.length!==2)return fail('COPIES');
 for(let i=0;i<2;i++){
  const r=s.copies[i],e=i===0?plan.source:plan.reference;
  if(!keys(r,['path','bytes','sha256','nlink','kind','alias'])||r.path!==e.copy)return fail('COPY_PATH');
  if(r.kind!=='file'||r.alias!==false||r.nlink!==1)return fail('COPY_KIND');
  if(r.bytes!==e.bytes||r.sha256!==e.sha256)return fail('COPY_IDENTITY');
 }
 if(!Array.isArray(s.installed)||!same(s.installed,[plan.compiler,...plan.observedRuntimeAndConfig,plan.supervisorIdentity,plan.supervisor.powershellRuntimeConfig,plan.supervisor.roslynCSharp]))return fail('INSTALLED_IDENTITY');
 if(s.systemHardlinksApproved!==true)return fail('SYSTEM_HARDLINK_POLICY_UNAPPROVED');
 if(s.compilationActivities!==2||plan.limits.helperCompilerInvocations!==1||plan.limits.supervisorAddTypeCompilations!==1)return fail('COMPILATION_BUDGET');
 if(s.runtimeGateClosed!==true)return fail('GATE_OPEN');
 return {kind:'plan-consistent',canExecute:false,authority:'none'};
}
