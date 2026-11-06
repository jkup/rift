// Design authoring only. Never imports the fixture or starts the lifecycle.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,prior=resolve(here,'..'),correction=resolve(here,'../../..'),repo=resolve(here,'../../../../../../../../..');
const read=p=>readFileSync(p),write=(n,b)=>writeFileSync(join(here,n),b,{flag:'wx'}),json=(n,v)=>write(n,JSON.stringify(v,null,2)+'\n');
const hash=b=>createHash('sha256').update(b).digest('hex');
const rows=[];
function save(name,source,replacements=[]){const before=read(source);let s=before.toString();for(const r of replacements){assert.equal(s.split(r.old).length,2,name);s=s.replace(r.old,r.next);}const b=Buffer.from(s);write(name,b);rows.push({name,source:relative(repo,source).replaceAll('\\','/'),sourceBytes:before.length,sourceSha256:hash(before),bytes:b.length,sha256:hash(b),replacements});}
const fixtureReplacements=[{old:"import {writeFileSync} from 'node:fs';",next:"import {writeFileSync,openSync,fsyncSync,closeSync,linkSync} from 'node:fs';"},{old:" child.once('spawn',()=>{writeFileSync(join(root,'descendant-pid.txt'),String(child.pid)+'\\n',{flag:'wx'});child.unref();process.exit(0);});",next:[
" child.once('spawn',()=>{",
"  const published=join(root,'descendant-pid.txt'),staging=published+'.pending';",
"  const fd=openSync(staging,'wx');",
"  let failure;",
"  try {writeFileSync(fd,String(child.pid)+'\\n');fsyncSync(fd);}catch(e){failure=e;}",
"  try {closeSync(fd);}catch(e){if(failure!==undefined)throw new AggregateError([failure,e],'descendant-pid-write-and-close');throw e;}",
"  if(failure!==undefined)throw failure;",
"  // Publish closed, complete bytes without replacing an existing name.",
"  // Retain the staging alias as evidence; never write either path again.",
"  linkSync(staging,published);",
"  child.unref();process.exit(0);",
" });"].join('\n')}];
save('benign-child.mjs',join(correction,'benign-child.mjs'),fixtureReplacements);
for(const n of ['contract.json','pump-literals.json','stream-literals.json','observer.cs','lifecycle-supervise.ps1','supervisor.cs'])save(n,join(prior,'reviewed-inputs',n));
for(const n of ['test-hooks.cs','supervisor.lifecycle.cs','supervisor.legacy-control.cs'])save(n,join(prior,'proposed-'+n));
const oldRoot='C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3fp-atomic-job-lifecycle-cleanup',newRoot='C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3fp-atomic-job-lifecycle-publication';
save('lifecycle-runner.ps1',join(prior,'reviewed-inputs/lifecycle-runner.ps1'),[
 {old:"& $contract.node 'C:\\Users\\jonku\\code\\rift\\typescript\\docs\\validation\\ts-035e3f-p\\probe-contract\\atomic-job-correction\\lifecycle-execution\\verify.mjs' --check-original-build",next:"& $contract.node (Join-Path $here 'verify.mjs') --check-original-build --preflight"},
 {old:"$root='"+oldRoot+"'",next:"$root='"+newRoot+"'"}
]);
const cases=JSON.parse(read(join(correction,'lifecycle-cases.json')));json('lifecycle-cases.json',cases.slice(13));
json('transformations.json',{sourceCommit:'2e4c61b2b6ea88d0801a55d2c2df21605d553fea',rows});
json('plan.json',{status:'design-only-not-authorized-to-execute',root:newRoot,caseOrdinals:[14,15,16,17,18,19,20,21,22,23,24,25],caseIds:cases.slice(13).map(c=>c.id),maxFutureInvocations:1,firstUnexpectedResult:'stop, preserve original error, confirm outer safety cleanup, no retry',compilerInvocations:0,completedLifecycleInvocationsThisDesign:0,outputReuse:false});
write('prior-design.md',read(join(repo,'typescript/docs/script-build-provenance.md')));
const p=join(prior,'manifest.json'),b=read(p);json('prior-manifest.json',{path:relative(repo,p).replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});
console.log(JSON.stringify({fullSourceTransformations:rows.length,futureCases:12,lifecycleInvocations:0,scriptcInvocations:0}));
