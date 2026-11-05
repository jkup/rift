import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as parser from '../../../build/node/src/parser.js';
import {observeScripts} from '../../../build/node/src/script-observation.js';
import {scriptObservationJSONRecord} from '../../../build/node/src/script-observation-json.js';
import {variants,blockers} from '../../../tools/test262/input.mjs';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='335663fcddf5bfc595369c6a8f68b584a9165e0f';
const read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(read(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:128*1024*1024});
const write=(p,v)=>{const dest=new URL(p,here);mkdirSync(new URL('./',dest),{recursive:true});writeFileSync(dest,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const nodes=()=>({source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()});
const tree=git('ls-tree','-r',base).toString().trim().split('\n').map(l=>{const [a,path]=l.split('\t');return {path,blob:a.split(' ')[2]};});
const own=p=>p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p==='typescript/docs/script-assignment-target-dispatch.md'||p.startsWith('typescript/docs/validation/ts-035d6-p/');
const protectedInventory=tree.filter(e=>!own(e.path)).map(e=>({...e,sha256:hash(read(e.path))}));
const old=json('typescript/docs/validation/ts-035d5-p/semantic-matrix.json');
const rows=[];let ordinaryChecks=0;
for(const r of old.rows){
 const unit={id:r.id,text:r.text},n=nodes();
 const current={legacy:parser.parse(r.text),returns:parser.auditScriptReturns(r.text),declaration:parser.parseDeclarationPlan(unit),bounded:parser.parseBoundedScriptDeclarationPlan(unit),D1:parser.auditBoundedScriptBlockFunctions(r.text),D3:parser.auditBoundedScriptStrictParameters(r.text),preparation:parser.parseBoundedScriptPreparation(unit,n)};
 assert.deepEqual(current,r.current,r.id+' accepted D5 ordinary');ordinaryChecks++;
 const audit=parser.auditBoundedScriptNumericAssignments(r.text);assert.deepEqual(audit,r.expected,r.id+' complete D5 audit');
 const retention={source:n.source,body:n.body,scopes:[...n.scopes],declarations:[...n.declarations],assignmentNameEligible:[...n.assignmentNameEligible]};assert.deepEqual(retention,r.retention,r.id);
 const futurePreparation=structuredClone(r.futurePreparation);
 const contexts=[];
 // Parse-only never runs a test. Other contexts only use already rejected sources;
 // no harness prefixes are evaluated in this offline design probe.
 for(const action of ['parse-only','execute'])for(const role of ['test','harness']){
  if(current.preparation.kind==='complete'&&(action!=='parse-only'||role!=='test'))continue;
  const request={nonce:'D6/'+r.id,requestSha256:'a'.repeat(64),action,preflightId:role==='harness'?'preflight':null,steps:10000,calls:64,units:role==='test'?[{id:'u0',role,text:r.text}]:[{id:'u0',role,text:r.text},{id:'u1',role:'test',text:'throw 19;'}]};
  const currentChild=observeScripts(request),expected=structuredClone(currentChild);
  if(audit.kind==='eligible'){
   assert.equal(current.preparation.rejection.capabilityCode,'parse.assignment-target');
   expected.result={kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:'assignment-target'};
   expected.source.location=structuredClone(audit.candidates[0].target.loc);
  }
  const ascii=scriptObservationJSONRecord(expected);assert.deepEqual(JSON.parse(ascii),expected);
  contexts.push({action,role,request,current:currentChild,expected,ascii,claim:'Expected future child serialized by current Node serializer; current child is actual unchanged D5. No future producer.'});
 }
 rows.push({...r,current,audit,retention,futurePreparation,contexts});
}
write('semantic-matrix.json',{base,claim:'Complete literal expectations; current D5 Node audit/preparation and rejected producer only. Future dispatch not executed.',hosts:['node','native'],orders:[['alpha','beta'],['beta','alpha']],rows});
for(const [file,id] of [['alpha','R0'],['beta','R1']])write('inputs/'+file+'.js',rows.find(r=>r.id===id).text);
// Replay every inherited preparation corpus directly without invoking evidence writers.
const inherited=[];
for(const [scope,file] of [['D2','ts-035d2-p/semantic-matrix.json'],['D3','ts-035d3/frozen.json'],['D4','ts-035d4-p/semantic-matrix.json']]){
 const data=json('typescript/docs/validation/'+file);for(const r of data.rows??data){
  const original=parser.parseBoundedScriptPreparation({id:r.futurePreparation?.unit.id??r.id,text:r.text},nodes());
  const audit=parser.auditBoundedScriptNumericAssignments(r.text);
  assert.notEqual(audit.kind,'eligible',scope+'/'+r.id+' inherited source must not migrate');
  inherited.push({scope,id:r.id,text:r.text,original,audit,expected:original});
 }
}
write('inherited-preparations.json',{base,rows:inherited});
const consumerPattern=/parseBoundedScriptPreparation|auditBoundedScriptNumericAssignments|prepareBoundedScript|assignment-target|assignment-rule|futurePreparation|row\.current|r\.current|ruleCode:one/;
const consumers=tree.filter(e=>e.path.startsWith('typescript/')&&/\.(ts|mjs)$/.test(e.path)).flatMap(e=>{
 const lines=read(e.path).toString().split(/\r?\n/).flatMap((text,i)=>consumerPattern.test(text)?[{line:i+1,text}]:[]);
 return lines.length?[{...e,sha256:hash(read(e.path)),category:e.path.includes('/proposed')||e.path.includes('/original-')?'archived proposal':e.path.includes('/docs/validation/')?'validation producer/validator or milestone proof':e.path.startsWith('typescript/src/')?'production':'test/adapter',lines}]:[];
});write('source-consumers.json',{base,pattern:consumerPattern.source,scope:'Every tracked TypeScript .ts/.mjs including ignored tools and historical proposals',consumers});
const corpus=json('typescript/fixtures/assistance/test262-starter-corpus/manifest.json');
const planned=corpus.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});assert.equal(planned.length,60);assert(planned.every(r=>r.blockers.length));
const artifacts=readdirSync(new URL('typescript/build/node/src/',root),{recursive:true}).filter(p=>p.endsWith('.js')).map(p=>({path:'typescript/build/node/src/'+p.replaceAll('\\','/'),sha256:hash(read('typescript/build/node/src/'+p))}));
write('audit.json',{base,node:process.version,claim:'Offline current Node only; 212 records/68 gates inherited, not rerun; no native claim',protectedInventory,artifacts,planned,ordinaryChecks,inheritedPreparations:inherited.length,consumerFiles:consumers.length});
console.log(JSON.stringify({rows:rows.length,contexts:rows.flatMap(r=>r.contexts).length,inherited:inherited.length,protected:protectedInventory.length,consumers:consumers.length,blocked:60}));
