import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../../../..');
const results=[];
function run(command,args){const r=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:600000});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
for(const name of ['union-original','union-proposal']){
 const entry=resolve(import.meta.dirname,name+'.ts'),exe=resolve(root,'build',name+'.exe');
 const row={name,typecheck:run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--target','es2022','--skipLibCheck','--rootDir',root,'--outDir',resolve(root,'build/h5-reduction-node'),entry]),node:run(process.execPath,[resolve(root,'build/h5-reduction-node/docs/validation/ts-034h5/compiler-investigation',name+'.js')]),build:run('node_modules/scriptc/bin/scriptc.exe',['build',entry,'--tier','static-only','-o',exe]),coverage:run('node_modules/scriptc/bin/scriptc.exe',['coverage',entry])};
 if(row.build.status===0)row.native=run(exe,[]);results.push(row);
}
writeFileSync(import.meta.dirname+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.map(r=>({name:r.name,typecheck:r.typecheck.status,node:r.node,build:r.build.status,coverage:r.coverage.stdout,native:r.native})),null,2));
