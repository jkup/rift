import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
function run(command,args){const r=spawnSync(command,args,{encoding:'utf8',timeout:120000});return {status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout,stderr:r.stderr};}
const entry='test/property-accessors.ts';
const typecheck=run(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.json']);assert.equal(typecheck.status,0);
const build=run('node_modules/scriptc/bin/scriptc.exe',['build',entry,'--tier','static-only','-o','build/native/property-accessors.exe']);
const coverage=run('node_modules/scriptc/bin/scriptc.exe',['coverage',entry]);
const success={status:0,signal:null,error:null,stdout:''};
const verdict=probeVerdict({build,coverage,node:success,native:success});
const validate=run(process.execPath,['docs/validation/ts-033er-a/validate.mjs','node','native']);
writeFileSync(import.meta.dirname+'/final-driver-results.json',JSON.stringify({sha256:createHash('sha256').update(readFileSync(entry)).digest('hex'),typecheck,build,coverage,verdict,validate},null,2)+'\n');
assert.equal(verdict,'PASS');assert.equal(validate.status,0,validate.stdout+validate.stderr);
const gates=JSON.parse(readFileSync('build/native-build-results.json'));const index=gates.findIndex(g=>g.entry===entry);assert.equal(index,46);gates[index]={entry,build,coverage,verdict};
writeFileSync('build/native-build-results.json',JSON.stringify(gates,null,2)+'\n');console.log('final driver rebuilt: static-only, separate coverage, both inputs/hosts PASS');
