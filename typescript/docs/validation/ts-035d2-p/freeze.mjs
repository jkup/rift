// Design-only freeze. Reads current source/build; writes only this evidence directory.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parse,auditScriptReturns,parseDeclarationPlan,parseBoundedScriptDeclarationPlan,auditBoundedScriptBlockFunctions} from '../../../build/node/src/parser.js';
import {observeScripts} from '../../../build/node/src/script-observation.js';
import {candidates} from '../ts-035d1/expected.mjs';
import {variants,blockers} from '../../../tools/test262/input.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),here=fileURLToPath(new URL('./',import.meta.url));
const base='62a8787',hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(root+p),json=p=>JSON.parse(read(p));
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024});
const write=(name,value)=>writeFileSync(here+name,JSON.stringify(value,null,2)+'\n');
const old=json('typescript/docs/validation/ts-035d1/frozen.json');
const inputs=old.rows.map(r=>({id:r.id,text:r.text,auditKind:r.expectedKind}));
// Hand-stated expectations for current return promotion. These are not computed
// from D1 candidate absence. Null means no legacy syntax-error promotion.
const extras=[
 ['Q01','return 1;','return-outside-function'],
 ['Q02','"use strict"; return 1;','return-outside-function'],
 ['Q03','"use strict"; return 1; {function f(){} function f(){}}',null],
 ['Q04','return 1; function outer(){"use strict"; {function f(){} function f(){}}}',null],
 ['Q05','return 1; let fn=function(){"use strict"; {function f(){} function f(){}}};',null],
 ['Q06','"use strict"; return 1; try{}catch(e){function f(){} function f(){}}',null],
 ['Q07','"use strict"; return 1; {function f(){}} {function f(){}}','return-outside-function'],
 ['Q08','return 1; {function single(){}}','return-outside-function'],
 ['Q09','return 1; class C {}',null],
 ['Q10','return 1; function bad(){let x=;}',null],
 ['Q11','return 1; function f(a,a){}',null],
 ['Q12','return 1; "unterminated',null],
 ['Q13','return 1;'+' '.repeat(100001-9),null],
 ['Q14','return 1;'+'{'.repeat(128)+';'+'}'.repeat(128),null],
 ['Q15','"use strict"; {function f(){} function f(){}} function g(){return 1;}',null],
 ['Q16','"use strict"; {function f(){} function f(){} function f(){}}',null],
 ['Q17','"use strict"; {function f(){ {function g(){} function g(){}} } function f(){}}',null],
 ['Q18','"use strict"; {function f(){} function f(){} var f;}',null],
 ['Q19','"use strict"; {function f(){} function f(){}} function g(a){let a;}',null],
 ['Q20','function a(){"use strict"; {function f(){} function f(){}}} {function g(){}}',null],
 ['Q21','"use strict"; {function f(){} function f(){}} try{}catch(e){{var e;}}',null],
 ['Q22','"use strict"; {function f(){} function f(){}} switch(0){case 0:function g(){} function g(){}}',null],
 ['Q23','"use strict"; 7;',null],
 ['Q24','return 1; {let x; let x;}',null],
 ['Q25','"use strict"; return 1; function f(){delete x;}',null],
 ['Q26','return 1; var x;',null],
 ['Q27','"use strict"; return 1; function f(a){let a;}',null],
 ['Q28','"use strict"; {function f(){} function f(){}} return 1; class C {}',null],
];
for(const [id,text,returnRule] of extras)inputs.push({id,text,returnRule});
const copy=structuredClone,rows=[],observations=[];
for(const input of inputs){
 const {id,text}=input,unit={id,text},p=parse(text),returns=auditScriptReturns(text),bounded=parseBoundedScriptDeclarationPlan(unit),audit=auditBoundedScriptBlockFunctions(text);
 const ordinary={legacy:{error:p.error,rejection:p.rejection},returns,declaration:parseDeclarationPlan(unit),bounded};
 const previous=old.rows.find(r=>r.id===id);
 if(previous)assert.deepEqual(ordinary,previous.ordinary,'unchanged ordinary '+id);
 if(input.auditKind)assert.equal(audit.kind,input.auditKind,id);
 if(candidates[id])assert.deepEqual(audit.candidates,candidates[id],id+' independent D1 sites');
 const rule=p.rejection?.kind==='syntax-error'?p.rejection.ruleCode:null;
 if(Object.hasOwn(input,'returnRule'))assert.equal(rule,input.returnRule,id+' hand-stated return rule');
 if(audit.kind==='eligible')assert.notEqual(returns.kind,'complete',id+' exclusion');
 if(id==='Q16')assert.deepEqual(audit.candidates.map(c=>[c.first.start,c.second.start]),[[24,39],[24,54]]);
 if(id==='Q17')assert.deepEqual(audit.candidates.map(c=>[c.first.start,c.second.start]),[[39,54],[24,72]]);
 let futurePreparation=copy(bounded);
 if(audit.kind==='eligible'){
  const c=audit.candidates[0];assert.equal(bounded.kind,'conflict');
  futurePreparation={kind:'blocked',goal:'Script',unit,rejection:{kind:'syntax-error',ruleCode:'duplicate-block-lexical-function'},diagnostic:{phase:'parse',name:'SyntaxError',message:'duplicate block lexical function: '+c.second.name,loc:copy(c.second.loc)}};
 }
 // Existing C probe is parse-only/test: no guest bodies, even on ready sources.
 const currentC=observeScripts({nonce:'design',requestSha256:'a'.repeat(64),action:'parse-only',preflightId:null,steps:100,calls:64,units:[{id:'u0',role:'test',text}]});
 observations.push({id,legacy:ordinary.legacy,returns,boundedKind:bounded.kind,audit,currentParseOnly:currentC});
 const contexts=[];
 for(const action of ['parse-only','execute'])for(const role of ['test','harness']){
  const unitId=role==='test'?'u0':'u1',completedUnits=role==='test'?[]:['u0'];
  // Harness row has u0='0;' completed, u1=source, u2='7;' test.
  let result,location,phase='parse';
  if(futurePreparation.kind==='complete'){
   result={kind:'normal'};location=null;
   if(action==='execute'||role==='harness')phase='body';
  }else if(futurePreparation.kind==='conflict'){
   result={kind:'unsupported-syntax',capabilityCode:'script.uncertified-conflict'};location=copy(futurePreparation.diagnostic.loc);
  }else{
   result=copy(futurePreparation.rejection);location=copy(futurePreparation.diagnostic.loc);
   if(result.kind==='syntax-error')result={kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:result.ruleCode};
   else if(action==='parse-only'&&role==='test'&&rule==='return-outside-function'){
    result={kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:rule};location=copy(p.error.loc);
   }
  }
  const successHarness=role==='harness'&&result.kind==='normal';
  const finalRole=successHarness?'test':role,finalUnit=successHarness?'u2':unitId;
  if(successHarness)phase=action==='parse-only'?'parse':'body';
  contexts.push({action,role,observationScope:'terminal',
   operation:{stage:finalRole,phase,unitId:finalUnit,realmId:'test'},source:location===null?null:{unitId:finalUnit,realmId:'test',location},
   testBodyEvaluated:finalRole==='test'&&phase==='body',inspection:null,
   completedUnits:role==='harness'&&result.kind==='normal'?['u0','u1']:completedUnits,result});
 }
 rows.push({id,text,sourceUnits:text.length,sha256:hash(text),ordinary,audit,futurePreparation,contexts});
}
const x06=observations.find(r=>r.id==='X06');
assert.equal(x06.currentParseOnly.result.kind,'unsupported-syntax');
assert.equal(x06.currentParseOnly.result.capabilityCode,'parse.return-context');
assert.equal(x06.legacy.rejection.capabilityCode,'parse.duplicate-binding');
assert.equal(observations.find(r=>r.id==='Q08').currentParseOnly.result.ruleCode,'return-outside-function');
mkdirSync(here+'inputs',{recursive:true});
for(const [name,id] of [['alpha','R0'],['beta','R1']])writeFileSync(here+'inputs/'+name+'.js',rows.find(r=>r.id===id).text);
write('semantic-matrix.json',{base,claims:'Future D2 preparation/projection expectations; ordinary and audit fields measured against existing Node build. No future implementation executed.',
 hosts:['node','native'],runtimeInputs:['inputs/alpha.js','inputs/beta.js'],runEachRowForBothInputs:true,
 realmControls:{profiles:['script','legacy'],distinctScriptRealms:['A','B'],legacyExpected:{kind:'profile-rejected',reason:'realm'},legacyBeforeSourceLimits:true,
 rejectedEffects:{newGlobalProperties:0,guestCalls:0,sessionStepsDelta:0,calls:0,depth:0,active:null,lastAbrupt:'same identity as before preparation'},
 actionControls:{parseOnlyReady:'no body entry',executeReady:'body entry; Q23 completion number 7'},
 sourceControls:['mutate caller unit after ready preparation: retained source unchanged','same id different text uses actual text','metadata never supplies strictness','failed preparation cannot be evaluated']},rows});

