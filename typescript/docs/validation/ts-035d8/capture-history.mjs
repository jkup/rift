import fs from 'node:fs';
import promises from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const rawCopy=fs.copyFileSync,raw=fs.writeFileSync,asyncWrite=promises.writeFile,root=resolve('docs/validation');
function capture(path){
 if(typeof path!=='string'&&!(path instanceof URL))return;
 const absolute=resolve(path instanceof URL?fileURLToPath(path):path);
 let rel=relative(root,absolute).replaceAll('\\','/');
 const buildRelative=relative(resolve('build'),absolute).replaceAll('\\','/');
 if(!buildRelative.startsWith('../')&&buildRelative.endsWith('-results.json'))rel='build/'+buildRelative;
 if(rel.startsWith('../')||rel.startsWith('ts-035d8/')||rel==='')return;
 const target=resolve(root,'ts-035d8','inherited',process.env.D8_STAGE??'unknown',rel);
 fs.mkdirSync(dirname(target),{recursive:true});raw(target,fs.readFileSync(absolute));
}
fs.writeFileSync=function(...args){for(let attempt=0;;attempt++){try{const r=raw.apply(this,args);capture(args[0]);return r;}catch(e){if(e.code!=='UNKNOWN'||e.syscall!=='open'||attempt>=20)throw e;process.stderr.write('D8 evidence I/O retry '+(attempt+1)+': '+String(args[0])+'\n');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);}}};
promises.writeFile=async function(...args){for(let attempt=0;;attempt++){try{const r=await asyncWrite.apply(this,args);capture(args[0]);return r;}catch(e){if(e.code!=='UNKNOWN'||e.syscall!=='open'||attempt>=20)throw e;process.stderr.write('D8 async evidence I/O retry '+(attempt+1)+': '+String(args[0])+'\n');await new Promise(r=>setTimeout(r,50));}}};
fs.copyFileSync=function(...args){const r=rawCopy.apply(this,args);capture(args[1]);return r;};
syncBuiltinESMExports();
