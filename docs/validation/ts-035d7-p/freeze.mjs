import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import * as p from '../../../build/node/src/parser.js';
import {observeScripts} from '../../../build/node/src/script-observation.js';
import {scriptObservationJSONRecord} from '../../../build/node/src/script-observation-json.js';
import {variants,blockers} from '../../../tools/test262/input.mjs';
import {cases} from './cases.mjs';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='041982113d292a9035ea644bdb3eae104963942f';
const read=f=>readFileSync(new URL(f,root)),hash=b=>createHash('sha256').update(b).digest('hex'),git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:256*1024*1024});
const json=f=>JSON.parse(readFileSync(new URL(f,here))),write=(f,v)=>{const u=new URL(f,here);mkdirSync(new URL('./',u),{recursive:true});writeFileSync(u,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const nodes=()=>({source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()});
const refs=json('references.json'),s19=refs[0];assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(s19.content)+'\0'),Buffer.from(s19.content)])).digest('hex'),s19.gitBlob);
for(const prefix of ['', '"use strict";\n']){const text=prefix+s19.content;cases.push({id:'S19'+(prefix?'-strict':'-raw'),text,sites:[{start:text.indexOf('let x'),context:'while-body'}],neighbor:null});}
function location(text,index){const prefix=text.slice(0,index),lines=prefix.split(/\r\n|\r|\n|\u2028|\u2029/);return {line:lines.length,column:lines.at(-1).length+1};}
function block(plan){assert.equal(plan.kind,'blocked');return {kind:'blocked',reason:'grammar-or-resource',diagnostic:plan.diagnostic,rejection:plan.rejection};}
function ordinary(text,id){const unit={id,text},n=nodes();const result={legacy:p.parse(text),returns:p.auditScriptReturns(text),declaration:p.parseDeclarationPlan(unit),bounded:p.parseBoundedScriptDeclarationPlan(unit),D1:p.auditBoundedScriptBlockFunctions(text),D3:p.auditBoundedScriptStrictParameters(text),D5:p.auditBoundedScriptNumericAssignments(text),preparation:p.parseBoundedScriptPreparation(unit,n)};return {result,retention:{source:n.source,body:n.body,scopes:[...n.scopes],declarations:[...n.declarations],assignments:[...n.assignmentNameEligible]}};}
const rows=[];
for(const c of cases){
 const {result:current,retention}=ordinary(c.text,c.id);let referenceText=c.neighbor;
 if(referenceText===null&&c.sites.length)referenceText=c.text.replace(/while\s*\(false\)|if\((?:false|true)\)|\belse\b|for\(;false;\)|for\(var i=0;i<1;i\+\+\)/g,m=>' '.repeat(m.length));
 // These are editorial equal-width valid-list neighbors, never future parser execution.
 const reference=referenceText===null?null:ordinary(referenceText,c.id+'/neighbor').result;
 let expected;
 const depth=c.id.startsWith('depth-');
 if(depth||c.text.length>100000){const resourceText=c.text.replaceAll('let x','var x'),r=p.parseBoundedScriptDeclarationPlan({id:'resource-neighbor',text:resourceText});if(r.kind==='blocked')expected=block(r);}
 if(!expected){
  const audited=reference??current;
  if(audited.D1.kind==='blocked')expected=audited.D1;
  else if(audited.D1.kind==='eligible'){const site=audited.D1.candidates[0].second;expected={kind:'blocked',reason:'other-conflict',rejection:null,diagnostic:{phase:'parse',name:'SyntaxError',message:'duplicate-lexical: '+site.name,loc:site.loc}};}
  else if(!c.sites.length)expected={kind:'none',sourceUnits:c.text.length,consumedUnits:c.text.length};
  else {
   const candidates=c.sites.map(s=>{assert.equal(c.text.slice(s.start,s.start+3),'let',c.id);return {ruleCode:'lexical-declaration-statement',context:s.context,keyword:{text:'let',start:s.start,end:s.start+3,loc:location(c.text,s.start)}};}).sort((a,b)=>a.keyword.start-b.keyword.start);
   expected={kind:'eligible',sourceUnits:c.text.length,consumedUnits:c.text.length,candidates};
  }
 }
 // Non-candidate excluded forms cannot become none merely by a helpful neighbor.
 if(!c.sites.length&&c.id.startsWith('excluded-')&&expected.kind==='none')expected=block(current.bounded);
 const futurePreparation=structuredClone(current.preparation);
 if(expected.kind==='eligible') {assert.equal(current.preparation.kind,'blocked');assert.equal(current.preparation.rejection.capabilityCode,'parse.declaration-statement',c.id);futurePreparation.rejection={kind:'syntax-error',ruleCode:'lexical-declaration-statement'};futurePreparation.diagnostic={phase:'parse',name:'SyntaxError',message:'lexical declaration is not allowed in Statement position',loc:expected.candidates[0].keyword.loc};}
 const contexts=[];
 for(const action of ['parse-only','execute'])for(const role of ['test','harness']){
  if(current.preparation.kind==='complete'&&(action!=='parse-only'||role!=='test'))continue;
  const request={nonce:'D7/'+c.id,requestSha256:'a'.repeat(64),action,preflightId:role==='harness'?'preflight':null,steps:10000,calls:64,units:[{id:'u0',role,text:c.text},...(role==='harness'?[{id:'u1',role:'test',text:'throw 19;'}]:[])]};
  const observed=observeScripts(request),future=structuredClone(observed);
  if(expected.kind==='eligible'){future.result={kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:'lexical-declaration-statement'};future.source.location=structuredClone(expected.candidates[0].keyword.loc);}
  contexts.push({request,current:observed,expected:future,ascii:scriptObservationJSONRecord(future)});
 }
 rows.push({...c,sourceUnits:c.text.length,sha256:hash(c.text),current,retention,referenceText,reference,expected,futurePreparation,contexts});
}
write('semantic-matrix.json',{base,claim:'Current accepted D6 Node only. Future audit literals inferred from editorial supported neighbors and fixed context contract; no continuation implementation. Both hosts are future obligations.',hosts:['node','native'],orders:[['alpha','beta'],['beta','alpha']],rows});
for(const [file,id] of [['alpha','R0'],['beta','R1']])write('inputs/'+file+'.js',rows.find(r=>r.id===id).text);
const inherited=[];
for(const [scope,file] of [['D2','ts-035d2-p/semantic-matrix.json'],['D3','ts-035d3/frozen.json'],['D4','ts-035d4-p/semantic-matrix.json'],['D5','ts-035d5-p/semantic-matrix.json'],['D6','ts-035d6-p/semantic-matrix.json']]){
 const data=json('../'+file);for(const r of data.rows??data){const current=ordinary(r.text,r.id);inherited.push({scope,id:r.id,text:r.text,current,expected:current});}
}
const inheritedBytes=Buffer.from(JSON.stringify({base,claim:'Full current accepted snapshots; first non-emitting slice changes none. Includes all D5 and D6 preparation consumers.',rows:inherited},null,2)+'\n');
writeFileSync(new URL('inherited-preparations.json.gz',here),gzipSync(inheritedBytes));
write('inherited-manifest.json',{encoding:'gzip of complete UTF-8 JSON; lossless, no rows or fields omitted',compressedSha256:hash(readFileSync(new URL('inherited-preparations.json.gz',here))),uncompressedSha256:hash(inheritedBytes),uncompressedBytes:inheritedBytes.length,rows:inherited.length});
const tree=git('ls-tree','-r',base).toString().trim().split('\n').map(l=>{const [a,path]=l.split('\t');return {path,blob:a.split(' ')[2]};});
const own=f=>['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/script-lexical-statement-rule.md'].includes(f)||f.startsWith('typescript/docs/validation/ts-035d7-p/');
const protectedInventory=tree.filter(e=>!own(e.path)).map(e=>({...e,sha256:hash(read(e.path))}));
const pattern=/lexical-declaration-statement|lexical-rule|parse\.declaration-statement|parseBoundedScriptPreparation|futurePreparation|row\.current|r\.current|ruleCode:one|assignment-rule/;
write('source-consumers.json',{base,pattern:pattern.source,consumers:tree.filter(e=>e.path.startsWith('typescript/')&&/\.(ts|mjs)$/.test(e.path)).flatMap(e=>{const lines=read(e.path).toString().split(/\r?\n/).flatMap((text,i)=>pattern.test(text)?[{line:i+1,text}]:[]);return lines.length?[{...e,sha256:hash(read(e.path)),lines}]:[];})});
const corpus=JSON.parse(read('typescript/fixtures/assistance/test262-starter-corpus/manifest.json')),planned=corpus.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});assert.equal(planned.length,60);assert(planned.every(r=>r.blockers.length));
const artifacts=readdirSync(new URL('typescript/build/node/src/',root),{recursive:true}).filter(f=>f.endsWith('.js')).map(f=>({path:'typescript/build/node/src/'+f.replaceAll('\\','/'),sha256:hash(read('typescript/build/node/src/'+f))}));
write('audit.json',{base,node:process.version,claim:'212 records and 69 gates inherited, not rerun; no native or full-build claim',protectedInventory,artifacts,planned});
console.log(JSON.stringify({rows:rows.length,eligible:rows.filter(r=>r.expected.kind==='eligible').length,blocked:rows.filter(r=>r.expected.kind==='blocked').length,contexts:rows.flatMap(r=>r.contexts).length,inherited:inherited.length,protected:protectedInventory.length}));
