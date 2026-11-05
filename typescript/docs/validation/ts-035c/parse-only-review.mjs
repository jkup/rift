import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {Realm} from '../../../build/node/src/realm.js';
import {GuestObject,normal} from '../../../build/node/src/runtime.js';
import {prepareBoundedScript} from '../../../build/node/src/script-record.js';
import {createScriptSession,evaluateScript} from '../../../build/node/src/script-execution.js';
import {evaluateScriptObserved} from '../../../build/node/src/script-throw-inspection.js';
import {scriptObservationJSONRecord} from '../../../build/node/src/script-observation-json.js';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope} from '../../../tools/test262/script-result.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const blob=x=>createHash('sha1').update(`blob ${Buffer.byteLength(x)}\0`).update(x).digest('hex');
const texts=[readFileSync('test/fixtures/harness-bundle/assert.js','utf8'),readFileSync('test/fixtures/harness-bundle/sta.js','utf8'),'throw target;','"use strict"; missing;'];
const paths=['harness/assert.js','harness/sta.js','harness/fault.js','test/control.js'];
const units=texts.map((text,n)=>({id:'u'+n,ordinal:n,role:n===3?'test':'harness',path:paths[n],blob:blob(text),sourceSha256:hash(text),transformedSha256:hash(text),byteLength:Buffer.byteLength(text),sourceUnits:text.length}));
const realm=new Realm(()=>{throw Error('output');},'script');
const session=createScriptSession({maxSteps:100000,maxCalls:64});
function prepare(n){const p=prepareBoundedScript({id:'u'+n,text:texts[n]},realm);assert.equal(p.kind,'ready');return p.record;}
for(let n=0;n<2;n++)assert.equal(evaluateScript(session,prepare(n)).completion.type,'normal');
const before=session.inspect().steps;
const target=new GuestObject(); let getterEntered=false;
const getter=realm.createBuiltin('constructor',0,(_r,_a,context,loc)=>{getterEntered=true;while(true){const tick=context.tick(loc);if(tick.type==='throw')return tick;}});
target.bootstrapDefine('constructor',{get:{kind:'object',object:getter},configurable:true});
realm.defineScriptGlobal('target',{value:{kind:'object',object:target},writable:true,configurable:true});
const record=prepare(2),observed=evaluateScriptObserved(session,record);
assert.equal(observed.evaluation.phase,'body');assert.equal(observed.evaluation.completion.type,'throw');
assert.equal(observed.evaluation.completion.origin.kind,'guest');assert.equal(observed.evaluation.completion.value.object,target);
assert.equal(observed.inspection.kind,'resource-limit');assert.equal(observed.inspection.completion.origin.guardCode,'steps');
assert.equal(getterEntered,true);assert.equal(session.inspect().active,null);assert.equal(session.inspect().calls,0);assert.equal(session.inspect().depth,0);
assert.equal(session.inspect().steps,100001);assert.equal(session.inspect().lastAbrupt.record,record);
function site(s){assert.equal(s.record,record);assert.equal(s.realm,realm);assert.equal(s.unitId,'u2');return {unitId:s.unitId,realmId:'test',location:s.loc};}
const original={valueKind:'object',origin:'guest',site:site(observed.source)};
const operation={stage:'harness',phase:'body',unitId:'u2',realmId:'test'};
const limits={sourceUnits:100000,parseDepth:128,steps:100000,calls:64,evaluationDepth:256,wallMs:10000,outputBytes:1048576};
const results=[];
for(const action of ['execute','parse-only']) {
 const request={requestVersion:2,nonce:'review',mode:'script-observation',variant:'strict',units,realms:[{id:'test',profile:'script'}],limits,preflightId:'verified-prior-controls',action};
 const requestSha256=hash(JSON.stringify(request));
 const binding={nonce:request.nonce,requestSha256,mode:request.mode,variant:request.variant,units,realms:request.realms,preflightId:request.preflightId,action,limits,sources:texts.map((transformedText,n)=>({unitId:'u'+n,transformedText}))};
 const origin=observed.inspection.completion.origin;
 const child={driverVersion:2,nonce:'review',requestSha256,mode:'script-observation',operation,source:site(observed.inspection.source),testBodyEvaluated:false,harnessValidated:true,preflightId:request.preflightId,completedUnits:['u0','u1'],inspection:{original,operation},result:{kind:'resource-limit',guardCode:origin.guardCode,count:origin.count,limit:origin.limit}};
 const identity={schemaVersion:2,runId:'review',mode:'script-observation',corpusRevision:'91c70759363c46557b694792bf34a2551a7af5ba',manifestSha256:hash('control'),path:units[3].path,blob:units[3].blob,sourceSha256:units[3].sourceSha256,variant:'strict',goal:'Script',lane:'node',engineCommit:'e66876d'+ '0'.repeat(33),engineBuildSha256:hash('control-build'),adapterSha256:hash('control-adapter'),policySha256:hash('control-policy'),dirtySourceSha256:null};
 const inputs={units,transformedSourceSha256:units[3].transformedSha256,profileId:'script-control',capabilityLedgerSha256:null,host:process.version,platform:process.platform+'/'+process.arch,toolchain:'scriptc-0.4.7/typescript-7.0.2',limits,requestSha256,preflightId:request.preflightId,realms:request.realms,ruleRegistrySha256:null};
 const envelope={identity,inputs,evidence:{stage:'harness',operation,source:child.source,testBodyEvaluated:false,harnessValidated:true,preflightId:request.preflightId,completedUnits:['u0','u1'],inspection:child.inspection,process:{exitCode:0,signal:null,deadlineExpired:false},stdoutSha256:hash(''),stderrSha256:hash(''),elapsedMs:1},observation:child.result};
 let childAccepted=true,envelopeAccepted=true;
 try{parseScriptDriverResult(Buffer.from(scriptObservationJSONRecord(child)),binding);}catch{childAccepted=false;}
 try{parseScriptEnvelope(JSON.stringify(envelope),binding);}catch{envelopeAccepted=false;}
 assert.equal(childAccepted,action==='execute');assert.equal(envelopeAccepted,action==='execute');
 results.push({action,childAccepted,envelopeAccepted,binding,child,envelope});
}
writeFileSync('docs/validation/ts-035c/parse-only-review.json',JSON.stringify({base:'e66876d',actualEngine:true,unchangedPinnedHarnessPrefix:true,getterEntered,stepsBefore:before,stepsAfter:session.inspect().steps,originalRetained:true,testPrepared:false,testInstantiated:false,testBodyEntered:false,results},null,2)+'\n');
console.log('CONFIRMED actual harness inspection step-limit: execute accepted; parse-only rejected by BOTH unchanged decoders. Test not prepared or entered.');
