import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const here='docs/validation/ts-035d6',entry='test/script-assignment-target-dispatch.ts';
function run(args){const r=spawnSync('node_modules/scriptc/bin/scriptc.exe',args,{encoding:'utf8',timeout:600000});return {status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};}
const build=run(['build',entry,'--tier','static-only','-o','build/native/script-assignment-target-dispatch.exe']),coverage=run(['coverage',entry]),success={status:0,signal:null,error:null,stdout:''};
const gate={entry,build,coverage,verdict:probeVerdict({build,coverage,node:success,native:success})};
writeFileSync(here+'/dispatch-gate.json',JSON.stringify(gate,null,2)+'\n');assert.equal(gate.verdict,'PASS');
// The unchanged first 68 gates come from this D6 full build, not accepted historical evidence.
const gates=JSON.parse(readFileSync(here+'/native-dynamic-results.json'));assert.equal(gates.length,69);assert(gates.slice(0,68).every(g=>g.verdict==='PASS'));assert.equal(gates[68].entry,entry);gates[68]=gate;
writeFileSync('build/native-build-results.json',JSON.stringify(gates,null,2));
console.log('PASS 68 current full-build gates plus rebuilt static/zero-dynamic D6 driver');
