import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const here=import.meta.dirname;
function run(command,args){const r=spawnSync(command,args,{encoding:'utf8',timeout:60000});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr};}
const rows=[];
for(const name of ['before','after']){
 const source='docs/validation/ts-033e3b/parameter-'+name+'.ts', binary='build/native/e3b-parameter-'+name+'.exe';
 const compile=run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--types','node','--target','es2024','--module','nodenext','--outDir','build/e3b-reduction',source]); assert.equal(compile.status,0,compile.stdout+compile.stderr);
 const row={name,compile,node:run(process.execPath,['build/e3b-reduction/parameter-'+name+'.js','11']),build:run('node_modules/scriptc/bin/scriptc.exe',['build',source,'--tier','static-only','-o',binary]),coverage:run('node_modules/scriptc/bin/scriptc.exe',['coverage',source])};
 if(name==='after')row.native=run(binary,['11']); rows.push(row);writeFileSync(here+'/reduction-results.json',JSON.stringify(rows,null,2)+'\n');
 assert.equal(row.node.status,0);assert.equal(row.node.stdout,'11\n');
 if(name==='before'){assert.equal(row.build.status,1);assert.match(row.build.stderr,/SC1090/);assert.match(row.coverage.stdout,/SC1090/);}
 else{assert.equal(row.build.status,0);assert.match(row.coverage.stdout,/fully static/);assert.equal(row.native.status,0);assert.equal(row.native.stdout,'11\n');}
}
console.log('parameter property reduction PASS');
