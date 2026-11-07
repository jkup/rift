import {spawn} from 'node:child_process';
// Loaded only beyond the entry gate. Tests supply synthetic transports instead.
export const clock={now:()=>Date.now(),set:(f,ms)=>setTimeout(f,ms),clear:id=>clearTimeout(id)};
export const transport={start(options,receive,credit){
  const child=spawn(options.executable,options.argv,{cwd:options.cwd,env:options.env,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});
  child.on('spawn',()=>receive({type:'spawn',pid:child.pid}));
  child.on('error',error=>receive({type:'error',message:String(error)}));
  child.on('exit',(code,signal)=>receive({type:'exit',code,signal}));
  for(const name of ['stdout','stderr']){
    const stream=child[name];
    stream.on('readable',()=>{for(;;){const n=credit(name);if(n<=0)return;const b=stream.read(Math.min(n,Math.max(1,stream.readableLength)));if(b===null)return;receive({type:'data',stream:name,bytes:b});}});
    stream.on('end',()=>receive({type:'eof',stream:name}));
    stream.on('error',e=>receive({type:'error',message:name+':'+String(e)}));
  }
  return {kill:()=>child.kill(),close:()=>{child.stdout.destroy();child.stderr.destroy();}};
}};
