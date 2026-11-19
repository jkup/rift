import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const here=import.meta.dirname,root=resolve(here,'../../..');
const files=JSON.parse(readFileSync(join(here,'replacement-manifest.json'))).files.map(f=>join(here,'proposed',f.path.slice('typescript/'.length)));
// Parsing only: copied imports intentionally do not resolve, future APIs absent.
// This is not a successful typecheck, build, or a runtime claim.
const args=[join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig','--noEmit','--noResolve','--target','es2022','--module','nodenext',...files];
const p=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
assert.equal(p.error,undefined);assert.equal(p.signal,null);
const output=p.stdout+p.stderr,codes=[...output.matchAll(/error TS(\d+):/g)].map(m=>Number(m[1]));
assert.ok(codes.length>0,'expect unresolved imports; do not mistake a tooling failure for parse evidence');
const syntactic=codes.filter(c=>c>=1000&&c<2000);assert.deepEqual(syntactic,[]);
const result={status:'PASS no TS1xxx syntax diagnostics; full typecheck NOT claimed',exitStatus:p.status,files:files.length,diagnosticCodes:[...new Set(codes)].sort(),diagnostics:codes.length,stdout:p.stdout,stderr:p.stderr};
writeFileSync(join(here,'syntax.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,stdout:undefined,stderr:undefined}));
