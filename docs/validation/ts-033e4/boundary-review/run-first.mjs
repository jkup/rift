import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {probeVerdict} from '../../../../tools/probe-verdict.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const prefix='docs/validation/ts-033e4/boundary-review/';
const output=join(root,'build/ts-033e4-boundary-review');mkdirSync(output,{recursive:true});
const expected={capability:'PASS ownership copied-detached activeA-activeB idleA-activeB\nPASS nested realm guest-identity host-identity permits\nPASS root-throw call-limit monotonic-steps independent-owner\n',nominal:'PASS nominal authentic cross-owner idle reentry nested root-throw\n',provenance:'PASS facade private-record identity equal-id wrong-record rejected\n'};
function run(command,args){const r=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:120000});return {command,args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};}
for(const name of process.argv.slice(2)){
 const source=prefix+name+'.ts',binary=join(output,name+'.exe'),compiler=join(root,'node_modules/scriptc/bin/scriptc.exe');
 const row={name,typecheck:run(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','--noEmit','--strict','--target','ES2024','--module','nodenext','--types','node',source]),node:run(process.execPath,[source]),build:run(compiler,['build',source,'--tier','static-only','-o',binary]),coverage:run(compiler,['coverage',source,'--explain-dynamic'])};
 if(row.build.status===0)row.native=run(binary,[]);
 writeFileSync(new URL(name+'-results.json',import.meta.url),JSON.stringify(row,null,2)+'\n');
 for(const lane of ['typecheck','node','build','coverage','native']) {assert.equal(row[lane]?.status,0,`${name} ${lane}: ${row[lane]?.stdout} ${row[lane]?.stderr}`);assert.equal(row[lane].error,null);assert.equal(row[lane].signal,null);}
 assert.equal(probeVerdict(row),'PASS');
 const analyzed=row.coverage.stdout.match(/statements analyzed\s+(\d+)/);
 assert.equal(row.node.stdout,expected[name]);assert.equal(row.native.stdout,expected[name]);assert.equal(row.node.stderr,'');assert.equal(row.native.stderr,'');
 console.log(`PASS ${name} Node/native literal output; ${analyzed[1]} static; zero dynamic; strict types`);
}
