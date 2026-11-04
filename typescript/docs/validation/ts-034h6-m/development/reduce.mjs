import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const dir='docs/validation/ts-034h6-m/development';
function run(command,args){const r=spawnSync(command,args,{encoding:'utf8',timeout:600000});return {command,args,status:r.status,signal:r.signal,stdout:r.stdout??'',stderr:r.stderr??'',error:r.error?.message??null};}
const rows=[];
rows.push(run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--target','es2024','--module','nodenext','--strict','--types','node','--outDir','build/h6-m-reduction',dir+'/parsed-getter-reduction.ts']));
if(rows[0].status===0)rows.push(run(process.execPath,['build/h6-m-reduction/docs/validation/ts-034h6-m/development/parsed-getter-reduction.js']));
rows.push(run('node_modules/scriptc/bin/scriptc.exe',['build',dir+'/parsed-getter-reduction.ts','--tier','static-only','-o','build/native/h6-m-getter-reduction.exe']));
rows.push(run('node_modules/scriptc/bin/scriptc.exe',['coverage',dir+'/parsed-getter-reduction.ts']));
if(rows[rows.length-2].status===0)rows.push(run('build/native/h6-m-getter-reduction.exe',[]));
writeFileSync(dir+'/reduction-results.json',JSON.stringify(rows,null,2)+'\n');
for(const r of rows)console.log(r.command+' '+r.args.join(' ')+'\n'+r.status+'\n'+r.stdout+r.stderr);
