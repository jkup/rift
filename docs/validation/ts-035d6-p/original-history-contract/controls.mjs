import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Realm} from '../../../build/node/src/realm.js';
import {prepareBoundedScript} from '../../../build/node/src/script-record.js';
import {auditBoundedScriptNumericAssignments,parseBoundedScriptPreparation} from '../../../build/node/src/parser.js';
const here=new URL('./',import.meta.url),copy=structuredClone,hash=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(readFileSync(new URL('../ts-035d5-p/future-controls.json',here))),matrix=JSON.parse(readFileSync(new URL('semantic-matrix.json',here)));
const nodes=()=>({source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()});
const obligation={...copy(old),claim:'Future both-host driver requirements; complete literals below. Only profile preparations are current offline probes.',modes:['script-observation','conformance']};
obligation.invariants={...obligation.invariants,D5ordinaryAndPreparation:'Six ordinary results and retained nodes unchanged; preparation equals frozen futurePreparation, exact fourth migration',oldStaticGates:68};
const profileRows=[];
for(const profile of ['legacy','script'])for(const realmId of ['A','B'])for(const text of ['42=7;','x'.repeat(100001)]){
 const realm=new Realm((_line)=>{throw new Error('offline preparation effect');},profile);
 const current=prepareBoundedScript({id:'profile',text},realm),expected=copy(current);
 if(profile==='script'&&text==='42=7;')Object.assign(expected,{rejection:{kind:'syntax-error',ruleCode:'assignment-target'},diagnostic:{phase:'parse',name:'SyntaxError',message:'invalid numeric assignment target',loc:{line:1,column:1}}});
 if(profile==='legacy')assert.deepEqual(current,{kind:'profile-rejected',reason:'realm'});
 profileRows.push({profile,realmId,text,current,expected});
}
const prefixRows=[];
for(const input of ['R0','R1'])for(const action of old.actions)for(const role of old.roles)for(const prefix of old.prefixes){
 const row=matrix.rows.find(r=>r.id===input),units=prefix.units.map(u=>({...u,role:'harness'}));
 units.push({id:'bad',path:'harness/repeated.js',role,text:row.text});if(role==='harness')units.push({id:'later',path:'test/later.js',role:'test',text:'throw 19;'});
 prefixRows.push({input,action,role,units,expected:{driverVersion:2,nonce:'D6-prefix',requestSha256:'a'.repeat(64),mode:'script-observation',operation:{stage:role,phase:'parse',unitId:'bad',realmId:'test'},source:{unitId:'bad',realmId:'test',location:copy(row.audit.candidates[0].target.loc)},testBodyEvaluated:false,harnessValidated:true,preflightId:'preflight',completedUnits:copy(prefix.completed),inspection:null,result:{kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:'assignment-target'}}});
}
const noEffects=[];
for(const source of [matrix.rows.find(r=>r.id==='R0').text,matrix.rows.find(r=>r.id==='R1').text,'var touched=0; function touch(){ touched+=1; print(9); return 7; } 42=touch();'])for(const realm of ['A','B'])for(const history of ['empty','seeded']){
 const unit={id:'same',text:source},audit=auditBoundedScriptNumericAssignments(source);assert.equal(audit.kind,'eligible');
 const preparation={kind:'blocked',goal:'Script',unit,rejection:{kind:'syntax-error',ruleCode:'assignment-target'},diagnostic:{phase:'parse',name:'SyntaxError',message:'invalid numeric assignment target',loc:copy(audit.candidates[0].target.loc)}};
 noEffects.push({realm,history,source,seed:history==='seeded'?{id:'history',text:'let sentinel = 41; throw 3;'}:null,expectedPreparation:preparation,expected:{stepsDelta:0,callsDelta:0,depthDelta:0,prints:0,guestCalls:0,instantiations:0,bodyEntries:0,activeIdentity:'before.active',lastAbruptIdentity:'before.lastAbrupt',globalOwnKeys:'deepEqual(before.keys)',globalDescriptors:'same keys and descriptor payload identities',sentinelBinding:'same presence and value',history:history==='empty'?null:{completionIdentity:'before.lastAbrupt.completion',value:3,recordIdentity:'seed.record',realmIdentity:'seed.realm',locationIdentity:'before.lastAbrupt.loc'}}});
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
writeFileSync(new URL('future-controls.json',here),JSON.stringify({obligation,profileRows,prefixRows,noEffects,metadataRows,limits,oracleMutations},null,2)+'\n');
writeFileSync(new URL('control-audit.json',here),JSON.stringify({claim:'Only current offline preparation probes and literal fixture construction; no guest or native execution',profiles:profileRows.length,prefixLiterals:prefixRows.length,noEffectsLiterals:noEffects.length,metadataLiterals:metadataRows.length,producerOracleMutations:oracleMutations.length,sourceInputs:['alpha','beta'].map(n=>({file:'inputs/'+n+'.js',sha256:hash(readFileSync(new URL('inputs/'+n+'.js',here)))}))},null,2)+'\n');
console.log(JSON.stringify({profiles:profileRows.length,prefixes:prefixRows.length,noEffects:noEffects.length,metadata:metadataRows.length,oracle:oracleMutations.length,depthRows:limits.parseDepth.rows.length}));
