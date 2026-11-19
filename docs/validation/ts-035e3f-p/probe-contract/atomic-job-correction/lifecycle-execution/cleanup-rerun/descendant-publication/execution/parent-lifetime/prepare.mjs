// Offline source authoring. No fixture import, native helper or lifecycle launch.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,execution=resolve(here,'..'),base=resolve(here,'../..'),repo=resolve(here,'../../../../../../../../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),write=(n,b)=>writeFileSync(join(here,n),b,{flag:'wx'}),json=(n,v)=>write(n,JSON.stringify(v,null,2)+'\n'),rows=[];
function save(name,source,replacements=[]){const b=read(source);let text=b.toString();for(const r of replacements){assert.equal(text.split(r.old).length,2,name+' '+r.old);text=text.replace(r.old,r.next);}const out=Buffer.from(text);write(name,out);rows.push({name,source:relative(repo,source).replaceAll('\\','/'),sourceBytes:b.length,sourceSha256:hash(b),bytes:out.length,sha256:hash(out),replacements});}
const fixture=[
 {old:'closeSync,linkSync}',next:'closeSync,linkSync,readFileSync,existsSync,watch}'},
 {old:"'descendant','leaf']",next:"'descendant','leaf','descendant-live','descendant-exit-diagnostic','leaf-ready']"},
 {old:"mode==='leaf'?'leaf-started.json'",next:"(mode==='leaf'||mode==='leaf-ready')?'leaf-started.json'"},
 {old:"if(mode==='zero')",next:read(join(here,'fixture-addition.txt')).toString()+"if(mode==='zero')"}
];save('benign-child.mjs',join(base,'benign-child.mjs'),fixture);
save('observer.cs',join(base,'observer.cs'),[
 {old:' public void KillRoot()',next:read(join(here,'observer-addition.txt')).toString()+' public void KillRoot()'},
 {old:'public void Dispose(){',next:'public void Dispose(){foreach(var handle in observed.Values)CloseHandle(handle);observed.Clear();'}
]);
for(const name of ['contract.json','pump-literals.json','stream-literals.json','lifecycle-supervise.ps1','supervisor.cs','supervisor.lifecycle.cs','supervisor.legacy-control.cs','test-hooks.cs'])save(name,join(base,name));
const oldRunner=read(join(base,'lifecycle-runner.ps1')).toString(),start=oldRunner.indexOf("   if($case.action -eq 'kill-descendant'){"),end=oldRunner.indexOf("   if($case.action -eq 'race-kill'){",start);assert(start>=0&&end>start);
const oldRoot='C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3fp-atomic-job-lifecycle-publication',newRoot='C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3fp-atomic-job-lifecycle-parent-live';
const edits=[{old:"$root='"+oldRoot+"'",next:"$root='"+newRoot+"'"},
 {old:"@('kill','release','kill-descendant','race-kill')",next:"@('kill','release','kill-descendant','race-kill','observe-parent-exit')"},
 {old:oldRunner.slice(start,end),next:read(join(here,'harness-readiness.txt')).toString()},
 {old:"if($case.action -in @('kill','kill-descendant','race-kill'))",next:"if($case.action -in @('kill','kill-descendant','race-kill','observe-parent-exit'))"},
 {old:"if($case.action -notin @('kill','kill-descendant','race-kill'))",next:"if($case.action -notin @('kill','kill-descendant','race-kill','observe-parent-exit'))"},
 {old:"  $row.status='matched-future-literal'",next:"  $row.status=if($case.action -eq 'observe-parent-exit'){'diagnostic-observation-complete'}else{'matched-future-literal'}"},
 {old:"if($row.status -ne 'matched-future-literal')",next:"if($row.status -notin @('matched-future-literal','diagnostic-observation-complete'))"}
];save('lifecycle-runner.ps1',join(base,'lifecycle-runner.ps1'),edits);
save('diagnostic-runner.ps1',join(here,'lifecycle-runner.ps1'),[
 {old:"'lifecycle-cases.json'",next:"'diagnostic-cases.json'"},
 {old:"$root='"+newRoot+"'",next:"$root='"+newRoot+"-diagnostic'"},
 {old:'--check-original-build --preflight',next:'--check-original-build --preflight --diagnostic'}
]);
const cases=JSON.parse(read(join(base,'lifecycle-cases.json'))).slice(7);assert.equal(cases.length,5);assert.equal(cases[0].id,'death-with-descendant');cases[0].id='death-with-live-descendant';cases[0].mode='descendant-live';json('lifecycle-cases.json',cases);
json('diagnostic-cases.json',[{id:'parent-exit-diagnostic',source:'corrected',mode:'descendant-exit-diagnostic',pauseAt:'after-resume',fault:'',action:'observe-parent-exit',expect:'diagnostic-observation',resumed:null,stop:null}]);
json('plan.json',{status:'design-only-execution-not-authorized',root:newRoot,diagnosticRoot:newRoot+'-diagnostic',remainingOriginalOrdinals:[21,22,23,24,25],changedCase:{oldId:'death-with-descendant',newId:'death-with-live-descendant',oldMode:'descendant',newMode:'descendant-live',meaning:'supervisor death with independently confirmed live parent and ready leaf'},diagnosticSeparate:true,diagnosticVerdicts:['leaf-exited-after-parent-exit','leaf-running-at-deadline-after-parent-exit'],executions:0,compilerInvocations:0});
json('transformations.json',{sourceCommit:'7e1d0e370706bf0c97adfd5fe227de04ce336297',rows});
write('prior-design.md',read(join(repo,'typescript/docs/script-build-provenance.md')));const p=join(execution,'manifest.json'),b=read(p);json('prior-manifest.json',{path:relative(repo,p).replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});
const contract=JSON.parse(read(join(base,'contract.json')));assert.equal(hash(read(contract.node)),contract.nodeSha256);
json('runtime-audit.json',{node:process.version,uv:process.versions.uv,execPath:process.execPath,pinnedNodePath:contract.node,pinnedNodeSha256:contract.nodeSha256,hostIntrospectionOnly:true,fixtureInvocations:0,builtinChildProcessSha256:hash(Buffer.from(process.binding('natives').child_process)),builtinInternalChildProcessSha256:hash(Buffer.from(process.binding('natives')['internal/child_process'])),sourceReferences:['https://github.com/libuv/libuv/blob/v1.52.1/src/win/process.c#L65-L114','https://github.com/libuv/libuv/blob/v1.52.1/src/win/process.c#L1016-L1045','https://nodejs.org/api/child_process.html#event-spawn'],installedNativeBinarySourceEquivalenceProven:false});
console.log(JSON.stringify({fullSourceTransformations:rows.length,remainingCases:5,separateDiagnosticCases:1,lifecycleInvocations:0,csharpCompilations:0}));
