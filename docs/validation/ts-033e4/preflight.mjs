import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const out=join(root,'build/ts-033e4-preflight');
mkdirSync(out,{recursive:true});
const source='docs/validation/ts-033e4/receiver-preflight.ts';
function run(command,args){const r=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:120000});return {command,args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
const results={node:run(process.execPath,[source]),build:run(join(root,'node_modules/scriptc/bin/scriptc.exe'),['build',source,'--tier','static-only','-o',join(out,'receiver.exe')]),coverage:run(join(root,'node_modules/scriptc/bin/scriptc.exe'),['coverage',source,'--explain-dynamic'])};
if(results.build.status===0)results.native=run(join(out,'receiver.exe'),[]);
writeFileSync(new URL(process.argv[2]??'receiver-preflight-replay.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
for(const [name,r]of Object.entries(results))console.log(name,r.status,r.stdout,r.stderr);
