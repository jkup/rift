// Producer-only artifact index generation, not an acceptance verifier.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=[];
function walk(dir,prefix=''){for(const e of readdirSync(dir,{withFileTypes:true})){const p=prefix+e.name;if(e.isSymbolicLink())throw Error('unexpected link');if(e.isDirectory())walk(resolve(dir,e.name),p+'/');else if(p!=='artifacts.json')files.push(p);}}
walk(here);files.push('../../script-execution-receipts.md');files.sort();
writeFileSync(resolve(here,'artifacts.json'),JSON.stringify(files.map(path=>({path,sha256:hash(readFileSync(resolve(here,path)))})),null,2)+'\n');
console.log(JSON.stringify({ownedArtifacts:files.length}));
