// Evidence I/O only: retain initial failures; bounded retry of Windows UNKNOWN/open.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
const wait=new Int32Array(new SharedArrayBuffer(4));
const sync=fs.writeFileSync;fs.writeFileSync=function(...args){for(let i=0;;i++){try{return sync.apply(this,args);}catch(e){if(e.code!=='UNKNOWN'||e.syscall!=='open'||i===19)throw e;Atomics.wait(wait,0,0,50);}}};
const asyncWrite=fsp.writeFile;fsp.writeFile=async function(...args){for(let i=0;;i++){try{return await asyncWrite.apply(this,args);}catch(e){if(e.code!=='UNKNOWN'||e.syscall!=='open'||i===19)throw e;await new Promise(r=>setTimeout(r,50));}}};
syncBuiltinESMExports();