const paths=git('ls-tree','-r','--name-only',base).toString().trim().split('\n');
const oldTests=paths.filter(p=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&(/\.test\.mjs$|\.integration\.mjs$/.test(p))||p.startsWith('typescript/docs/validation/')&&p.endsWith('.mjs'));
const proposal=oldTests.map(path=>({path,encoding:'base64',bytes:read(path).toString('base64')}));
const manifest=oldTests.map(path=>{
 const bytes=read(path),baseBytes=git('show',base+':'+path);
 assert.equal(bytes.toString().replaceAll('\r\n','\n'),baseBytes.toString().replaceAll('\r\n','\n'),path+' base');
 return {path,intent:'identity: retain entire old file; supplemental D2 controls go in new files',
  gitBlob:git('rev-parse',base+':'+path).toString().trim(),baseGitSha256:hash(baseBytes),originalSha256:hash(bytes),resultSha256:hash(bytes),byteLength:bytes.length};
});
write('old-test-proposals.json',{base,entries:proposal});write('proposal-manifest.json',{base,entries:manifest});
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/docs/script-strict-rule-dispatch.md'||p.startsWith('typescript/docs/validation/ts-035d2-p/')||p==='typescript/COORDINATION.md';
assert.deepEqual(git('diff',base,'--name-only').toString().trim().split('\n').filter(p=>p&&!owned(p)),[]);
const protectedInventory=paths.filter(p=>!owned(p)).map(path=>({path,sha256:hash(read(path))}));
const corpus=json('typescript/fixtures/assistance/test262-starter-corpus/manifest.json');
const planned=corpus.entries.flatMap(e=>{const meta={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(meta).map(v=>({id:e.id,variant:v,blockers:blockers(meta,v,e.id)}));});
assert.equal(planned.length,60);assert.ok(planned.every(x=>x.blockers.length));
const sourceFiles=['src/parser.ts','src/script-declarations.ts','src/script-execution-internal.ts','src/script-observation.ts','src/script-observation-types.ts','src/script-observation-json.ts','tools/test262/script-driver-result.mjs','tools/test262/script-result.mjs'];
const sources=sourceFiles.map(p=>({path:'typescript/'+p,sha256:hash(read('typescript/'+p))}));
const build=readdirSync(root+'typescript/build/node/src',{recursive:true}).filter(p=>p.endsWith('.js')).map(p=>({path:'typescript/build/node/src/'+p.replaceAll('\\','/'),sha256:hash(read('typescript/build/node/src/'+p))}));
write('audit.json',{base,head:git('rev-parse','HEAD').toString().trim(),node:process.version,
 claims:'Bounded existing Node-build parser and parse-only/test C probes. No build, native, guest-body, full-suite or upstream engine execution.',
 sources,build,observations,inherited:{guestRecordsEachHost:212,staticGates:64,source:'accepted 62a8787; not rerun'},protectedInventory,planned});
console.log(JSON.stringify({rows:rows.length,identityWholeFileProposals:manifest.length,protectedFiles:protectedInventory.length,blocked:planned.length,X06:x06.currentParseOnly.result}));
