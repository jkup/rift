import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const output=join(root,'build/ts-033e4-method');
mkdirSync(output,{recursive:true});
const compiler=join(root,'node_modules/scriptc/bin/scriptc.exe');
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8',timeout:60000});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
const name=process.argv[2]??'method-minimal';
const source='docs/validation/ts-033e4/'+name+'.ts',binary=join(output,name+'.exe');
const row={name,node:run(process.execPath,[source]),build:run(compiler,['build',source,'--tier','static-only','-o',binary]),coverage:run(compiler,['coverage',source,'--explain-dynamic'])};
if(row.build.status===0)row.native=run(binary,[]);
writeFileSync(new URL(name+'-results.json',import.meta.url),JSON.stringify(row,null,2)+'\n');
for(const [key,r]of Object.entries(row))if(typeof r==='object')console.log(key,r.status,r.stdout,r.stderr);
