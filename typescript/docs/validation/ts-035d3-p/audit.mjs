import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {cases,runtimeSources} from './cases.mjs';
import {parse,parseDeclarationPlan,parseBoundedScriptDeclarationPlan,auditScriptReturns,auditBoundedScriptBlockFunctions,parseBoundedScriptPreparation} from '../../../build/node/src/parser.js';
import {variants,blockers} from '../../../tools/test262/input.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const base='f3672ee';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const sha=x=>createHash('sha256').update(x).digest('hex');
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/docs/script-strict-parameter-audit.md'||p.startsWith('typescript/docs/validation/ts-035d3-p/');
const outside=git('diff',base,'--name-only').split('\n').filter(p=>p&&!owned(p)&&p!=='typescript/COORDINATION.md');
assert.deepEqual(outside,[]);
const manifest=JSON.parse(readFileSync(root+'typescript/fixtures/assistance/test262-starter-corpus/manifest.json'));
const planned=manifest.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});
assert.equal(planned.length,60);assert(planned.every(x=>x.blockers.length));
const pinned=JSON.parse(readFileSync(new URL('../ts-035d-p/pinned.json',import.meta.url))).s21;
const bytes=Buffer.from(pinned.content);
assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'),manifest.entries.find(e=>e.id==='S21').blob);
const inputs=[...cases,...runtimeSources.map((s,i)=>['R'+i,s,'eligible']),['S21','"use strict";\n'+pinned.content,'eligible'],['S21-raw',pinned.content,'blocked']];
const rows=inputs.map(([id,text,futureKind])=>{
 const unit={id,text};
 const nodes={assignmentNameEligible:new Map(),source:{text:''},body:[],scopes:new Map(),declarations:new Map()};
 return {id,text,sourceUnits:text.length,sha256:sha(text),futureKind,current:{legacy:parse(text),returns:auditScriptReturns(text),declaration:parseDeclarationPlan(unit),bounded:parseBoundedScriptDeclarationPlan(unit),D1:auditBoundedScriptBlockFunctions(text),D2:parseBoundedScriptPreparation(unit,nodes)}};
});
for(const id of ['P01','P02','P04','P15','L06','E48'])assert.equal(rows.find(r=>r.id===id).current.bounded.rejection.capabilityCode,'parse.duplicate-parameter');
assert.equal(rows.find(r=>r.id==='Q02').current.bounded.rejection.guardCode,'source-units');
// Distinct-formal resource controls are separately stated inputs, never candidate authority.
const resourceControls=['Q03','Q04','Q05','Q06'].map(id=>{
 const text=rows.find(r=>r.id===id).text.replace('f(a,a)','f(a,b)');
 const result=parseBoundedScriptDeclarationPlan({id:'control-'+id,text});
 assert.equal(result.kind,id==='Q03'||id==='Q05'?'complete':'blocked');
 if(result.kind==='blocked'){assert.equal(result.rejection.guardCode,'parse-depth');assert.equal(result.rejection.count,129);}
 return {id,text,result};
});
const protectedPaths=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md');
const artifacts=readdirSync(root+'typescript/build/node/src').filter(p=>p.endsWith('.js')).map(p=>'typescript/build/node/src/'+p);
const sourcePaths=['src/parser.ts','src/script-declarations.ts','src/script-prologue.ts','src/lexer.ts','src/script-observation.ts','src/script-execution-internal.ts'].map(p=>'typescript/'+p);
const result={base,head:git('rev-parse','HEAD'),node:process.version,claim:'Current existing-build parse/plan/audit probes only. No future audit, body execution, native run, build or full suites.',protectedTracked:protectedPaths.length,selectedFiles:manifest.entries.length,blockedVariants:planned.length,inherited:{records:212,gates:65,freshlyRun:false},sources:sourcePaths.map(path=>({path,sha256:sha(readFileSync(root+path))})),artifacts:artifacts.map(path=>({path,sha256:sha(readFileSync(root+path))})),planned,resourceControls,rows};
writeFileSync(new URL('current-audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
writeFileSync(new URL('sources.json',import.meta.url),JSON.stringify(inputs.map(([id,text,futureKind])=>({id,text,futureKind})),null,2)+'\n');
for(let i=0;i<runtimeSources.length;i++)writeFileSync(new URL('runtime-'+i+'.js',import.meta.url),runtimeSources[i]);
console.log(JSON.stringify({rows:rows.length,resourceControls:resourceControls.length,protected:protectedPaths.length,selected:manifest.entries.length,blocked:planned.length}));
