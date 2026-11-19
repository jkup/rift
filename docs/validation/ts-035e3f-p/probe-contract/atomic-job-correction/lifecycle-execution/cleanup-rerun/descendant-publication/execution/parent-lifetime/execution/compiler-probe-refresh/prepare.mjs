// Source authoring only. Never invokes a wrapper, C# compiler, or scriptc.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,previous=resolve(here,'..'),accepted=resolve(here,'../..'),repo=resolve(here,...Array(13).fill('..')),original=join(repo,'typescript/docs/validation/ts-035e3f-p'),old=join(original,'probe-contract');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),write=(n,b)=>writeFileSync(join(here,n),b,{flag:'wx'}),json=(n,v)=>write(n,JSON.stringify(v,null,2)+'\n'),rows=[];
function save(name,source,replacements=[]){const before=read(source);let s=before.toString();for(const r of replacements){assert.equal(s.split(r.old).length,2,name+' '+r.old);s=s.replace(r.old,r.next);}const b=Buffer.from(s);write(name,b);rows.push({name,source:relative(repo,source).replaceAll('\\','/'),sourceBytes:before.length,sourceSha256:hash(before),bytes:b.length,sha256:hash(b),replacements});}
save('supervisor.cs',join(accepted,'supervisor.cs'));
for(const n of ['contract.json','expected-plan.json'])save(n,join(old,n));
const runner=read(join(old,'runner.mjs')).toString(),begin=runner.indexOf('function supervise(p,root) {'),end=runner.indexOf('async function run() {',begin);
const oldOutcome=runner.slice(runner.indexOf("      const status=json(join(c.root,'supervisor-status.json'));"),runner.indexOf("    stage('metadata-evidence-only'"));
const outcome=[
"      const raw=readFileSync(join(c.root,'supervisor-status.json'));report.statusBytes={bytes:raw.length,sha256:hash(raw)};",
"      const status=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));report.compiler=status;",
"      const inspection=inspectStatus(status);report.compilerInvocations=inspection.compilerInvocations;",
"      report.cleanupObservation={statusReported:inspection.cleanupReported,supervisorClosed:report.supervisor.closeObserved,watchdogIntervened:report.supervisor.watchdog,unconfirmed:!inspection.cleanupReported||!report.supervisor.closeObserved||report.supervisor.watchdog||report.supervisor.killRequested,independent:false};",
"      assert.equal(report.supervisor.exit,0);assert.equal(report.supervisor.error,null);assert.equal(report.supervisor.signal,null);assert.equal(report.supervisor.watchdog,false);assert.equal(report.supervisor.killRequested,false);assert.equal(report.supervisor.closeObserved,true);assert.deepEqual(report.supervisor.ioErrors,[]);",
"      for(const s of Object.values(report.supervisor.streams))assert.equal(s.overflow,false);",
"      const stdout=readFileSync(exact(join(c.root,'compiler.stdout.bin'))),stderr=readFileSync(exact(join(c.root,'compiler.stderr.bin')));",
"      validateCompletedStatus(status,stdout,stderr);",
"    });",
''
].join('\n');
save('runner.mjs',join(old,'runner.mjs'),[
 {old:"const here=import.meta.dirname,prior=resolve(here,'..');",next:"const here=import.meta.dirname,prior=resolve(here,"+JSON.stringify(relative(here,original).replaceAll('\\','/'))+");"},
 {old:'// Only pure planning is exported, to permit full literal checks without process setup.',next:'// Only pure planning/status validation is exported for offline literal checks.'},
 {old:runner.slice(begin,end),next:read(join(here,'status-checks.txt')).toString()+'\n'+read(join(here,'supervise-function.txt')).toString()+'\n'},
 {old:"  await import('./verify.mjs');",next:"  const {preflight}=await import('./verify.mjs');preflight();"},
 {old:"assert.equal(c.sourceRoot,resolve(here,'../../../..'))",next:"assert.equal(c.sourceRoot,resolve(prior,'../../..'))"},
 {old:'metadata:null};',next:'metadata:null,cleanupObservation:{statusReported:null,supervisorClosed:null,watchdogIntervened:null,unconfirmed:true,independent:false}};'},
 {old:oldOutcome,next:outcome}
]);
// Full wrapper replacement is retained explicitly for review; no old file edits.
const before=read(join(old,'supervise.ps1')),after=read(join(here,'supervise.ps1'));rows.push({name:'supervise.ps1',source:relative(repo,join(old,'supervise.ps1')).replaceAll('\\','/'),sourceBytes:before.length,sourceSha256:hash(before),bytes:after.length,sha256:hash(after),replacements:[{old:before.toString(),next:after.toString()}]});
json('transformations.json',{base:'d39d8cf5d0f3c735cee1577015a6a00bfd1f1286',rows});
write('prior-design.md',read(join(repo,'typescript/docs/script-build-provenance.md')));const p=join(previous,'manifest.json'),b=read(p);json('prior-manifest.json',{path:relative(repo,p).replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});
json('input-links.json',['probe-proposal.json','installed-packages.json','zig-tree.json','project-inputs.json'].map(n=>{const p=join(original,n),b=read(p);return {path:relative(repo,p).replaceAll('\\','/'),bytes:b.length,sha256:hash(b)};}));
console.log(JSON.stringify({frozenFiles:rows.length,contractAndPlanUnchanged:true,acceptedNoninstrumentedSupervisorUnchanged:true,compilerInvocations:0,csharpCompilations:0}));
