import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const dir='docs/validation/ts-034h4/compiler-investigation/';
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};};
const rows=[];
for(const variant of ['original','baseline','annotated']){
 const source=dir+'reference-'+variant+'.ts';
 rows.push({variant,source:readFileSync(source,'utf8'),typecheck:run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--noEmit','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',source]),buildLog:readFileSync(dir+'reference-'+variant+'-build.log','utf8'),coverage:run('node_modules/scriptc/bin/scriptc.exe',['coverage',source,'--explain-dynamic']),node:run(process.execPath,[source]),native:run('build/h4-reduction/reference-'+variant+'.exe',[])});
}
writeFileSync(import.meta.dirname+'/reference-results.json',JSON.stringify(rows,null,2)+'\n');for(const row of rows)console.log(row.variant,row.typecheck.status,JSON.stringify(row.node.stdout),JSON.stringify(row.native.stdout));
