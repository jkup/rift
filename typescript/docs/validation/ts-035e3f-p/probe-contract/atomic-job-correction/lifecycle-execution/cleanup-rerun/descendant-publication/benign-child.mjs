// Host-only lifecycle fixture. Never imports Rift or evaluates guest input.
import {writeFileSync,openSync,fsyncSync,closeSync,linkSync} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const [mode,root,token]=process.argv.slice(2);
if(!['zero','seven','idle','stdout-cap','stderr-cap','descendant','leaf'].includes(mode)||!root||!/^canary-[0-9a-f-]+$/.test(token))throw Error('canary-arguments');
writeFileSync(join(root,mode==='leaf'?'leaf-started.json':'child-started.json'),JSON.stringify({pid:process.pid,mode,token})+'\n',{flag:'wx'});
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
