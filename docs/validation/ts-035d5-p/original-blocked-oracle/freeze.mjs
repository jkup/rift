import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as parser from '../../../build/node/src/parser.js';
import {lex} from '../../../build/node/src/lexer.js';
import {observeScripts} from '../../../build/node/src/script-observation.js';
import {variants,blockers} from '../../../tools/test262/input.mjs';
import {rows} from './cases.mjs';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='267e4e8';
const read=p=>readFileSync(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const write=(p,v)=>writeFileSync(new URL(p,here),JSON.stringify(v,null,2)+'\n');
const refs=JSON.parse(readFileSync(new URL('references.json',here))),raw=refs[0].content;
assert.equal(createHash('sha1').update(Buffer.from('blob '+Buffer.byteLength(raw)+'\0'+raw)).digest('hex'),'326043282e5f676c607dae1390fa036d347191e1');
for(const [id,text] of [['S18-raw',raw],['S18-strict','"use strict";\n'+raw]])rows.push({id,text,expected:{kind:'eligible',sites:[{token:'42',operator:'=',occurrence:0}]}});
const nodes=()=>({source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()});
const loc=(text,i)=>{const a=text.slice(0,i).split(/\r\n|[\r\n\u2028\u2029]/);return {line:a.length,column:a.at(-1).length+1};};
for(const r of rows){
 const {text,id}=r,unit={id,text};r.sha256=hash(text);r.sourceUnits=text.length;
 if(r.expected.kind==='eligible'){
  const tokens=lex(text,true).tokens;
  r.expected={kind:'eligible',sourceUnits:text.length,consumedUnits:text.length,candidates:r.expected.sites.map(s=>{
   const t=tokens.filter(t=>t.kind==='number'&&t.text===s.token)[s.occurrence];assert(t,id);
   const op=tokens.find(t2=>t2.start>=t.end&&t2.text===s.operator);assert(op,id);
   return {ruleCode:'assignment-target',target:{text:t.text,start:t.start,end:t.end,loc:loc(text,t.start)},operator:{text:op.text,start:op.start,end:op.end,loc:loc(text,op.start)}};
  }).sort((a,b)=>a.operator.start-b.operator.start||a.target.start-b.target.start)};
 }else if(r.expected.kind==='none')Object.assign(r.expected,{sourceUnits:text.length,consumedUnits:text.length});
 const n=nodes();r.current={legacy:parser.parse(text),returns:parser.auditScriptReturns(text),declaration:parser.parseDeclarationPlan(unit),bounded:parser.parseBoundedScriptDeclarationPlan(unit),D1:parser.auditBoundedScriptBlockFunctions(text),D3:parser.auditBoundedScriptStrictParameters(text),preparation:parser.parseBoundedScriptPreparation(unit,n)};
 r.retention={source:n.source,body:n.body,scopes:[...n.scopes],declarations:[...n.declarations],assignmentNameEligible:[...n.assignmentNameEligible]};
 r.currentC=observeScripts({nonce:'design',requestSha256:'a'.repeat(64),action:'parse-only',preflightId:null,steps:10000,calls:64,units:[{id:'u0',role:'test',text}]});
 // Complete future preparation value, ordinary snapshot retained separately.
 r.futurePreparation=structuredClone(r.current.preparation);
 if(r.expected.kind==='eligible'){
  assert.equal(r.current.preparation.rejection.capabilityCode,'parse.assignment-target',id);
  r.futurePreparation={kind:'blocked',goal:'Script',unit,rejection:{kind:'syntax-error',ruleCode:'assignment-target'},diagnostic:{phase:'parse',name:'SyntaxError',message:'invalid numeric assignment target',loc:r.expected.candidates[0].target.loc}};
 }
}
mkdirSync(new URL('inputs/',here),{recursive:true});for(const [name,id] of [['alpha','R0'],['beta','R1']])writeFileSync(new URL('inputs/'+name+'.js',here),rows.find(r=>r.id===id).text);
write('semantic-matrix.json',{base,claim:'Editorial future audit/emission expectations; current is existing Node parse-only evidence. No future code executed.',hosts:['node','native'],inputOrders:[['alpha','beta'],['beta','alpha']],rows});
const paths=execFileSync('git',['ls-tree','-r','--name-only',base],{cwd:root,encoding:'utf8'}).trim().split('\n');
const owned=p=>['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/script-assignment-target-rule.md'].includes(p)||p.startsWith('typescript/docs/validation/ts-035d5-p/');
const protectedInventory=paths.filter(p=>!owned(p)).map(path=>({path,sha256:hash(read(path))}));
const corpus=JSON.parse(read('typescript/fixtures/assistance/test262-starter-corpus/manifest.json'));
const planned=corpus.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});
assert.equal(planned.length,60);assert(planned.every(r=>r.blockers.length));
const artifacts=readdirSync(new URL('typescript/build/node/src/',root),{recursive:true}).filter(p=>p.endsWith('.js')).map(p=>({path:'typescript/build/node/src/'+p.replaceAll('\\','/'),sha256:hash(read('typescript/build/node/src/'+p))}));
write('audit.json',{base,node:process.version,inherited:{recordsPerHost:212,staticGates:67,rerun:false},protectedInventory,artifacts,planned});
console.log(JSON.stringify({rows:rows.length,protected:protectedInventory.length,blocked:60}));
