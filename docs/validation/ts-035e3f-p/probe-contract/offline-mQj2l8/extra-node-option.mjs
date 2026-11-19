// Evidence-only PROPOSAL. Importing this file does not set up or launch a process.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync,realpathSync,mkdirSync,writeFileSync,copyFileSync,constants,openSync,writeSync,closeSync,fsyncSync} from 'node:fs';
import {join,resolve,relative,dirname,parse,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const here=import.meta.dirname,prior=resolve(here,'..');
const hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(readFileSync(p));
const save=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function exact(p,directory=false) {
  const path=resolve(p);let part=parse(path).root;
  for(const item of relative(part,path).split(sep).filter(Boolean)){part=join(part,item);assert(!lstatSync(part).isSymbolicLink(),'alias '+part);}
  assert.equal(realpathSync(path),path,'spelling '+path);const s=lstatSync(path);
  assert(directory?s.isDirectory():s.isFile()&&s.nlink===1,'kind/links '+path);return path;
}
function tree(base) {
  const rows=[];function visit(p){const s=lstatSync(p),label=relative(base,p).replaceAll('\\','/');
    if(s.isSymbolicLink()){rows.push({path:label,kind:'alias',bytes:null,sha256:null});return;}
    if(s.isDirectory()){rows.push({path:label,kind:'directory',bytes:null,sha256:null});for(const n of readdirSync(p).sort())visit(join(p,n));return;}
    if(!s.isFile()){rows.push({path:label,kind:'other',bytes:null,sha256:null});return;}
    const b=readFileSync(p);rows.push({path:label,kind:s.nlink===1?'file':'hardlink',bytes:b.length,sha256:hash(b)});
  }visit(base);return rows;
}
function files(base){return tree(base).filter(r=>r.kind!=='directory');}
function packageSnapshot(c){return files(exact(join(c.sourceRoot,'node_modules'),true)).map(r=>({...r,path:'node_modules/'+r.path}));}
function checkKnownPackages(snapshot,expected) {assert.deepEqual(snapshot,expected.map(({path,bytes,sha256})=>({path,kind:'file',bytes,sha256})));}
function identity(p,sha){const bytes=readFileSync(exact(p));assert.equal(hash(bytes),sha,p);return {path:p,bytes:bytes.length,sha256:hash(bytes)};}
function zigSnapshot(c){return files(exact(dirname(c.zig),true)).map(r=>({...r,path:'zig-install/'+r.path}));}
// Only pure planning is exported, to permit full literal checks without process setup.
export function plan(c) {
  assert.equal(c.kind,'evidence-only-native-link-info-experiment');assert.equal(c.maxCompilerInvocations,1);
  assert.equal(c.timeoutMs,60000);assert.equal(c.streamCapBytes,8388608);assert.equal(c.cleanupMs,10000);assert.equal(c.supervisorWatchdogMs,90000);
  const environment=Object.fromEntries(Object.entries(c.childEnvironment)); environment.NODE_OPTIONS='--inspect';
  return {compiler:join(c.root,'node_modules/scriptc/bin/scriptc.exe'),argv:[...c.argv],cwd:c.root,environment,
    supervisor:c.supervisor,supervisorArgv:['-NoLogo','-NoProfile','-NonInteractive','-File',join(c.root,'supervise.ps1'),'-ConfigPath',join(c.root,'contract.json')],
    timeoutMs:c.timeoutMs,streamCapBytes:c.streamCapBytes,cleanupMs:c.cleanupMs,supervisorWatchdogMs:c.supervisorWatchdogMs,maxCompilerInvocations:1};
}
function supervise(p,root) {
  return new Promise(resolveResult=>{
    const record={exe:p.supervisor,argv:p.supervisorArgv,cwd:root,environment:p.environment,spawned:false,pid:null,error:null,exit:null,signal:null,watchdog:false,killRequested:false,killReturned:null,closeObserved:false,streams:{stdout:{bytes:0,overflow:false},stderr:{bytes:0,overflow:false}}};
    const descriptors={stdout:openSync(join(root,'supervisor.stdout.bin'),'wx'),stderr:openSync(join(root,'supervisor.stderr.bin'),'wx')};
    let child,ended=false,watchdog,closeDeadline;const errors=[];
    const finish=()=>{if(ended)return;ended=true;clearTimeout(watchdog);clearTimeout(closeDeadline);for(const key of ['stdout','stderr']){try{fsyncSync(descriptors[key]);closeSync(descriptors[key]);}catch(e){errors.push(String(e));}}record.ioErrors=errors;resolveResult(record);};
    const stop=()=>{if(record.killRequested)return;record.killRequested=true;try{record.killReturned=child.kill();}catch(e){errors.push(String(e));}closeDeadline=setTimeout(()=>{errors.push('supervisor close unconfirmed; stop for manual inspection, no retry');finish();},10000);};
    try {child=spawn(p.supervisor,p.supervisorArgv,{cwd:root,env:p.environment,windowsHide:true,stdio:['ignore','pipe','pipe']});}
    catch(e){record.error={code:e.code??null,message:e.message};finish();return;}
    child.on('spawn',()=>{record.spawned=true;record.pid=child.pid;});
    child.on('error',e=>{record.error={code:e.code??null,message:e.message};});
    for(const key of ['stdout','stderr'])child[key].on('data',chunk=>{
      if(ended)return;const s=record.streams[key],previous=s.bytes;s.bytes+=chunk.length;
      try{const n=Math.max(0,Math.min(chunk.length,1048577-previous));if(n)writeSync(descriptors[key],chunk,0,n);}catch(e){errors.push(String(e));stop();}
      if(s.bytes>1048576){s.overflow=true;stop();}
    });
    child.on('exit',(code,signal)=>{record.exit=code;record.signal=signal;});
    child.on('close',(code,signal)=>{record.exit=code;record.signal=signal;record.closeObserved=true;finish();});
    watchdog=setTimeout(()=>{record.watchdog=true;stop();},p.supervisorWatchdogMs);
  });
}
async function run() {
  assert.deepEqual(process.argv.slice(2),['--reviewed-run'],'Root review required; no default action');
  assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');
  // This new verifier preserves original bytes without rerunning the original
  // verifier against an intentionally appended design or new evidence directory.
  await import('./verify.mjs');
  const c=json(join(here,'contract.json')),p=plan(c),original=json(join(prior,'probe-proposal.json'));
  assert.equal(c.sourceRoot,resolve(here,'../../../..'));assert.equal(c.root,join(c.sourceRoot,'build/ts035e3fp-link-info-observation'));
  const expected=json(join(prior,'installed-packages.json'));
  exact(dirname(c.root),true);mkdirSync(c.root); // Exclusive fresh root; NEVER remove/reuse it after failure.
  const report={kind:'observational-experiment-not-build-authority',stages:[],failures:[],compilerInvocations:null,unknownExternalEffects:c.unknownExternalEffects,metadata:null};
  const stage=(name,fn)=>{try{const value=fn();report.stages.push({name,status:'complete'});return value;}catch(e){report.failures.push({stage:name,name:e.name,code:e.code??null,message:e.message,stack:e.stack});throw e;}};
  let before,zigBefore,rootBefore;
  try {
    stage('contract-and-tools',()=>{
      save(join(c.root,'contract.json'),c);save(join(c.root,'invocation.json'),p);
      const tools=[identity(c.node,c.nodeSha256),identity(c.supervisor,c.supervisorSha256),identity(c.cmd,c.cmdSha256),identity(c.zig,c.zigSha256)];
      assert.equal(process.execPath,c.node);save(join(c.root,'tools-before.json'),tools);
      for(const path of ['C:\\WINDOWS','C:\\WINDOWS\\system32',c.childEnvironment.ZIG_LIB_DIR,c.childEnvironment.PSModulePath])exact(path,true);
      for(const key of ['APPDATA','LOCALAPPDATA','PROGRAMDATA','TEMP','USERPROFILE','SCRIPTC_CACHE_DIR','ZIG_GLOBAL_CACHE_DIR','ZIG_LOCAL_CACHE_DIR'])mkdirSync(c.childEnvironment[key],{recursive:true});
      before=packageSnapshot(c);save(join(c.root,'source-packages-before.json'),before);checkKnownPackages(before,expected);
      zigBefore=zigSnapshot(c);save(join(c.root,'zig-before.json'),zigBefore);checkKnownPackages(zigBefore,json(join(prior,'zig-tree.json')));
    });
    stage('ordinary-copy',()=>{
      const copied=[],excluded=[];
      for(const r of expected){if(c.exclusions.includes(r.path)){excluded.push(r);continue;}
        const source=exact(join(c.sourceRoot,r.path)),destination=join(c.root,r.path);mkdirSync(dirname(destination),{recursive:true});copyFileSync(source,destination,constants.COPYFILE_EXCL);
        const b=readFileSync(exact(destination));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);copied.push({path:r.path,bytes:b.length,sha256:hash(b)});
      }
      assert.deepEqual(excluded.map(r=>r.path),c.exclusions);save(join(c.root,'copied-inputs.json'),copied);save(join(c.root,'excluded-inputs.json'),excluded);
      for(const f of original.files)writeFileSync(join(c.root,f.path),f.utf8,{flag:'wx'});
      for(const name of ['supervise.ps1','supervisor.cs'])copyFileSync(join(here,name),join(c.root,name),constants.COPYFILE_EXCL);
      rootBefore=tree(c.root);save(join(c.root,'fresh-root-before.json'),rootBefore);
      save(join(c.root,'source-packages-before-invocation.json'),packageSnapshot(c));assert.deepEqual(packageSnapshot(c),before);
      // Check the complete copy immediately before any supervisor/compiler starts.
      const copiedNow=files(join(c.root,'node_modules')).map(r=>({...r,path:'node_modules/'+r.path}));
      checkKnownPackages(copiedNow,expected.filter(r=>!c.exclusions.includes(r.path)));
    });
    report.supervisor=await supervise(p,c.root);
    report.stages.push({name:'supervisor-returned',status:'complete'});
    stage('supervisor-outcome',()=>{
      const status=json(join(c.root,'supervisor-status.json'));report.compiler=status;report.compilerInvocations=typeof status.CreatedSuspended==='boolean'?(status.CreatedSuspended?1:0):null;
      assert.equal(report.supervisor.exit,0);assert.equal(report.supervisor.error,null);assert.equal(report.supervisor.signal,null);assert.equal(report.supervisor.watchdog,false);assert.equal(report.supervisor.killRequested,false);assert.equal(report.supervisor.closeObserved,true);assert.deepEqual(report.supervisor.ioErrors,[]);
      assert.equal(status.Outcome,'completed-observation');assert.equal(status.CleanupConfirmed,true);assert.equal(status.FinalActiveProcesses,0);assert.equal(status.NativeExitCode,0);
    });
    stage('metadata-evidence-only',()=>{
      const raw=readFileSync(join(c.root,'compiler.stdout.bin'));
      // Unknown metadata is retained as bytes first. JSON syntax alone proves no schema or provenance.
      let parsed;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch(e){throw Error('metadata-unrecognized: '+e.message);}
      report.metadata={rawSha256:hash(raw),rawBytes:raw.length,parsed,interpretation:'unreviewed data; no defaults or path closure inferred'};
    });
  } catch(e) {if(!report.failures.some(r=>r.message===e.message))report.failures.push({stage:'orchestration',name:e.name,code:e.code??null,message:e.message,stack:e.stack});}
  finally {
    for(const [name,fn] of [
      ['source-packages-after',()=>{const rows=packageSnapshot(c);save(join(c.root,'source-packages-after.json'),rows);if(before)assert.deepEqual(rows,before);}],
      ['zig-after',()=>{const rows=zigSnapshot(c);save(join(c.root,'zig-after.json'),rows);if(zigBefore)assert.deepEqual(rows,zigBefore);}],
      ['tools-after',()=>save(join(c.root,'tools-after.json'),[identity(c.node,c.nodeSha256),identity(c.supervisor,c.supervisorSha256),identity(c.cmd,c.cmdSha256),identity(c.zig,c.zigSha256)])],
      ['fresh-root-after',()=>{
        const after=tree(c.root);save(join(c.root,'fresh-root-after.json'),after);
        const old=new Map((rootBefore??[]).map(r=>[r.path,r])),now=new Map(after.map(r=>[r.path,r]));
        save(join(c.root,'fresh-root-differences.json'),{added:after.filter(r=>!old.has(r.path)),removed:[...old.values()].filter(r=>!now.has(r.path)),changed:after.filter(r=>old.has(r.path)&&JSON.stringify(r)!==JSON.stringify(old.get(r.path)))});
        if(rootBefore)for(const r of rootBefore)assert.deepEqual(now.get(r.path),r,'captured input drift '+r.path);
      }]
    ]){try{stage(name,fn);}catch{/* Retain each original error and continue independent collection. */}}
    report.outcome=report.failures.length?'failed-stop-review':'observation-collected-needs-schema-review';
    save(join(c.root,'result.json'),report); // No replacement, authority marker, automatic retry or cleanup.
  }
  if(report.failures.length)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await run();
