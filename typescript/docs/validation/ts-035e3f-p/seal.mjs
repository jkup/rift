// One-time manifest authoring, never used to repair failed validation.
import {readFileSync,readdirSync,lstatSync,writeFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),files=[];
function add(p){const b=readFileSync(p);files.push({path:relative(repo,p).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
function walk(p){for(const n of readdirSync(p).sort()){const q=join(p,n),s=lstatSync(q);if(s.isSymbolicLink())throw Error('live alias '+q);if(s.isDirectory())walk(q);else if(n!=='artifact-manifest.json')add(q);}}
walk(here);add(resolve(here,'../../script-build-provenance.md'));
writeFileSync(join(here,'artifact-manifest.json'),JSON.stringify(files.sort((a,b)=>a.path.localeCompare(b.path)),null,2)+'\n',{flag:'wx'});
console.log(files.length+' artifact identities sealed');
