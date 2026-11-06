import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../../..'),here=import.meta.dirname;
const results=[];
for(const [name,args] of [['node',['node_modules/typescript/bin/tsc','-p','tsconfig.json']],['native',['tools/build-native.mjs']]]){
 console.log('START '+name);
 const p=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:64e6,timeout:3600000});
 writeFileSync(resolve(here,name+'.txt'),(p.stdout??'')+(p.stderr??''),{flag:'wx'});
 results.push({name,args,status:p.status,signal:p.signal,error:p.error?.message??null});
 writeFileSync(resolve(here,'build-stages.json'),JSON.stringify(results,null,2)+'\n');
 if(name==='native')copyFileSync(resolve(root,'build/native-build-results.json'),resolve(here,'native-build-results.json'));
 console.log('END '+name+' '+p.status);
 assert.equal(p.status,0);assert.equal(p.error,undefined);assert.equal(p.signal,null);
}
const gates=JSON.parse(readFileSync(resolve(here,'native-build-results.json')));
assert.equal(gates.length,71);assert(gates.every(g=>g.verdict==='PASS'));
