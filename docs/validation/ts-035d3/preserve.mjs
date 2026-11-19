import {verifyGates} from './verify-gates.mjs';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {variants,blockers} from '../../../tools/test262/input.mjs';
const here='docs/validation/ts-035d3',root=new URL('../../../../',import.meta.url),base='88ba287';
const read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const production=['src/parser.ts','src/script-declarations.ts'];
const allowed=new Set(['COORDINATION.md','TASKS.md','docs/feature-inventory.md','tools/build-native.mjs',...production].map(p=>'typescript/'+p));
const owned=p=>allowed.has(p)||p.startsWith('typescript/docs/validation/ts-035d3/')||p.startsWith('typescript/test/fixtures/script-strict-parameter-audit/')||p==='typescript/test/script-strict-parameter-audit.ts';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
for(const list of [git('diff',base,'--name-only'),git('ls-files','--others','--exclude-standard')])assert.deepEqual(list.split('\n').filter(Boolean).filter(p=>!owned(p)),[]);
if(process.argv.includes('--baseline')){
 const paths=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p));
 writeFileSync(here+'/protected-baseline.json',JSON.stringify(paths.map(path=>({path,sha256:sha(read(path))})),null,2)+'\n');
 console.log('baseline',paths.length);process.exit(0);
}
for(const source of json(here+'/run-source-hashes.json'))assert.equal(sha(read('typescript/'+source.path)),source.sha256,'final run source '+source.path);
const protectedPaths=json(here+'/protected-baseline.json');for(const p of protectedPaths)assert.equal(sha(read(p.path)),p.sha256,p.path+' recursive preservation');
const oldBuild=git('show',base+':typescript/tools/build-native.mjs'),normal=s=>s.replaceAll('\r\n','\n').trim();
assert.equal(normal(read('typescript/tools/build-native.mjs').toString()),normal(oldBuild.replace('["test/script-strict-rule-dispatch.ts", "script-strict-rule-dispatch"]])','["test/script-strict-rule-dispatch.ts", "script-strict-rule-dispatch"], ["test/script-strict-parameter-audit.ts", "script-strict-parameter-audit"]])')));
for(const lane of ['node','native']){
 const old=json('docs/validation/ts-035d2/guest-'+lane+'-results.json'),now=json(here+'/guest-'+lane+'-results.json');assert.equal(now.length,212);assert.ok(now.every(r=>r.verdict==='PASS'));assert.deepEqual(now.map(r=>({name:r.name,expected:r.expected})),old.map(r=>({name:r.name,expected:r.expected})));
}
const gates=json(here+'/native-build-results.json'),oldGates=json('docs/validation/ts-035d2/native-build-results.json');assert.equal(gates.length,66);assert.deepEqual(gates.slice(0,65).map(g=>g.entry),oldGates.map(g=>g.entry));assert.equal(gates[65].entry,'test/script-strict-parameter-audit.ts');
const nativeBuildEvidence=verifyGates(gates);
const matrix=json(here+'/matrix-results.json');assert.equal(matrix.length,154);assert.ok(matrix.every(r=>r.status===0&&r.signal===null&&r.error===null));
for(const [name,count] of [['D2-source',360],['D2-wire',64],['D2-extra',14],['D1-source',124],['D1-extra',24]]){
 const records=json(here+'/'+name+'-results.json');assert.equal(records.length,count,name);assert.ok(records.every(r=>r.status===0&&r.signal===null),name);
}
const suites=json(here+'/required-suite-results.json');assert.equal(suites.length,31);assert.ok(suites.every(r=>r.status===0&&r.signal===null&&r.error===null));
const manifest=json('fixtures/assistance/test262-starter-corpus/manifest.json');assert.equal(manifest.entries.length,33);const planned=manifest.entries.flatMap(e=>{const meta={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(meta).map(v=>({id:e.id,variant:v,blockers:blockers(meta,v,e.id)}));});assert.equal(planned.length,60);assert.ok(planned.every(r=>r.blockers.length));
// No production consumer outside the source-only bridge is authorized.
const parser=read('typescript/src/parser.ts').toString(),decl=read('typescript/src/script-declarations.ts').toString();
assert.equal(parser.match(/parseStructuralSource\(unit, null, true, true\)/g).length,1);
assert.equal(parser.match(/collectStrictParameterAudit\(unit,/g).length,1);
assert.equal(decl.match(/analysis.auditStrictParameters\(\)/g).length,1);
const oldTests=protectedPaths.filter(p=>p.path.startsWith('typescript/test/')||/\.test\.mjs$/.test(p.path));
writeFileSync(here+'/preservation.json',JSON.stringify({base,production,protectedPaths:protectedPaths.length,oldTestFiles:oldTests.length,guestRecordsPerHost:212,oldGates:65,newGates:1,nativeBuildEvidence,matrixRuns:154,literalRows:77,literalPairs:30,grammarDiagnostics:26,requiredSuites:31,planned,implementation:production.map(p=>({path:p,sha256:sha(read('typescript/'+p))}))},null,2)+'\n');
console.log('PASS protected '+protectedPaths.length+'; old tests '+oldTests.length+'; 212 both; 65+1 static gates; all60blocked; unchanged preparation/legacy fallback');
