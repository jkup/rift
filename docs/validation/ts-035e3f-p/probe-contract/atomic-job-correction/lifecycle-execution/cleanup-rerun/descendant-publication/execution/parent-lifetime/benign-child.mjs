// Host-only lifecycle fixture. Never imports Rift or evaluates guest input.
import {writeFileSync,openSync,fsyncSync,closeSync,linkSync,readFileSync,existsSync,watch} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const [mode,root,token]=process.argv.slice(2);
if(!['zero','seven','idle','stdout-cap','stderr-cap','descendant','leaf','descendant-live','descendant-exit-diagnostic','leaf-ready'].includes(mode)||!root||!/^canary-[0-9a-f-]+$/.test(token))throw Error('canary-arguments');
writeFileSync(join(root,(mode==='leaf'||mode==='leaf-ready')?'leaf-started.json':'child-started.json'),JSON.stringify({pid:process.pid,mode,token})+'\n',{flag:'wx'});
// New modes only; historical descendant/root-exit mode below stays unchanged.
function publishClosed(name,value) {
 const published=join(root,name),staging=published+'.pending',fd=openSync(staging,'wx');
 let failure;
 try {writeFileSync(fd,value);fsyncSync(fd);}catch(e){failure=e;}
 try {closeSync(fd);}catch(e){if(failure!==undefined)throw new AggregateError([failure,e],'lifecycle-publication-write-and-close');throw e;}
 if(failure!==undefined)throw failure;
 linkSync(staging,published);
}
const identity=()=>({pid:process.pid,ppid:process.ppid,execPath:process.execPath,node:process.version,uv:process.versions.uv,mode,token});
if(mode==='leaf-ready') {
 if(!process.send)throw Error('leaf-ipc-missing');
 // A referenced IPC listener keeps the leaf alive without a timing sleep.
 process.on('message',()=>{throw Error('unexpected-leaf-control');});
 const ready=identity();
 publishClosed('leaf-ready.json',JSON.stringify(ready)+'\n');
 process.send({type:'leaf-ready',identity:ready},e=>{if(e)throw e;});
 // Same keepalive as the historical leaf, not a readiness delay. In particular,
 // IPC disconnect on parent exit must not itself end the diagnostic leaf.
 setInterval(()=>{},1000);
} else if(mode==='descendant-live'||mode==='descendant-exit-diagnostic') {
 let readyReceived=false;
 const child=spawn(process.execPath,[import.meta.filename,'leaf-ready',root,token],{windowsHide:true,stdio:['ignore','ignore','inherit','ipc'],env:process.env});
 let watcher;
 if(mode==='descendant-exit-diagnostic') {
  // Publication is closed before the request filename becomes visible. A lost
  // watch notification is a bounded diagnostic failure, never a retry loop.
  watcher=watch(root,()=>{
   const request=join(root,'parent-exit-request.json');
   if(!existsSync(request))return;
   const command=JSON.parse(readFileSync(request,'utf8'));
   if(!readyReceived||command.action!=='exit-parent'||command.token!==token)throw Error('invalid-parent-exit-request');
   publishClosed('parent-exit-intent.json',JSON.stringify({...identity(),leafPid:child.pid,code:0})+'\n');
   process.exit(0);
  });
  watcher.on('error',e=>{throw e;});
 }
 child.once('spawn',()=>publishClosed('leaf-spawn.json',JSON.stringify({parent:identity(),pid:child.pid,argv:child.spawnargs})+'\n'));
 child.once('error',e=>{
  try {publishClosed('leaf-error.json',JSON.stringify({name:e.name,message:e.message,code:e.code??null,syscall:e.syscall??null,pid:child.pid??null,readyReceived})+'\n');}
  catch(publicationError){throw new AggregateError([e,publicationError],'leaf-error-evidence-failed');}
  throw e;
 });
 child.once('exit',(code,signal)=>{
  const evidence={pid:child.pid,code,signal,readyReceived},failure=Error('leaf-exited-before-supervisor-action '+JSON.stringify(evidence));
  try {publishClosed('leaf-exit.json',JSON.stringify(evidence)+'\n');}
  catch(publicationError){throw new AggregateError([failure,publicationError],'leaf-exit-evidence-failed');}
  throw failure;
 });
 child.once('message',message=>{
  if(message?.type!=='leaf-ready'||message.identity?.pid!==child.pid||message.identity?.ppid!==process.pid||message.identity?.token!==token)throw Error('leaf-ready-identity-mismatch');
  const closed=JSON.parse(readFileSync(join(root,'leaf-ready.json'),'utf8'));
  if(JSON.stringify(closed)!==JSON.stringify(message.identity))throw Error('leaf-ready-publication-mismatch');
  readyReceived=true;
  publishClosed('parent-ready.json',JSON.stringify({parent:identity(),leaf:closed})+'\n');
  publishClosed('descendant-pid.txt',String(child.pid)+'\n');
  // Keep parent and IPC referenced until supervisor death, or the separately
  // gated diagnostic request. No unref, detach, breakaway, or scheduled exit.
 });
} else
if(mode==='zero'){process.stdout.write('ok\n');}
else if(mode==='seven'){process.exitCode=7;}
else if(mode==='descendant'){
 const child=spawn(process.execPath,[import.meta.filename,'leaf',root,token],{windowsHide:true,stdio:'ignore',env:process.env});
 child.once('spawn',()=>{
  const published=join(root,'descendant-pid.txt'),staging=published+'.pending';
  const fd=openSync(staging,'wx');
  let failure;
  try {writeFileSync(fd,String(child.pid)+'\n');fsyncSync(fd);}catch(e){failure=e;}
  try {closeSync(fd);}catch(e){if(failure!==undefined)throw new AggregateError([failure,e],'descendant-pid-write-and-close');throw e;}
  if(failure!==undefined)throw failure;
  // Publish closed, complete bytes without replacing an existing name.
  // Retain the staging alias as evidence; never write either path again.
  linkSync(staging,published);
  child.unref();process.exit(0);
 });
 child.once('error',e=>{throw e;});
}else {if(mode==='stdout-cap')process.stdout.write(Buffer.alloc(8388609,0x61));if(mode==='stderr-cap')process.stderr.write(Buffer.alloc(8388609,0x62));setInterval(()=>{},1000);}
