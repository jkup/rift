import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
const here=import.meta.dirname,dir='docs/validation/ts-034h4/compiler-investigation';mkdirSync('build/h4-reduction',{recursive:true});
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};};
const rows=[];
for(const mode of ['original','proposal']){
 const source=dir+'/union-default-'+mode+'.ts',exe='build/h4-reduction/'+mode+'.exe';
 const row={mode,typecheck:run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir','build/h4-reduction',source]),build:run('node_modules/scriptc/bin/scriptc.exe',['build',source,'--tier','static-only','-o',exe]),coverage:run('node_modules/scriptc/bin/scriptc.exe',['coverage',source,'--explain-dynamic'])};
 row.node=run(process.execPath,[source]);row.native=run(exe,[]);rows.push(row);
}
writeFileSync(here+'/results.json',JSON.stringify(rows,null,2)+'\n');for(const r of rows)console.log(r.mode,JSON.stringify({typecheck:r.typecheck.status,build:r.build.status,node:r.node,native:r.native}));
