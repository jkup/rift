import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const here=import.meta.dirname,root=resolve(here,'../../..'),rows=[];
for(const name of ['keys','decimal']){
 const args=['coverage',resolve(here,'reduction-'+name+'.ts'),'--explain-dynamic'];
 const p=spawnSync(resolve(root,'node_modules/scriptc/bin/scriptc.exe'),args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8e6});
 rows.push({name,args,status:p.status,signal:p.signal,error:p.error?.message??null,stdout:p.stdout,stderr:p.stderr});
 console.log(name+': '+p.stdout);
}
const gates=JSON.parse(readFileSync(resolve(here,'native-build-results.json'))),success={status:0,signal:null,error:null,stdout:''};
// Isolate the coverage parser with synthetic success for the build/execution
// inputs. This is not a successful native build or native execution claim.
const coverageOnly=gates.map(g=>({entry:g.entry,verdict:probeVerdict({build:success,coverage:g.coverage,node:success,native:success})}));
assert.equal(coverageOnly.find(g=>g.entry==='src/script-observation-driver.ts').verdict,'DYNAMIC');
writeFileSync(resolve(here,'reductions.json'),JSON.stringify({rows,coverageOnly,syntheticBuildAndExecution:true},null,2)+'\n',{flag:'wx'});
