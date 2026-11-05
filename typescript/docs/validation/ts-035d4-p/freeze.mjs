// Offline editorial freeze and current-build probes. Does not implement D4.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as parser from '../../../build/node/src/parser.js';
import {observeScripts} from '../../../build/node/src/script-observation.js';
import {variants,blockers} from '../../../tools/test262/input.mjs';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='257f7fa';
const read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(read(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024});
const write=(p,v)=>writeFileSync(new URL(p,here),JSON.stringify(v,null,2)+'\n');
const d2=json('typescript/docs/validation/ts-035d2-p/semantic-matrix.json').rows;
const d3=json('typescript/docs/validation/ts-035d3/frozen.json');
const inputs=[...d2.map(r=>({id:'D2/'+r.id,text:r.text})),...d3.map(r=>({id:'D3/'+r.id,text:r.text}))];
// Explicit combined-rule fixtures. Null means no new certification, not absence
// of a candidate inferred from failed parsing. Selected spelling is editorial.
const extras=[
 ['M01','"use strict"; function f(a,a){} {function g(){} function g(){}}','parameter','a,a',2],
 ['M02','"use strict"; {function g(){} function g(){}} function f(a,a){}','block','function g(){} function g',24],
 ['M03','function outer(){"use strict"; function f(a,a){} {function g(){} function g(){}}}','parameter','a,a',2],
 ['M04','"use strict"; {function g(a,a){} function g(){}}','parameter','a,a',2],
 ['M05','function s(a,a){} function p(b,b){"use strict"; {function g(){} function g(){}}}',null],
 ['M06','function p(b,b){"use strict"; {function g(){} function g(){}}} function s(a,a){}',null],
 ['M07','"use strict"; {function g(){} function g(){} let g;} function p(a,a){}',null],
 ['M08','"use strict"; function p(a,a){} {function g(){} function g(){} var g;}',null],
 ['M09','"use strict"; function p(a,a){} {function g(){} function g(){}} try{}catch(e){let e;}',null],
 ['M10','"use strict"; function p(a,a){} {function g(){} function g(){}} class C {}',null],
 ['M11','"use strict"; {function g(){} function g(){}} function p(a,a){} return 1;',null],
 ['M12','return 1; "use strict"; function p(a,a){}',null],
 ['M13','function p(a,a){"use strict";} return 1;',null],
 ['M14','return 1; {function single(){}}',null],
 ['M15','"use strict"; this.effect=1; function p(a,a){}','parameter','a,a',2],
 ['M16','function p(a,a){"use strict";} throw 19;','parameter','a,a',2],
 ['M17','function p(a,a){"use strict";} function q(){delete x;}','parameter','a,a',2],
 ['M18','"use strict"; function p(a,a){} function q(){delete x;}',null],
 ['M19','function p(a,a){("use strict");} {function g(){} function g(){}}',null],
 ['M20','"use strict"; function p(a,a){} switch(0){case 0:function g(){} function g(){}}',null],
 ['M21','"use strict"; function p(a,a){} {function g(){} function g(){}} "unterminated',null],
 ['M22','"use strict"; {function g(){} function g(){}} function p(a,a){}'+'{'.repeat(128)+';'+'}'.repeat(128),null],
 ['M23','function outer(){"use strict"; return function(a,a){};}','parameter','a,a',2],
 ['M24','"use strict"; {function g(){} function g(){}} function p(a,a){}'+' '.repeat(100001-62),null],
 ['M25','"use strict"; function p(a,b){} 7;',null],
 ['M26','function p(a,b){} 7;',null],
];
for(const [id,text] of extras)inputs.push({id,text});
const nodes=()=>({source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()});
const copy=structuredClone;
function loc(text,start){const lines=text.slice(0,start).split(/\r\n|[\r\n\u2028\u2029]/);return {line:lines.length,column:lines.at(-1).length+1};}
function selection(text,kind,marker,delta){const start=text.indexOf(marker)+delta;assert(text.indexOf(marker)>=0);const name=kind==='block'?'g':text[start];assert.equal(text.slice(start,start+name.length),name);return {ruleCode:kind==='block'?'duplicate-block-lexical-function':'duplicate-strict-parameter',name,start,location:loc(text,start)};}
const rows=[];
for(const input of inputs){
 const {id,text}=input,unit={id:id.split('/').at(-1),text};
 const current={legacy:parser.parse(text),returns:parser.auditScriptReturns(text),declaration:parser.parseDeclarationPlan(unit),bounded:parser.parseBoundedScriptDeclarationPlan(unit),D1:parser.auditBoundedScriptBlockFunctions(text),D2:parser.parseBoundedScriptPreparation(unit,nodes()),D3:parser.auditBoundedScriptStrictParameters(text)};
 let selected=null;
 // Accepted D3 literal eligible pairs supply independent expected sites. They
 // are not learned from the current probe. Three mixed rows are hand selected.
 const old=d3.find(r=>r.text===text);
 if(old?.expected.kind==='eligible') {const c=old.expected.candidates[0];selected={ruleCode:c.ruleCode,name:c.second.name,start:c.second.start,location:c.second.loc};}
 if(id==='D3/E28')selected=selection(text,'parameter','a,a',2);
 if(id==='D3/E29')selected=selection(text,'block','function g(){} function g',24);
 if(id==='D2/X09')selected={ruleCode:'duplicate-block-lexical-function',name:'f',start:39,location:{line:1,column:40}};
 const extra=extras.find(r=>r[0]===id);if(extra)selected=extra[2]===null?null:selection(text,...extra.slice(2));
 let futurePreparation=copy(current.D2);
 if(selected){
  assert.equal(text.slice(selected.start,selected.start+selected.name.length),selected.name,id);
  assert.deepEqual(loc(text,selected.start),selected.location,id);
  assert.equal(current.D2.kind,'blocked',id);
  assert.equal(current.D2.rejection.capabilityCode,'parse.duplicate-parameter',id);
  futurePreparation={kind:'blocked',goal:'Script',unit,rejection:{kind:'syntax-error',ruleCode:selected.ruleCode},diagnostic:{phase:'parse',name:'SyntaxError',message:(selected.ruleCode==='duplicate-strict-parameter'?'duplicate strict parameter: ':'duplicate block lexical function: ')+selected.name,loc:copy(selected.location)}};
 }
 const currentParseOnly=observeScripts({nonce:'design',requestSha256:'a'.repeat(64),action:'parse-only',preflightId:null,steps:10000,calls:64,units:[{id:'u0',role:'test',text}]});
 // Future contexts for all inherited D2 rows are already literal. For new rows
 // only rejection and simple 7-valued ready neighbors are expanded here.
 const contexts=[];
 for(const action of ['parse-only','execute'])for(const role of ['test','harness']){
  const oldContext=id.startsWith('D2/')?copy(d2.find(r=>'D2/'+r.id===id).contexts.find(r=>r.action===action&&r.role===role)):null;
  if(!selected&&oldContext){contexts.push(oldContext);continue;}
  const p=futurePreparation,unitId=role==='test'?'u0':'u1';
  let result,location=p.diagnostic?.loc??null,phase='parse';
  if(p.kind==='complete'){result={kind:'normal'};phase=action==='execute'?'body':'parse';}
  else if(p.kind==='conflict')result={kind:'unsupported-syntax',capabilityCode:'script.uncertified-conflict'};
  else {result=copy(p.rejection);if(result.kind==='syntax-error')result={...result,phase:'parse',constructorName:'SyntaxError'};
   else if(action==='parse-only'&&role==='test'&&current.legacy.rejection?.kind==='syntax-error'){result={...current.legacy.rejection,phase:'parse',constructorName:'SyntaxError'};location=current.legacy.error.loc;}}
  const ready=p.kind==='complete',finalId=ready&&role==='harness'?'u2':unitId;
  contexts.push({action,role,operation:{stage:ready?'test':role,phase,unitId:finalId,realmId:'test'},source:location?{unitId:finalId,realmId:'test',location}:null,testBodyEvaluated:ready&&action==='execute',inspection:null,completedUnits:role==='test'?[]:ready?['u0','u1']:['u0'],result});
 }
 rows.push({id,text,sha256:hash(text),sourceUnits:text.length,current,currentParseOnly,selected,futurePreparation,contexts});
}
mkdirSync(new URL('inputs/',here),{recursive:true});
for(const [name,id] of [['alpha','D3/R0'],['beta','D3/R1']])writeFileSync(new URL('inputs/'+name+'.js',here),rows.find(r=>r.id===id).text);
const raw=rows.find(r=>r.id==='D3/S21-raw').text,rawBytes=Buffer.from(raw);
assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+rawBytes.length+'\0'),rawBytes])).digest('hex'),'69dc995f6fd6a07f9a5c3c5c16d50e2c5f88537b');
assert.equal(rows.find(r=>r.id==='D3/S21').text,'"use strict";\n'+raw);
write('semantic-matrix.json',{base,claim:'Future literals; current fields are bounded existing Node build observations, never D4 execution.',hosts:['node','native'],inputs:['inputs/alpha.js','inputs/beta.js'],rows});
const inherited={D2:{},D3:{}};
for(const row of rows.filter(r=>r.selected&&r.id.includes('/'))){const [suite,id]=row.id.split('/');inherited[suite][id]={text:row.text,preparation:row.futurePreparation,contexts:row.contexts};}
write('inherited-expectations.json',inherited);
const paths=git('ls-tree','-r','--name-only',base).toString().trim().split('\n');
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p==='typescript/docs/script-strict-parameter-dispatch.md'||p.startsWith('typescript/docs/validation/ts-035d4-p/');
const protectedInventory=paths.filter(p=>!owned(p)).map(path=>({path,sha256:hash(read(path))}));
const corpus=json('typescript/fixtures/assistance/test262-starter-corpus/manifest.json');
const planned=corpus.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});
assert.equal(planned.length,60);assert(planned.every(x=>x.blockers.length));
const sourcePaths=['src/parser.ts','src/script-declarations.ts','src/script-execution-internal.ts','src/script-observation.ts','src/script-observation-types.ts','src/script-observation-json.ts','tools/test262/script-driver-result.mjs','tools/test262/script-result.mjs','src/script-prologue.ts','src/lexer.ts','src/outcomes.ts'];
const sources=sourcePaths.map(p=>({path:'typescript/'+p,sha256:hash(read('typescript/'+p))}));
const artifacts=readdirSync(new URL('typescript/build/node/src/',root),{recursive:true}).filter(p=>p.endsWith('.js')).map(p=>({path:'typescript/build/node/src/'+p.replaceAll('\\','/'),sha256:hash(read('typescript/build/node/src/'+p))}));
write('audit.json',{base,node:process.version,claim:'No build, native execution, guest body, full suite or network. Current parse-only/test probes only.',inherited:{recordsPerHost:212,staticGates:66,rerun:false},sources,artifacts,protectedInventory,planned});
console.log(JSON.stringify({rows:rows.length,changedD2:Object.keys(inherited.D2),changedD3:Object.keys(inherited.D3),protected:protectedInventory.length,blocked:planned.length}));
