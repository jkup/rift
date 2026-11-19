import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const original=JSON.parse(readFileSync(import.meta.dirname+'/initial-full-build-results.json'));
const priority=['test/key-coercion.ts','test/script-function-setup.ts','test/harness-nonstrict.ts'];
const entries=[...priority,...original.map(r=>r.entry).filter(e=>!priority.includes(e))],results=[];
const run=(command,args)=>{const r=spawnSync(command,args,{encoding:'utf8',timeout:600000});return {status:r.status,signal:r.signal,error:r.error?{code:r.error.code,message:r.error.message}:null,stdout:r.stdout??'',stderr:r.stderr??''};};
for(const entry of entries){
 const name=entry==='src/cli.ts'?'rift':entry.split('/').at(-1).replace('.ts','');
 const build=run('node_modules/scriptc/bin/scriptc.exe',['build',entry,'--tier','static-only','-o','build/native/'+name+'.exe']);
 const coverage=run('node_modules/scriptc/bin/scriptc.exe',['coverage',entry]);
 const success={status:0,signal:null,error:null,stdout:''};const verdict=probeVerdict({build,coverage,node:success,native:success});
 results.push({entry,build,coverage,verdict});const sorted=original.flatMap(r=>results.filter(x=>x.entry===r.entry));
 writeFileSync(import.meta.dirname+'/amended-build-results.json',JSON.stringify(sorted,null,2)+'\n');
 console.log(verdict+' '+entry);if(verdict!=='PASS'){console.error(build,coverage);process.exit(1);}
 if(entry==='test/key-coercion.ts'){const actual=run('build/native/key-coercion.exe',[]);writeFileSync(import.meta.dirname+'/amended-key-coercion.json',JSON.stringify(actual,null,2)+'\n');assert.equal(actual.status,0,JSON.stringify(actual));assert.equal(actual.stdout,'key coercion passed\n');}
}
assert.equal(results.length,53);writeFileSync('build/native-build-results.json',JSON.stringify(original.map(r=>results.find(x=>x.entry===r.entry)),null,2)+'\n');
