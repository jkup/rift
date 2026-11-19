import {readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const here=import.meta.dirname;
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const path=join(dir,e.name);assert(!lstatSync(path).isSymbolicLink(),path);return e.isDirectory()?files(path):[path];});}
const rows=files(here).filter(p=>!['artifacts.json','verification.json'].includes(p.slice(here.length+1))).map(path=>({path:path.slice(here.length+1).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(join(here,'artifacts.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({artifacts:rows.length}));
