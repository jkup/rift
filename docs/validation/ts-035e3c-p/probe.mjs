// Runs only the proposed host input/identity test. Never imports a guest producer.
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const here=fileURLToPath(new URL('./',import.meta.url)),base=resolve(here,'../../..');
const out=mkdtempSync(resolve(here,'run-'));
const names=['script-execution-inputs.mjs','script-execution-inputs.test.mjs'];
const mapping=[];
for(const name of names){
 const original=readFileSync(resolve(here,'proposals',name),'utf8');
 writeFileSync(resolve(out,'original-'+name),original,{flag:'wx'});
 const rewritten=original.replace(/from '(\.\/[^']+)'/g,(full,p)=>{
  const target=p==='./script-execution-inputs.mjs'?resolve(out,'script-execution-inputs.mjs'):resolve(base,'tools/test262',p);
  const url=pathToFileURL(target).href;mapping.push({name,from:p,to:url});return `from '${url}'`;
 });
 writeFileSync(resolve(out,name),rewritten,{flag:'wx'});
}
writeFileSync(resolve(out,'import-remapping.json'),JSON.stringify(mapping,null,2)+'\n',{flag:'wx'});
const result=spawnSync(process.execPath,[resolve(out,names[1]),'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',resolve(out,'results')],{cwd:base,encoding:'utf8',timeout:180000,maxBuffer:4000000,windowsHide:true});
writeFileSync(resolve(out,'process.json'),JSON.stringify({status:result.status,signal:result.signal,error:result.error?.message??null,stdout:result.stdout,stderr:result.stderr},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,status:result.status,stdout:result.stdout,stderr:result.stderr}));
process.exitCode=result.status===0?0:1;
