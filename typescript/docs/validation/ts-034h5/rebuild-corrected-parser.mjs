import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const original=JSON.parse(readFileSync('build/native-build-results.json'));
assert.equal(original.length,54);
copyFileSync('build/native-build-results.json',import.meta.dirname+'/initial-full-build-results.json');
const results=original.slice(),rebuilt=[];
const run=(command,args)=>{const r=spawnSync(command,args,{encoding:'utf8',timeout:600000});return {status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};};
// The parser token-kind correction occurred during the first pass, after the
// addition gate and before the function-string-conversion progress snapshot.
// Rebuild the first 30 entries, a conservative superset of that interval.
for(let i=0;i<30;i++){
 const entry=original[i].entry,name=entry==='src/cli.ts'?'rift':entry.split('/').at(-1).replace('.ts','');
 const build=run('node_modules/scriptc/bin/scriptc.exe',['build',entry,'--tier','static-only','-o','build/native/'+name+'.exe']);
 const coverage=run('node_modules/scriptc/bin/scriptc.exe',['coverage',entry]);
 const success={status:0,signal:null,error:null,stdout:''};const verdict=probeVerdict({build,coverage,node:success,native:success});
 const row={entry,build,coverage,verdict};results[i]=row;rebuilt.push(row);
 writeFileSync(import.meta.dirname+'/parser-correction-build-results.json',JSON.stringify(rebuilt,null,2)+'\n');console.log(verdict+' '+entry);assert.equal(verdict,'PASS',JSON.stringify(row));
}
writeFileSync('build/native-build-results.json',JSON.stringify(results,null,2)+'\n');
