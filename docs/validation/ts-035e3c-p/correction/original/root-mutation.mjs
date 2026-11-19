import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const base=process.cwd(),out=mkdtempSync(resolve(base,'build/ts035e3cp-root/mutant-'));
const proposal=resolve(base,'docs/validation/ts-035e3c-p/proposals');
for(const name of ['script-execution-inputs.mjs','script-execution-inputs.test.mjs']){
 let source=readFileSync(resolve(proposal,name),'utf8');
 if(name==='script-execution-inputs.mjs'){
  if(source.split("id:'u'+units.length").length!==2)throw Error('mutation guard');
  source=source.replace("id:'u'+units.length","id:'u0'");
 }
 source=source.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${pathToFileURL(p==='./script-execution-inputs.mjs'?resolve(out,p):resolve(base,'tools/test262',p)).href}'`);
 writeFileSync(resolve(out,name),source,{flag:'wx'});
}
const r=spawnSync(process.execPath,[resolve(out,'script-execution-inputs.test.mjs'),'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',resolve(out,'results')],{cwd:base,encoding:'utf8',timeout:180000,windowsHide:true,maxBuffer:4000000});
writeFileSync(resolve(out,'process.json'),JSON.stringify({status:r.status,error:r.error?.message,stdout:r.stdout,stderr:r.stderr},null,2));
console.log(JSON.stringify({out,status:r.status,stdout:r.stdout,stderr:r.stderr}));
process.exitCode=r.status===0?0:1;
