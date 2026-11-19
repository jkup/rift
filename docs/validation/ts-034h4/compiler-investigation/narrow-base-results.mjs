import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const source='docs/validation/ts-034h4/compiler-investigation/narrow-base-baseline.ts';
const run=(command,args)=>{const r=spawnSync(command,args,{encoding:'utf8',timeout:60000});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};};
const result={source:readFileSync(source,'utf8'),buildLog:readFileSync(import.meta.dirname+'/narrow-base-build.log','utf8'),coverage:run('node_modules/scriptc/bin/scriptc.exe',['coverage',source]),node:run(process.execPath,[source]),native:run('build/h4-reduction/narrow-base-baseline.exe',[])};
writeFileSync(import.meta.dirname+'/narrow-base-results.json',JSON.stringify(result,null,2)+'\n');
