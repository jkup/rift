// Bounded offline checks only. No build, historical output or real test edits.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const results=[];
for(const [name,args] of [
 ['whole-file-preservation',['docs/validation/ts-035d2-p/verify.mjs']],
 ['current-return-codec-controls',['docs/validation/ts-035d2-p/verify-future-wire.mjs','--current-return-controls']],
 ...['freeze','wire-freeze','verify','verify-future-wire','check'].map(n=>['syntax-'+n,['--check','docs/validation/ts-035d2-p/'+n+'.mjs']]),
]){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 const result={name,args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr};
 results.push(result);assert.equal(r.status,0,JSON.stringify(result));assert.equal(r.signal,null);assert.equal(r.error,undefined);
}
const wire=JSON.parse(readFileSync('docs/validation/ts-035d2-p/wire-audit.json'));
writeFileSync('docs/validation/ts-035d2-p/checks.json',JSON.stringify({base:'62a8787',claims:'Offline preservation/syntax and current synthetic return-only codec controls. No D2 emission, production mutation, full build or native execution.',results,wire},null,2)+'\n');
console.log('PASS '+results.length+' bounded offline checks; future block emission remains unimplemented');
