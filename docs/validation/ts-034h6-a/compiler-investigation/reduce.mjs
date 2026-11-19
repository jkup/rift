import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const rows=[];
for(const name of ['keys-before','keys-proposed']){
 const path='docs/validation/ts-034h6-a/compiler-investigation/'+name+'.ts',exe='build/native/h6a-'+name+'.exe';
 const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',timeout:600000});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};};
 const typecheck=run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--target','ES2024','--module','NodeNext','--strict','--skipLibCheck','--outDir','build/h6a-reduce',path]);
 rows.push({name,typecheck,build:run('node_modules/scriptc/bin/scriptc.exe',['build',path,'--tier','static-only','-o',exe]),coverage:run('node_modules/scriptc/bin/scriptc.exe',['coverage',path]),node:run(process.execPath,['build/h6a-reduce/'+name+'.js']),native:name==='keys-proposed'?run(exe,[]):null});
 writeFileSync(import.meta.dirname+'/reduction-results.json',JSON.stringify(rows,null,2)+'\n');
 console.log(name,rows.at(-1));
}
