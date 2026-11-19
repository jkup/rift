import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Realm} from '../../../build/node/src/realm.js';
import {prepareBoundedScript} from '../../../build/node/src/script-record.js';
import {observeScripts} from '../../../build/node/src/script-observation.js';
import {auditBoundedScriptNumericAssignments,parseBoundedScriptPreparation} from '../../../build/node/src/parser.js';
const here=new URL('./',import.meta.url),copy=structuredClone,hash=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(readFileSync(new URL('../ts-035d5-p/future-controls.json',here))),matrix=JSON.parse(readFileSync(new URL('semantic-matrix.json',here)));
const nodes=()=>({source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()});
const obligation={...copy(old),claim:'Future both-host requirements; occurrence-probe.mjs checks actual current Node requests. Numeric sources remain rejected; only harmless prefixes and the ready reference control execute.',modes:['script-observation','conformance']};
obligation.prefixes=old.prefixes.map(p=>({units:p.units.map((u,i)=>({...u,id:'u'+i})),completed:p.units.map((_u,i)=>'u'+i)}));
obligation.failedOccurrence={idByPrefixLength:['u0','u1','u2'],path:'harness/repeated.js',text:'42=7;',joinsPrefix:false,laterTest:'throw 19;',laterTestEvaluated:false,laterTestIdByPrefixLength:['u1','u2','u3'],idPolicy:'failed occurrence uN where N=prefix.length; if harness, append final test u(N+1)'};
obligation.invariants={...obligation.invariants,D5ordinaryAndPreparation:'Six ordinary results and retained nodes unchanged; preparation equals frozen futurePreparation, exact fourth migration',oldStaticGates:68};
obligation.rejectedEffects.lastAbrupt='same record and Realm identities, same unitId/loc values; inspect allocates a detached snapshot';
obligation.historySeeds=[null,{id:'history',text:'let sentinel = 41; throw 3;',preserve:['saved seed completion/value separately','history record identity','history Realm identity','unitId and location values']}];
const profileRows=[];
for(const profile of ['legacy','script'])for(const realmId of ['A','B'])for(const text of ['42=7;','x'.repeat(100001)]){
 const realm=new Realm((_line)=>{throw new Error('offline preparation effect');},profile);
 const current=prepareBoundedScript({id:'profile',text},realm),expected=copy(current);
 if(profile==='script'&&text==='42=7;')Object.assign(expected,{rejection:{kind:'syntax-error',ruleCode:'assignment-target'},diagnostic:{phase:'parse',name:'SyntaxError',message:'invalid numeric assignment target',loc:{line:1,column:1}}});
 if(profile==='legacy')assert.deepEqual(current,{kind:'profile-rejected',reason:'realm'});
 profileRows.push({profile,realmId,text,current,expected});
}
const prefixRows=[];
for(const input of ['R0','R1'])for(const action of old.actions)for(const role of old.roles)for(const prefix of obligation.prefixes){
 const row=matrix.rows.find(r=>r.id===input),units=prefix.units.map(u=>({...u,role:'harness'})),failedId='u'+units.length;
 units.push({id:failedId,path:'harness/repeated.js',role,text:row.text});if(role==='harness')units.push({id:'u'+units.length,path:'test/later.js',role:'test',text:'throw 19;'});
 const request={nonce:'D6-prefix',requestSha256:'a'.repeat(64),action,preflightId:'preflight',steps:10000,calls:64,units:units.map(({id,role,text})=>({id,role,text}))};
 const expected={driverVersion:2,nonce:'D6-prefix',requestSha256:'a'.repeat(64),mode:'script-observation',operation:{stage:role,phase:'parse',unitId:failedId,realmId:'test'},source:{unitId:failedId,realmId:'test',location:copy(row.audit.candidates[0].target.loc)},testBodyEvaluated:false,harnessValidated:true,preflightId:'preflight',completedUnits:copy(prefix.completed),inspection:null,result:{kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:'assignment-target'}};
 const current=copy(row.contexts.find(c=>c.action===action&&c.role===role).current);
 current.nonce=request.nonce;current.preflightId=request.preflightId;current.harnessValidated=true;current.operation.unitId=failedId;current.source.unitId=failedId;current.completedUnits=copy(prefix.completed);
 prefixRows.push({input,action,role,units,request,current,expected});
}
const noEffects=[];
for(const source of [matrix.rows.find(r=>r.id==='R0').text,matrix.rows.find(r=>r.id==='R1').text,'var touched=0; function touch(){ touched+=1; print(9); return 7; } 42=touch();'])for(const realm of ['A','B'])for(const history of ['empty','seeded']){
 const unit={id:'same',text:source},audit=auditBoundedScriptNumericAssignments(source);assert.equal(audit.kind,'eligible');
 const preparation={kind:'blocked',goal:'Script',unit,rejection:{kind:'syntax-error',ruleCode:'assignment-target'},diagnostic:{phase:'parse',name:'SyntaxError',message:'invalid numeric assignment target',loc:copy(audit.candidates[0].target.loc)}};
 noEffects.push({realm,history,source,seed:history==='seeded'?{id:'history',text:'let sentinel = 41; throw 3;'}:null,expectedPreparation:preparation,expected:{stepsDelta:0,callsDelta:0,depthDelta:0,prints:0,guestCalls:0,instantiations:0,bodyEntries:0,active:null,globalOwnKeys:'deepEqual(before.keys)',globalDescriptors:'same keys and descriptor payload identities',sentinelBinding:'same presence and value',history:history==='empty'?null:{savedSeedCompletion:'unchanged externally retained evaluation.completion identity',savedSeedValue:{kind:'number',value:3},recordIdentity:'before.lastAbrupt.record === seed.record',realmIdentity:'before.lastAbrupt.realm === realm',unitId:'history',location:{line:1,column:20},snapshotObjectIdentity:'not compared; inspect returns fresh copies'}}});
}
const metadataRows=[];
for(const variant of ['raw','non-strict','strict'])for(const negative of old.sourceAuthority.expectedNegative)for(const text of ['42=7;','"use strict";\n42=7;','42=7;class C{}','let x; x=7; x;']){
 const unit={id:'same',text},original=parseBoundedScriptPreparation(unit,nodes()),audit=auditBoundedScriptNumericAssignments(text),expected=copy(original);
 if(original.kind==='blocked'&&original.rejection.kind==='unsupported-syntax'&&original.rejection.capabilityCode==='parse.assignment-target'&&audit.kind==='eligible')Object.assign(expected,{rejection:{kind:'syntax-error',ruleCode:'assignment-target'},diagnostic:{phase:'parse',name:'SyntaxError',message:'invalid numeric assignment target',loc:copy(audit.candidates[0].target.loc)}});
 metadataRows.push({variant,negative,unit,expected,callerMutation:{id:'changed',text:'throw 19;'},sourceAfterMutation:copy(unit)});
}
const oracleMutations=[];
for(const r of matrix.rows)for(const context of r.contexts){
 if(r.audit.kind!=='eligible')continue;
 for(const code of ['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter']){const wrong=copy(context.expected);wrong.result.ruleCode=code;assert.notDeepEqual(wrong,context.expected);oracleMutations.push({id:r.id+'/'+context.action+'/'+context.role+'/'+code,expected:context.expected,wrong,producerOracle:'reject full child inequality',codec:'known rule may be structurally valid'});}
 const wrong=copy(context.expected);wrong.source.location.column++;assert.notDeepEqual(wrong,context.expected);oracleMutations.push({id:r.id+'/'+context.action+'/'+context.role+'/wrong-location',expected:context.expected,wrong,producerOracle:'reject full child inequality',codec:'location validity alone cannot establish selected target'});
}
const limits={sourceUnits:{fixed:100000,rows:matrix.rows.filter(r=>r.text.length>=100000).map(r=>({id:r.id,text:r.text,expected:r.futurePreparation}))},parseDepth:{fixed:128,rows:matrix.rows.filter(r=>/depth/i.test(r.id)).map(r=>({id:r.id,text:r.text,expected:r.futurePreparation}))},steps:{values:[0,1,10000],expectation:'numeric rejection before execution, no step consumption'},calls:{values:[0,1,64],expectation:'numeric rejection before execution, no calls'},evaluationDepth:{fixed:256,expectation:'no evaluator entry'},wallMs:{values:[0,1000],expectation:'parent deadline wins child bytes'},outputBytes:{values:[0,65536,65537],expectation:'parent output cap wins child bytes; fixed codec max 65536'}};
const budgetRows=[];
for(const input of ['R0','R1'])for(const action of old.actions)for(const role of old.roles)for(const steps of [0,1,10000])for(const calls of [0,1,64]){
 const row=matrix.rows.find(r=>r.id===input),c=row.contexts.find(c=>c.action===action&&c.role===role),request=copy(c.request);request.steps=steps;request.calls=calls;const current=observeScripts(request);assert.deepEqual(current,c.current);budgetRows.push({input,request,current,expected:copy(c.expected)});
}
const readyRows=old.actions.map(action=>({request:{nonce:'ready',requestSha256:'a'.repeat(64),action,preflightId:null,steps:10000,calls:64,units:[{id:'u0',role:'test',text:'let x; x=7; x;'}]},expected:{driverVersion:2,nonce:'ready',requestSha256:'a'.repeat(64),mode:'script-observation',operation:{stage:'test',phase:action==='execute'?'body':'parse',unitId:'u0',realmId:'test'},source:null,testBodyEvaluated:action==='execute',harnessValidated:false,preflightId:null,completedUnits:[],inspection:null,result:{kind:'normal'}},hostCompletion:action==='execute'?{phase:'body',completion:{type:'normal',value:{kind:'number',value:7}}}:null}));
writeFileSync(new URL('future-controls.json',here),JSON.stringify({obligation,profileRows,prefixRows,noEffects,metadataRows,limits,budgetRows,readyRows,oracleMutations},null,2)+'\n');
writeFileSync(new URL('control-audit.json',here),JSON.stringify({claim:'Current rejected-source/profile probes and literal construction; occurrence-probe separately validates harmless prefixes/ready control. No invalid numeric guest body or native execution.',profiles:profileRows.length,prefixLiterals:prefixRows.length,noEffectsLiterals:noEffects.length,metadataLiterals:metadataRows.length,producerOracleMutations:oracleMutations.length,sourceInputs:['alpha','beta'].map(n=>({file:'inputs/'+n+'.js',sha256:hash(readFileSync(new URL('inputs/'+n+'.js',here)))}))},null,2)+'\n');
console.log(JSON.stringify({profiles:profileRows.length,prefixes:prefixRows.length,noEffects:noEffects.length,metadata:metadataRows.length,oracle:oracleMutations.length,depthRows:limits.parseDepth.rows.length}));
