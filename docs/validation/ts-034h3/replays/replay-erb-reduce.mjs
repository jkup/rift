import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const directory = 'docs/validation/ts-033er-b/';
const run = (command,args) => { const r=spawnSync(command,args,{encoding:'utf8',timeout:60000}); return {status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr}; };
const results=[];
for (const variant of ['before','after']) {
 const source=directory+'key-join-'+variant+'.ts', exe='build/key-join-'+variant+'.exe';
 const tsc=run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--target','ES2024','--module','NodeNext','--strict','--skipLibCheck','--outDir','build/ts033erb-reduce',source]);
 const node=run(process.execPath,['build/ts033erb-reduce/key-join-'+variant+'.js']);
 const build=run('node_modules/scriptc/bin/scriptc.exe',['build',source,'--tier','static-only','-o',exe]);
 const coverage=run('node_modules/scriptc/bin/scriptc.exe',['coverage',source]);
 const native=variant==='after'?run(exe,[]):null;
 results.push({variant,tsc,node,build,coverage,native});
 writeFileSync('docs/validation/ts-034h3/replays/erb-reduction-results.json',JSON.stringify(results,null,2)+'\n');
 assert.equal(tsc.status,0); assert.equal(node.status,0); assert.equal(node.stdout,'name,length\n');
 if(variant==='before') {assert.notEqual(build.status,0);assert.match(build.stdout+build.stderr,/SC1090/);}
 else {assert.equal(build.status,0,build.stderr);assert.equal(coverage.status,0);assert.match(coverage.stdout,/fully static/);assert.equal(native.status,0);assert.equal(native.stdout,'name,length\n');}
}
console.log('key join reduction PASS');
