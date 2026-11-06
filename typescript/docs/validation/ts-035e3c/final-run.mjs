import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const here=import.meta.dirname,{sandbox}=JSON.parse(readFileSync(join(here,'setup.json'))),stages=[];
function run(name,args,cwd=sandbox){
 console.log('START '+name);
 const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:32e6,timeout:900000,windowsHide:true});
 writeFileSync(join(here,name+'.txt'),r.stdout+r.stderr,{flag:'wx'});
 stages.push({name,args,cwd,status:r.status,signal:r.signal,error:r.error?.message??null});
 writeFileSync(join(here,'final-stages.json'),JSON.stringify(stages,null,2)+'\n');
 console.log('END '+name+' '+r.status);assert.equal(r.status,0,r.stderr);assert.equal(r.signal,null);assert.equal(r.error,undefined);return r.stdout;
}
run('decoders21-retry',['--test','tools/test262/script-result.test.mjs','tools/test262/script-driver-result.test.mjs']);
run('observations22',['tools/test262/observation.integration.mjs',join(here,'observations')],JSON.parse(readFileSync(join(here,'observation-setup.json'))).sandbox);
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']);
console.log('PASS '+stages.length+' stages');
