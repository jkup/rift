import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
function run(args){const r=spawnSync('node_modules/scriptc/bin/scriptc.exe',args,{encoding:'utf8',timeout:600000});return {status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};}
const entry='test/harness-errors-a.ts',build=run(['build',entry,'--tier','static-only','-o','build/native/harness-errors-a.exe']),coverage=run(['coverage',entry]),success={status:0,signal:null,error:null,stdout:''};
const verdict=probeVerdict({build,coverage,node:success,native:success});
writeFileSync(import.meta.dirname+'/kernel-gate.json',JSON.stringify({entry,build,coverage,verdict},null,2)+'\n');
console.log(verdict,build.stderr,coverage.stdout,coverage.stderr);process.exitCode=verdict==='PASS'?0:1;
