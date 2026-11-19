import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../../..'),out=join(root,'build/e2-reduction');mkdirSync(out,{recursive:true});
const records=[];
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8',timeout:120000});const rec={cmd,args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr};records.push(rec);return rec;}
try {
 for(const name of ['before','after']) {
  const file='docs/validation/ts-033e2/union-'+name+'.ts';
  const build=run(join(root,'node_modules/scriptc/bin/scriptc.exe'),['build',file,'--tier','static-only','-o',join(out,name+'.exe')]);
  const coverage=run(join(root,'node_modules/scriptc/bin/scriptc.exe'),['coverage',file]);
  const tsc=run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--types','node','--target','ES2024','--module','NodeNext','--strict','--outDir',out,file]);assert.equal(tsc.status,0);
  const node=run(process.execPath,[join(out,'union-'+name+'.js')]);assert.equal(node.status,0);assert.equal(node.stdout,'true\n');
  if(name==='before'){assert.notEqual(build.status,0);assert.match(build.stderr,/SC2003/);}
  else {assert.equal(build.status,0);assert.match(coverage.stdout,/fully static/);const native=run(join(out,name+'.exe'),[]);assert.equal(native.status,0);assert.equal(native.stdout,'true\n');}
 }
}finally{writeFileSync(join(import.meta.dirname,'union-reduction.json'),JSON.stringify(records,null,2)+'\n');}
console.log('PASS: union conversion boundary reduced; explicit throw arm preserves identity');
