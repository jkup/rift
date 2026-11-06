import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,cpSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join,basename} from 'node:path';
const here=import.meta.dirname,root=resolve(here,'../../../..'),out=mkdtempSync(join(root,'build/ts035e3b-boundary-'));
cpSync(join(root,'src'),join(out,'src'),{recursive:true,force:false,errorOnExist:true,filter:p=>basename(p)!=='script-producer-request.ts'});
for(const name of ['script-observation.ts','script-observation-driver.ts'])copyFileSync(join(here,'proposals',name),join(out,'src',name));
const records=[];
for(const [name,command,args] of [
 ['typecheck',process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--noEmit','--target','es2024','--module','nodenext','--strict','--types','node',join(out,'src/script-observation-driver.ts')]],
 ['coverage',join(root,'node_modules/scriptc/bin/scriptc.exe'),['coverage',join(out,'src/script-observation-driver.ts'),'--explain-dynamic']],
]){
 const p=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8e6});
 records.push({name,command,args,status:p.status,signal:p.signal,error:p.error?.message??null,stdout:p.stdout,stderr:p.stderr});
 writeFileSync(join(here,'source-check.json'),JSON.stringify({out,records,nativeBuilds:0,executions:0},null,2)+'\n');
 console.log(name+' '+p.status+'\n'+p.stdout+p.stderr);assert.equal(p.status,0);
}
