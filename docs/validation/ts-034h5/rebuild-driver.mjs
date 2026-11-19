import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const run=args=>{const r=spawnSync('node_modules/scriptc/bin/scriptc.exe',args,{encoding:'utf8',timeout:600000});return {status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};};
const entry='test/harness-construct.ts',build=run(['build',entry,'--tier','static-only','-o','build/native/harness-construct.exe']),coverage=run(['coverage',entry]);
const success={status:0,signal:null,error:null,stdout:''},verdict=probeVerdict({build,coverage,node:success,native:success}),row={entry,build,coverage,verdict};
writeFileSync(import.meta.dirname+'/final-driver-build-results.json',JSON.stringify(row,null,2)+'\n');assert.equal(verdict,'PASS',JSON.stringify(row));
const results=JSON.parse(readFileSync('build/native-build-results.json'));assert.equal(results.at(-1).entry,entry);results[results.length-1]=row;writeFileSync('build/native-build-results.json',JSON.stringify(results,null,2)+'\n');console.log(verdict+' '+entry+'\n'+coverage.stdout);
