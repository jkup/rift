import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const source='docs/validation/ts-034h4/compiler-investigation/wrapper.ts';
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};};
const row={typecheck:run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--noEmit','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',source]),build:run('node_modules/scriptc/bin/scriptc.exe',['build',source,'--tier','static-only','-o','build/h4-reduction/wrapper.exe']),coverage:run('node_modules/scriptc/bin/scriptc.exe',['coverage',source,'--explain-dynamic']),node:run(process.execPath,[source]),native:run('build/h4-reduction/wrapper.exe',[])};
writeFileSync(import.meta.dirname+'/wrapper-results.json',JSON.stringify(row,null,2)+'\n');
for(const r of Object.values(row)){assert.equal(r.status,0,JSON.stringify(r));assert.equal(r.signal,null);assert.equal(r.error,null);}
assert.equal(row.node.stdout,'PASS wrapper identity cached mutation receiver default strict sloppy abrupt binding\n');assert.equal(row.native.stdout,row.node.stdout);assert.equal(row.node.stderr,'');assert.equal(row.native.stderr,'');assert.ok(!/in dynamic tier\s+[1-9]/.test(row.coverage.stdout));console.log(row.coverage.stdout,row.native.stdout);
