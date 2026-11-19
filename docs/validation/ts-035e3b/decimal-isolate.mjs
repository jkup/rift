import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const here=resolve(import.meta.dirname,'alternatives'),root=resolve(import.meta.dirname,'../../..');
const base=readFileSync(resolve(import.meta.dirname,'reduction-decimal.ts'),'utf8'),rows=[];
for(const [name,before,after] of [
 ['decimal-inline-length','need(text.length > 0, "limit");','if (text.length === 0) throw new Error("script-producer/limit");'],
 ['decimal-inline-digits','need(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");','if (text.charCodeAt(n) < 48 || text.charCodeAt(n) > 57) throw new Error("script-producer/limit");'],
]){
 const path=resolve(here,name+'.ts');writeFileSync(path,base.replace(before,after),{flag:'wx'});
 const args=['coverage',path,'--explain-dynamic'],p=spawnSync(resolve(root,'node_modules/scriptc/bin/scriptc.exe'),args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8e6});
 rows.push({name,args,status:p.status,signal:p.signal,error:p.error?.message??null,stdout:p.stdout,stderr:p.stderr});console.log(name+' '+p.stdout);
}
writeFileSync(resolve(here,'decimal-isolated-coverage.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
