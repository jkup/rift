import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const here="C:\\Users\\jonku\\code\\rift\\typescript\\docs\\validation\\ts-035e3c",base="C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3c-implementation-fg0jC1";
assert(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--root-mutant'));
const mutant=process.argv.includes('--root-mutant'),out=mkdtempSync(resolve(here,mutant?'root-mutant-':'run-'));
const names=['script-execution-inputs.mjs','script-execution-inputs.test.mjs'],mapping=[];
for(const name of names){
 const original=readFileSync(resolve(base,'tools/test262',name),'utf8');
 writeFileSync(resolve(out,'original-'+name),original,{flag:'wx'});
 let source=original;
 if(mutant&&name===names[0]){assert.equal(source.split("id:'u'+units.length").length,2);source=source.replace("id:'u'+units.length","id:'u0'");}
 source=source.replace(/from '(\.\/[^']+)'/g,(_full,p)=>{
  const target=p==='./script-execution-inputs.mjs'?resolve(out,names[0]):resolve(base,'tools/test262',p);
  const url=pathToFileURL(target).href;mapping.push({name,from:p,to:url});return `from '${url}'`;
 });
 writeFileSync(resolve(out,name),source,{flag:'wx'});
}
writeFileSync(resolve(out,'import-remapping.json'),JSON.stringify(mapping,null,2)+'\n',{flag:'wx'});
const r=spawnSync(process.execPath,[resolve(out,names[1]),'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',resolve(out,'results')],{cwd:base,encoding:'utf8',timeout:240000,maxBuffer:8000000,windowsHide:true});
const result={mutant,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr};
writeFileSync(resolve(out,'process.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
if(mutant){assert.equal(r.status,1);assert.match(r.stderr,/capture-literal\/node\/success/);assert.equal(r.error,undefined);}
else assert.equal(r.status,0,r.stderr);
console.log(JSON.stringify({out,status:r.status,expectedRejection:mutant,stdout:r.stdout}));
