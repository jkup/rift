import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {variants,blockers} from '../../../tools/test262/input.mjs';
import {completed} from '../../../tools/probe-verdict.mjs';
const here='docs/validation/ts-035d4',root=new URL('../../../../',import.meta.url),base='929ff90';
const read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const production=['src/parser.ts','src/script-declarations.ts','src/script-observation.ts','src/script-observation-types.ts','tools/test262/script-driver-result.mjs','tools/test262/script-result.mjs'];
const migrations=json('docs/validation/ts-035d4-p/proposal-manifest.json').entries.filter(e=>e.originalSha256!==e.resultSha256).map(e=>e.path);
const allowed=new Set(['COORDINATION.md','TASKS.md','docs/feature-inventory.md','tools/build-native.mjs','test/script-strict-parameter-dispatch.ts','tools/test262/script-strict-parameter-dispatch.test.mjs',...production].map(p=>'typescript/'+p).concat(migrations));
const owned=p=>allowed.has(p)||p.startsWith('typescript/docs/validation/ts-035d4/')||p.startsWith('typescript/fixtures/script-strict-parameter-dispatch/');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
for(const list of [git('diff',base,'--name-only'),git('ls-files','--others','--exclude-standard')])assert.deepEqual(list.split('\n').filter(Boolean).filter(p=>!owned(p)),[]);
if(process.argv.includes('--baseline')){
 const paths=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p));
 const audit=json('docs/validation/ts-035d4-p/audit.json');for(const p of audit.protectedInventory.filter(p=>!owned(p.path)))assert.equal(sha(read(p.path)),p.sha256,p.path);
 writeFileSync(here+'/protected-baseline.json',JSON.stringify(paths.map(path=>({path,sha256:sha(read(path))})),null,2)+'\n');console.log('baseline',paths.length);process.exit(0);
}
for(const p of json(here+'/protected-baseline.json'))assert.equal(sha(read(p.path)),p.sha256,p.path);
for(const p of json(here+'/source-closure.json'))assert.equal(sha(read('typescript/'+p.path)),p.sha256,p.path);
for(const p of json(here+'/run-source-hashes.json'))assert.equal(sha(read('typescript/'+p.path)),p.sha256,p.path);
execFileSync(process.execPath,['docs/validation/ts-035d4-p/verify.mjs','--applied'],{stdio:'inherit'});
const normal=s=>s.replaceAll('\r\n','\n').trim();
assert.equal(normal(read('typescript/TASKS.md').toString().split('### TS-035D4 -')[0]),normal(git('show',base+':typescript/TASKS.md').split('### TS-035D4 -')[0]));
assert.equal(normal(read('typescript/docs/feature-inventory.md').toString().split('## TS-035D4 strict parameter rejection')[0]),normal(git('show',base+':typescript/docs/feature-inventory.md')));
const oldBuild=git('show',base+':typescript/tools/build-native.mjs');assert.equal(normal(read('typescript/tools/build-native.mjs').toString()),normal(oldBuild.replace('["test/script-strict-parameter-audit.ts", "script-strict-parameter-audit"]])','["test/script-strict-parameter-audit.ts", "script-strict-parameter-audit"], ["test/script-strict-parameter-dispatch.ts", "script-strict-parameter-dispatch"]])')));
for(const lane of ['node','native']){const old=json('docs/validation/ts-035d3/guest-'+lane+'-results.json'),now=json(here+'/guest-'+lane+'-results.json');assert.equal(now.length,212);assert.ok(now.every(r=>r.verdict==='PASS'));assert.deepEqual(now.map(r=>({name:r.name,expected:r.expected})),old.map(r=>({name:r.name,expected:r.expected})));}
const gates=json(here+'/native-build-results.json'),old=json('docs/validation/ts-035d3/native-build-results.json');assert.equal(gates.length,67);assert.deepEqual(gates.slice(0,66).map(g=>g.entry),old.map(g=>g.entry));assert.equal(gates[66].entry,'test/script-strict-parameter-dispatch.ts');
for(const g of gates){assert.equal(g.verdict,'PASS',g.entry);assert.ok(completed(g.build)&&completed(g.coverage));const a=g.coverage.stdout.match(/statements analyzed\s+(\d+)/),s=g.coverage.stdout.match(/compile statically\s+(\d+)\s+\(100%\)/);assert.ok(a&&s&&+a[1]>0&&a[1]===s[1]);assert.ok(g.coverage.stdout.includes('fully static — all analyzed statements compile to native code.'));assert.ok(!/in dynamic tier\s+[1-9]/.test(g.coverage.stdout));}
for(const [name,count] of [['matrix',772],['wire',96],['controls',2],['metadata',48],['D3-source',154],['D2-source',360],['D2-wire',64],['D2-extra',14],['D1-source',124],['D1-extra',24]]){const r=json(here+'/'+name+'-results.json');assert.equal(r.length,count,name);assert.ok(r.every(x=>x.status===0&&x.signal===null),name);}
const suites=json(here+'/required-suite-results.json');assert.equal(suites.length,32);assert.ok(suites.every(r=>r.status===0&&r.signal===null&&r.error===null));
const manifest=json('fixtures/assistance/test262-starter-corpus/manifest.json');assert.equal(manifest.entries.length,33);const planned=manifest.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});assert.equal(planned.length,60);assert.ok(planned.every(r=>r.blockers.length));
const observed=read('typescript/src/script-observation.ts').toString(),previous=git('show',base+':typescript/src/script-observation.ts');assert.equal(normal(observed.slice(observed.indexOf('        // Preserve independent legacy'))),normal(previous.slice(previous.indexOf('        // Preserve independent legacy'))));
writeFileSync(here+'/preservation.json',JSON.stringify({base,production,protected:json(here+'/protected-baseline.json').length,oldWholeFiles:855,exactMigrations:4,guestRecordsPerHost:212,oldGates:66,newGates:1,zeroDynamic:true,matrix:772,wire:96,requiredSuites:32,planned},null,2)+'\n');console.log('PASS scoped preservation, 855 whole files, 212 both, 66+1 static gates, all60blocked');
