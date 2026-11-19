import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,runtime=resolve(here,'../../../build/ts035e3h-link-command-observation'),b=fs.readFileSync(join(runtime,'contract.json')),cfg=JSON.parse(b);
const hex=s=>Array.from({length:s.length},(_,i)=>s.charCodeAt(i).toString(16).padStart(4,'0')).join('');
fs.writeFileSync(join(here,'staged-literals.json'),JSON.stringify({source:{path:join(runtime,'contract.json'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')},asciiEscapeOffsets:[...b.toString().matchAll(/\\u(?:d800|dc00)/g)].map(m=>({byteOffset:Buffer.byteLength(b.toString().slice(0,m.index)),literal:m[0]})),argv:cfg.argv.map((s,index)=>({configIndex:index,recordIndex:index+1,units:hex(s)})),environmentValue:{name:'RIFT_UNITS',units:hex(cfg.childEnvironment.RIFT_UNITS)},decoder:'Offline Node JSON aid; not measured PowerShell intermediate.'},null,2)+'\n',{flag:'wx'});
fs.copyFileSync(resolve(here,'../ts-035e3h-runtime-exec/field-differences.json'),join(here,'measured-differences.json'),fs.constants.COPYFILE_EXCL);
