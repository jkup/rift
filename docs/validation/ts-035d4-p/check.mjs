import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const here=new URL('./',import.meta.url),root=new URL('../../../../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(readFileSync(new URL(p,here)));
const sha=s=>createHash('sha256').update(s).digest('hex'),rows=json('semantic-matrix.json').rows;
const d3=JSON.parse(read('typescript/docs/validation/ts-035d3/frozen.json'));
for(const old of d3){const row=rows.find(r=>r.id==='D3/'+old.id);
 for(const [k,v] of Object.entries(old.expected))assert.deepEqual(row.current.D3[k],v,old.id+'/'+k);
 for(const [k,v] of Object.entries(old.ordinary))assert.deepEqual(row.current[k],v,old.id+' ordinary '+k);
}
const d2=JSON.parse(read('typescript/docs/validation/ts-035d2-p/semantic-matrix.json')).rows;
for(const old of d2){const row=rows.find(r=>r.id==='D2/'+old.id);assert.deepEqual(row.current.D2,old.futurePreparation,old.id);assert.deepEqual(row.current.D1,old.audit,old.id);}
const observer=read('typescript/src/script-observation.ts');
const legacy=observer.slice(observer.indexOf('        // Preserve independent legacy return certification'),observer.indexOf('        return this.envelope(operation, site, rejection);'));
assert(legacy.includes('this.request.action === "parse-only" && unit.role === "test"'));
const sourceClosure=[];
for(const file of ['script-driver-result.mjs','script-result.mjs']){
 const old=execFileSync('git',['show','e66876d:typescript/tools/test262/'+file],{cwd:root,encoding:'utf8'});
 const before="need(b.action==='execute' && op.phase!=='parse' && ['resource-limit','unsupported-operation'].includes(o.kind));";
 const after="need((b.action==='execute' || op.stage==='harness') && op.phase!=='parse' && ['resource-limit','unsupported-operation'].includes(o.kind));";
 const first="ruleCode:one(['return-outside-function'])",second="ruleCode:one(['return-outside-function','duplicate-block-lexical-function'])",third="ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter'])";
 const current=read('typescript/tools/test262/'+file).replaceAll('\r\n','\n');assert.equal(current,old.replace(before,after).replace(first,second).replaceAll('\r\n','\n'));
 const future=current.replace(second,third);assert.equal(future,old.replace(before,after).replace(first,third).replaceAll('\r\n','\n'));
 sourceClosure.push({file,currentSha256:sha(current),futureNormalizedSha256:sha(future),edit:'one exact closed literal addition; no decoder code loaded or changed'});
}
const results=[];
for(const args of [
 ['typescript/docs/validation/ts-035d4-p/verify.mjs'],
 ...['freeze','proposals','verify','wire','check'].map(n=>['--check','typescript/docs/validation/ts-035d4-p/'+n+'.mjs']),
 ...json('proposal-manifest.json').entries.filter(e=>e.intent!=='identity').map(e=>['--check','typescript/docs/validation/ts-035d4-p/proposed/'+e.path]),
]){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});results.push({args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});assert.equal(r.status,0,JSON.stringify(results.at(-1)));assert.equal(r.signal,null);assert.equal(r.error,undefined);}
writeFileSync(new URL('checks.json',here),JSON.stringify({claim:'Offline design checks only; no full suites/build/native/future production.',results,sourceClosure,legacyFallback:{sha256:sha(legacy),bytes:legacy},wire:json('wire-audit.json'),acceptedD3Snapshots:77,acceptedD2Snapshots:90,
 correctedVerifierAttempt:'Initial Git-byte verification normalized all CRLF and failed on the intentionally binary CRLF fixture (actual fe745ae55df895bfde15f70df121ecf2d861688a4a6599b066f5ca20a0ff75dd versus d639828e78419a5d80e8730eb02a13504e56b056d9ea5647aa349cf488f0d026). Corrected proposal records exact Git bytes separately, checks Git object hash, and retains checkout byte equality. No protected file was changed.'},null,2)+'\n');
console.log('PASS '+results.length+' checks; D3 77 and D2 90 current snapshots; exact C closure; legacy fallback retained');
