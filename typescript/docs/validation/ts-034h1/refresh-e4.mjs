import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { probeVerdict } from '../../../tools/probe-verdict.mjs';
function run(args) {
    const r=spawnSync(resolve('node_modules/scriptc/bin/scriptc.exe'),args,{encoding:'utf8',timeout:120000});
    return {status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};
}
const entry='test/script-execution.ts';
const build=run(['build',entry,'--tier','static-only','-o',resolve('build/native/script-execution.exe')]);
const coverage=run(['coverage',entry]);
const success={status:0,signal:null,error:null,stdout:''};
const verdict=probeVerdict({build,coverage,node:success,native:success});
writeFileSync(new URL('final-driver-build.json',import.meta.url),JSON.stringify({entry,build,coverage,verdict},null,2)+'\n');
assert.equal(verdict,'PASS',JSON.stringify({build,coverage}));
const rows=JSON.parse(readFileSync('build/native-build-results.json'));
assert.equal(rows.length,50);assert.equal(rows[48].entry,entry);
copyFileSync('build/native-build-results.json',new URL('initial-full-native-build-results.json',import.meta.url));
rows[48]={entry,build,coverage,verdict};
writeFileSync('build/native-build-results.json',JSON.stringify(rows,null,2)+'\n');
console.log('PASS final test-only driver refresh with 49 other gates preserved');
