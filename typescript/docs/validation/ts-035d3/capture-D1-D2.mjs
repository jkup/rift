import {verifyGates} from './verify-gates.mjs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,copyFileSync,unlinkSync} from 'node:fs';
const here='docs/validation/ts-035d3';
const gates=JSON.parse(readFileSync('build/native-build-results.json'));verifyGates(gates);
const results=[];
function run(name,args){const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:3600000,maxBuffer:64*1024*1024});const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};results.push(row);writeFileSync(here+'/fresh-D1-D2-suite-results.json',JSON.stringify(results,null,2)+'\n');console.log(name+': '+r.status);assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(row));}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
const roots=readdirSync('docs/validation',{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='ts-035d3').map(e=>'docs/validation/'+e.name),backups=new Map(roots.flatMap(files).map(p=>[p,readFileSync(p)]));
mkdirSync(here+'/inherited',{recursive:true});
try{
 run('D2-source',['docs/validation/ts-035d2/validate.mjs']);
 copyFileSync('docs/validation/ts-035d2/matrix-results.json',here+'/D2-source-results.json');
 run('D2-wire',['--test','tools/test262/script-strict-rule-dispatch.test.mjs']);
 copyFileSync('docs/validation/ts-035d2/wire-results.json',here+'/D2-wire-results.json');
 run('D2-extra',['docs/validation/ts-035d2/extra-controls.mjs']);
 copyFileSync('docs/validation/ts-035d2/extra-results.json',here+'/D2-extra-results.json');
 run('D1-unchanged-matrix',['docs/validation/ts-035d1/validate.mjs']);
 copyFileSync('docs/validation/ts-035d1/matrix-results.json',here+'/D1-source-results.json');
 run('D1-unchanged-extra',['docs/validation/ts-035d1/extra-controls.mjs']);
 copyFileSync('docs/validation/ts-035d1/extra-results.json',here+'/D1-extra-results.json');

}finally{
 for(const [path,bytes] of backups){if(!readFileSync(path).equals(bytes))writeFileSync(path,bytes);assert.deepEqual(readFileSync(path),bytes);}
}
console.log('PASS five unchanged D1/D2 suites with explicit fresh raw captures');
