import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync,readdirSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
const here=import.meta.dirname,root=resolve(here,'../../..');
const sandbox=mkdtempSync(join(root,'build/ts035e3b-validation-'));
const copied=[],hash=b=>createHash('sha256').update(b).digest('hex');
function copy(relative){
 const from=join(root,relative),to=join(sandbox,relative);
 function inspect(p){const s=lstatSync(p);assert(!s.isSymbolicLink(),p);if(s.isDirectory())for(const n of readdirSync(p))inspect(join(p,n));else copied.push({path:p,sha256:hash(readFileSync(p))});}
 inspect(from);mkdirSync(dirname(to),{recursive:true});cpSync(from,to,{recursive:true,errorOnExist:true,force:false});
}
// Ordinary copies only. Every inherited evidence writer runs against this copy.
for(const p of ['src','test','probes','tools','fixtures','package.json','package-lock.json','tsconfig.json','build/node','build/native','build/native-build-results.json','node_modules/yaml','node_modules/typescript','node_modules/@typescript','node_modules/@types','node_modules/undici-types','node_modules/scriptc','node_modules/@scriptc'])copy(p);
for(const p of readdirSync(join(root,'docs/validation')))if(p!=='ts-035e3b')copy('docs/validation/'+p);
writeFileSync(join(here,'copied-inputs.json'),JSON.stringify(copied,null,2)+'\n',{flag:'wx'});
writeFileSync(join(here,'run-location.json'),JSON.stringify({sandbox,copied:copied.length},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({sandbox,copied:copied.length}));
