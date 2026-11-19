import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=fileURLToPath(new URL('./',import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const manifest={base:'55ffc90401ea6f83ce82239db6b5d992174ec77c',claim:'Capture oracle correction only; input implementation unchanged; no installation permission.',
 designSha256:hash(readFileSync(resolve(here,'../../../script-execution-selection.md'))),
 originalDesignSha256:hash(readFileSync(resolve(here,'original/script-execution-selection.md'))),
 originalArtifactManifestSha256:hash(readFileSync(resolve(here,'../artifact-manifest.json'))),
 replacements:[],additions:[
  {path:'tools/test262/script-execution-inputs.mjs',proposal:'../proposals/script-execution-inputs.mjs',sha256:hash(readFileSync(resolve(here,'../proposals/script-execution-inputs.mjs')))},
  {path:'tools/test262/script-execution-inputs.test.mjs',proposal:'script-execution-inputs.test.mjs',sha256:hash(readFileSync(resolve(here,'script-execution-inputs.test.mjs')))}
 ],literals:['capture-occurrence-tables.json','pinned-byte-identities.json','expected-captures.json.gz'].map(path=>({path,sha256:hash(readFileSync(resolve(here,path)))}))};
writeFileSync(resolve(here,'proposal-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const files=[];
function walk(dir,prefix=''){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const path=prefix+item.name;if(path==='artifact-manifest.json')continue;
  if(item.isSymbolicLink())throw Error('Unexpected alias '+path);
  if(item.isDirectory())walk(resolve(dir,item.name),path+'/');
  else {const bytes=readFileSync(resolve(dir,item.name));files.push({path,bytes:bytes.length,sha256:hash(bytes)});}
 }
}
walk(here);files.sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync(resolve(here,'artifact-manifest.json'),JSON.stringify({files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({additions:2,replacements:0,artifacts:files.length}));
