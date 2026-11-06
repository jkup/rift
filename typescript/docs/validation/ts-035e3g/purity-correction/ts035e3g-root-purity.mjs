import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
const {validateBindings}=await import('../docs/validation/ts-035e3g/adapter.mjs');
let calls=0;
const saved=fs.realpathSync;
fs.realpathSync=()=>{calls++;throw new Error('root I/O sentinel');};
syncBuiltinESMExports();
let actual;
try { actual={returned:validateBindings(null)}; }
catch(e){ actual={thrown:e.constructor.name,message:e.message}; }
finally {fs.realpathSync=saved;syncBuiltinESMExports();}
const result={expected:{returned:{kind:'binding-error',index:null,code:'ORDER'},filesystemCalls:0},actual:{...actual,filesystemCalls:calls},realArchiveInvocations:0};
fs.writeFileSync(new URL('./ts035e3g-root-purity.json',import.meta.url),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify(result));
