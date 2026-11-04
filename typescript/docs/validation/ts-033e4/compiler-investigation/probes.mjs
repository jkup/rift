import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const prefix='docs/validation/ts-033e4/compiler-investigation/';
const output=join(root,'build/ts-033e4-investigation');
mkdirSync(output,{recursive:true});
const compiler=join(root,'node_modules/scriptc/bin/scriptc.exe');
function run(command,args){const r=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:120000});return {command,args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
const results=[];
for(const name of process.argv.slice(2)){
    const source=prefix+name+'.ts',binary=join(output,name+'.exe');
    const row={name,node:run(process.execPath,[source]),build:run(compiler,['build',source,'--tier','static-only','-o',binary]),coverage:run(compiler,['coverage',source,'--explain-dynamic'])};
    if(row.build.status===0)row.native=run(binary,[]);
    results.push(row);writeFileSync(new URL(name+'-results.json',import.meta.url),JSON.stringify(row,null,2)+'\n');
    console.log(name,JSON.stringify(row));
}
