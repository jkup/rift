import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
const dir='docs/validation/ts-034h6-c/replays',out='docs/validation/ts-034h7';const rows=[];
for(const [name,file] of [['validate','execution-results'],['node-boundary','node-boundary-results'],['bounded-boundary','bounded-boundary-results']]){
 const path=dir+'/'+file+'.json',before=readFileSync(path);
 try{const r=spawnSync(process.execPath,[dir+'/'+name+'.mjs'],{encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024});rows.push({name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});copyFileSync(path,out+'/inherited/'+file+'.json');assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(rows.at(-1)));}
 finally{writeFileSync(path,before);writeFileSync(out+'/supplementary-results.json',JSON.stringify(rows,null,2)+'\n');}
}
console.log('PASS E4 execution and both hostile Node boundaries');
