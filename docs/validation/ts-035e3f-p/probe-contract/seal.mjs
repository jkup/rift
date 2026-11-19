// One-time NEW continuation manifest only. Never touches any previous hash file.
import {readFileSync,readdirSync,lstatSync,writeFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,repo=resolve(here,'../../../../..'),rows=[];
function add(p){const b=readFileSync(p);rows.push({path:relative(repo,p).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
function visit(p){for(const n of readdirSync(p).sort()){const q=join(p,n),s=lstatSync(q);if(s.isSymbolicLink()||(!s.isDirectory()&&s.nlink!==1))throw Error('alias '+q);if(s.isDirectory())visit(q);else if(n!=='guard-manifest.json')add(q);}}
visit(here);add(join(repo,'typescript/docs/script-build-provenance.md'));rows.sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync(join(here,'guard-manifest.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});console.log(rows.length+' new identities sealed; old seals untouched');
