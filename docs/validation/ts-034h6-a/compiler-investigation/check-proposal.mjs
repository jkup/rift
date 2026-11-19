import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {probeVerdict} from '../../../../tools/probe-verdict.mjs';
const source='docs/validation/ts-034h6-a/compiler-investigation/driver-proposed.ts',exe='build/native/h6a-driver-proposed.exe';
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',timeout:600000,maxBuffer:32*1024*1024});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};};
const results={typecheck:run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--types','node','--target','ES2024','--module','NodeNext','--strict','--skipLibCheck','--rootDir','.','--outDir','build/h6a-proposed',source]),build:run('node_modules/scriptc/bin/scriptc.exe',['build',source,'--tier','static-only','-o',exe]),coverage:run('node_modules/scriptc/bin/scriptc.exe',['coverage',source]),inputs:[]};
try{
 assert.equal(results.typecheck.status,0,results.typecheck.stdout+results.typecheck.stderr);
 for(const input of ['seven','eleven']){
  const file='fixtures/harness-errors-a/input-'+input+'.js',row={input,node:run(process.execPath,['build/h6a-proposed/docs/validation/ts-034h6-a/compiler-investigation/driver-proposed.js',file]),native:run(exe,[file])};results.inputs.push(row);
  assert.equal(probeVerdict({...results,...row}),'PASS',JSON.stringify({...results,...row}));
  for(const lane of ['node','native']){assert.equal(row[lane].stdout,Array.from({length:9},(_,i)=>`PASS A0${i+1}\n`).join(''));assert.equal(row[lane].stderr,'');}
 }
}finally{writeFileSync(import.meta.dirname+'/driver-proposed-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS complete proposed driver both hosts/two runtime inputs/static-only/zero dynamic');
