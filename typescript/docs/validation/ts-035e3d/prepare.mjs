import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
const here=import.meta.dirname,root=resolve(here,'../../..'),sandbox=mkdtempSync(join(root,'build/ts035e3d-implementation-'));
const copied=[],hash=b=>createHash('sha256').update(b).digest('hex');
function copy(relative){
 const from=join(root,relative),to=join(sandbox,relative);
 function inspect(p){const stat=lstatSync(p);assert(!stat.isSymbolicLink(),p);if(stat.isDirectory())for(const name of readdirSync(p))inspect(join(p,name));else copied.push({path:p,sha256:hash(readFileSync(p))});}
 inspect(from);mkdirSync(dirname(to),{recursive:true});cpSync(from,to,{recursive:true,errorOnExist:true,force:false});
}
for(const p of ['src','test','probes','tools','fixtures','package.json','package-lock.json','tsconfig.json','node_modules/yaml','node_modules/typescript','node_modules/@typescript','node_modules/@types','node_modules/undici-types','node_modules/scriptc','node_modules/@scriptc'])copy(p);
for(const name of readdirSync(join(root,'docs/validation')))if(name!=='ts-035e3d')copy('docs/validation/'+name);

assert(!existsSync(join(sandbox,'build/node')));assert(!existsSync(join(sandbox,'build/native')));assert(!existsSync(join(sandbox,'src/script-producer-request.ts')));
const gates=[...readFileSync(join(root,'tools/build-native.mjs'),'utf8').matchAll(/\["((?:src|test)\/[^"\n]+\.ts)", "([^"\n]+)"\]/g)].map(m=>({entry:m[1],binary:m[2]+'.exe'}));assert.equal(gates.length,71);
const explicitlyReferenced=['harness-bundle','observation-driver','observation-serialization','script-assignment-target-audit','script-assignment-target-dispatch','script-lexical-statement-audit','script-lexical-statement-dispatch','script-observation-driver','script-observation','script-observation-serialization','script-strict-parameter-audit','script-strict-parameter-dispatch','script-strict-rule-audit','script-strict-rule-dispatch','script-throw-inspection'];
for(const name of explicitlyReferenced)assert(gates.some(g=>g.binary===name+'.exe'),name);
writeFileSync(join(here,'copied-inputs.json'),JSON.stringify(copied,null,2)+'\n',{flag:'wx'});
writeFileSync(join(here,'run-location.json'),JSON.stringify({sandbox,copied:copied.length,gates,explicitlyReferenced,nativeBinariesCopied:0,nodeBinariesCopied:0,sourceModuleAbsent:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({sandbox,copied:copied.length,freshEmptyBuildOutputs:true,allRequiredHelpersIn71Gates:true}));
