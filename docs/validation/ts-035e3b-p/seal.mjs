// Explicit final manifest authoring. Does not modify proposals or old files.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url)),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const name of ['proposal-manifest.json','new-file-manifest.json']){
 const rows=JSON.parse(readFileSync(resolve(here,name)));
 for(const row of rows)row[name==='proposal-manifest.json'?'after':'sha256']=hash(resolve(here,row.proposal));
 writeFileSync(resolve(here,name),JSON.stringify(rows,null,2)+'\n');
}
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):[resolve(dir,e.name)]);}
const rows=walk(here).filter(p=>!['artifacts.json','verification.json'].includes(relative(here,p).replaceAll('\\','/'))).sort().map(p=>({path:relative(here,p).replaceAll('\\','/'),sha256:hash(p)}));
writeFileSync(resolve(here,'artifacts.json'),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({artifacts:rows.length}));
