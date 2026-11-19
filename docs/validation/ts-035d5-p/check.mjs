import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(readFileSync(new URL(p,here))),sha=s=>createHash('sha256').update(s).digest('hex');
const observer=read('typescript/src/script-observation.ts');
const legacy=observer.slice(observer.indexOf('        // Preserve independent legacy return certification'),observer.indexOf('        return this.envelope(operation, site, rejection);'));
assert(legacy.includes('this.request.action === "parse-only" && unit.role === "test"'));
const sourceClosure=[];
for(const file of ['script-driver-result.mjs','script-result.mjs']){
 const current=read('typescript/tools/test262/'+file),from="ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter'])",to="ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter','assignment-target'])";
 assert.equal(current.split(from).length,2);sourceClosure.push({file,currentSha256:sha(current),futureSha256:sha(current.replace(from,to)),edit:'one closed literal addition; no future decoder loaded'});
}
const results=[];
for(const args of [
 ['typescript/docs/validation/ts-035d5-p/verify.mjs'],
 ['typescript/docs/validation/ts-035d5-p/probe.mjs'],
 ['typescript/docs/validation/ts-035d5-p/oracle-controls.mjs'],
 ...['cases','freeze','proposals','verify','wire','make-wire','probe','check','freeze-blocked','oracle-controls'].map(n=>['--check','typescript/docs/validation/ts-035d5-p/'+n+'.mjs']),
 ...json('proposal-manifest.json').entries.filter(e=>e.originalSha256!==e.emissionSha256).map(e=>['--check','typescript/docs/validation/ts-035d5-p/proposed-emission/'+e.path]),
]){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});const record={args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr};results.push(record);
 if(r.status!==0||r.signal||r.error){let i=1;while(existsSync(new URL('failed-check-'+i+'.json',here)))i++;writeFileSync(new URL('failed-check-'+i+'.json',here),JSON.stringify(record,null,2)+'\n');}
 assert.equal(r.status,0,JSON.stringify(record));assert.equal(r.signal,null);assert.equal(r.error,undefined);
}
const m=json('semantic-matrix.json');for(const [file,id] of [['alpha','R0'],['beta','R1']])assert.equal(readFileSync(new URL('inputs/'+file+'.js',here),'utf8'),m.rows.find(r=>r.id===id).text);
writeFileSync(new URL('checks.json',here),JSON.stringify({claim:'Offline design validation only; no future API, native or guest run',results,sourceClosure,legacyFallback:{sha256:sha(legacy),bytes:legacy},wire:json('wire-audit.json'),neighbors:56,acceptedD4:193},null,2)+'\n');
console.log('PASS '+results.length+' offline checks');
