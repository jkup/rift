// One-time final manifest creation. Verification is separate and read-only.
import {readFileSync as read,writeFileSync as write,readdirSync as ls} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';
const here=fileURLToPath(new URL('./',import.meta.url)),root=fileURLToPath(new URL('../../../',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const save=(p,x)=>write(join(here,p),JSON.stringify(x,null,2)+'\n');
const entry=p=>{const b=read(join(root,p));return {path:p,bytes:b.length,sha256:sha(b)};};
const proposals=['script-host-services.mjs','script-host-services.test.mjs'].map(name=>({path:'typescript/tools/test262/'+name,proposal:'proposals/'+name,oldSha256:null,sha256:sha(read(join(here,'proposals',name)))}));
save('proposal-manifest.json',{base:'760b25fead20bc0f10a41aba53db1a2b07d3e430',replacements:[],additions:proposals});
const mainPaths=['docs/validation/ts-035e3b-p/future-wire-literals.json','docs/validation/ts-035e3b-p/future-producer-literals.json'];
save('main-request-literals.json',mainPaths.map(path=>({...entry(path),records:JSON.parse(read(join(root,path)))})));
save('accepted-build-details.json',['generated-closure.json','fresh-native-outputs.json','native-build-results.json','copied-inputs.json','completion.json','complete-artifact-index.json','complete-artifacts.json.gz'].map(p=>entry('docs/validation/ts-035e3d/'+p)));
function walk(p){return ls(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):e.isFile()?[join(p,e.name)]:[]).sort();}
const excluded=new Set(['evidence-manifest.json','verify-result.txt','verify-implemented-result.txt']);
const files=walk(here).filter(p=>!excluded.has(relative(here,p).replaceAll('\\','/'))).map(p=>({path:relative(here,p).replaceAll('\\','/'),sha256:sha(read(p))}));
save('evidence-manifest.json',{design:entry('docs/script-execution-identity.md'),files});
console.log(JSON.stringify({proposals:proposals.length,evidence:files.length}));
