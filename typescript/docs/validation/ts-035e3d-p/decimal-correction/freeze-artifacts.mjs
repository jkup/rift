import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,sha=b=>createHash('sha256').update(b).digest('hex');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
const files=walk(here).filter(p=>!p.endsWith('artifact-manifest.json')).sort().map(p=>({path:relative(here,p).replaceAll('\\','/'),sha256:sha(readFileSync(p))}));
files.push({path:'../../../script-conformance-preflight.md',sha256:sha(readFileSync(join(here,'../../../script-conformance-preflight.md')))});
writeFileSync(join(here,'artifact-manifest.json'),JSON.stringify({version:1,files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({artifacts:files.length}));
