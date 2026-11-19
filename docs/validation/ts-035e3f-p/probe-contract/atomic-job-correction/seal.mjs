import {readFileSync,readdirSync,lstatSync,writeFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,repo=resolve(here,'../../../../../..'),rows=[];
function add(p){const b=readFileSync(p);rows.push({path:relative(repo,p).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
function walk(p){for(const name of readdirSync(p).sort()){const q=join(p,name),s=lstatSync(q);if(s.isSymbolicLink()||(!s.isDirectory()&&s.nlink!==1))throw Error('alias');if(s.isDirectory())walk(q);else if(name!=='correction-manifest.json')add(q);}}
walk(here);add(join(repo,'typescript/docs/script-build-provenance.md'));rows.sort((a,b)=>a.path.localeCompare(b.path));writeFileSync(join(here,'correction-manifest.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});console.log(rows.length+' correction identities; no old seal rewritten');
