import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=fileURLToPath(new URL('./',import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const names=['script-execution-inputs.mjs','script-execution-inputs.test.mjs'];
const manifest={base:'1feb9e95278c34927278ae5be5960cb0a52a57db',designSha256:hash(readFileSync(resolve(here,'../../script-execution-selection.md'))),claim:'Design-only input-snapshot slice; zero existing replacements; no complete execution certification.',replacements:[],additions:names.map(n=>({path:'tools/test262/'+n,proposal:'proposals/'+n,sha256:hash(readFileSync(resolve(here,'proposals',n)))}))};
writeFileSync(resolve(here,'proposal-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const files=[];
function walk(dir,prefix=''){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const path=prefix+item.name;
  if(/^context-[^/]+\/isolated\/node_modules(?:\/|$)/.test(path)||/^run-[^/]+\/results\/[^/]+\.json$/.test(path)||/^context-[^/]+\/results\.json$/.test(path)||path==='artifact-manifest.json')continue;
  if(item.isSymbolicLink())throw Error('Unexpected alias '+path);
  if(item.isDirectory())walk(resolve(dir,item.name),path+'/');
  else {const bytes=readFileSync(resolve(dir,item.name));files.push({path,bytes:bytes.length,sha256:hash(bytes)});}
 }
}
walk(here);files.sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync(resolve(here,'artifact-manifest.json'),JSON.stringify({files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({additions:names.length,replacements:0,artifacts:files.length}));
