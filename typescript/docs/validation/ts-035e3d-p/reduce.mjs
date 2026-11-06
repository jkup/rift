// Offline contract reduction only: imports codecs, never an engine or launcher.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope} from '../../../tools/test262/script-result.mjs';
import {validateConformanceScriptArguments} from './producer-boundary.mts';
const here=fileURLToPath(new URL('.',import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');
const blob=x=>createHash('sha1').update('blob '+Buffer.byteLength(x)+'\0').update(x).digest('hex');
const limits={sourceUnits:100000,parseDepth:128,steps:100000,calls:64,evaluationDepth:256,wallMs:10000,outputBytes:1048576};
// Independent expected decisions; no decoder or producer generates this table.
const cases=[
 ['observation-positive','script-observation','strict','execute','test',null,true],
 ['conformance-positive-unvalidated','conformance','strict','execute','test',null,false],
 ['conformance-parse-only-unvalidated','conformance','strict','parse-only','test',null,false],
 ['conformance-nonstrict-unvalidated','conformance','non-strict','execute','test',null,false],
 ['conformance-harness-terminal','conformance','strict','execute','harness',null,true],
 ['conformance-fabricated-ID','conformance','strict','execute','test','fabricated-data-ID',true],
];
const rows=[];
for(const lane of ['node','native'])for(const [id,mode,variant,action,stage,preflightId,accepted] of cases){
 const texts=['"use strict"; 0;','"use strict";\n'];
 const units=texts.map((text,n)=>({id:'u'+n,ordinal:n,role:n===0?'harness':'test',path:n===0?'harness/control.js':'test/dummy.js',blob:blob(text),sourceSha256:hash(text),transformedSha256:hash(text),byteLength:Buffer.byteLength(text),sourceUnits:text.length}));
 const realms=[{id:'test',profile:'script'}],nonce='offline-'+id;
 const request={requestVersion:2,nonce,mode,variant,units,realms,limits,preflightId,action};
 const binding={nonce,requestSha256:hash(JSON.stringify(request)),mode,variant,units,realms,preflightId,action,limits,sources:texts.map((transformedText,n)=>({unitId:'u'+n,transformedText}))};
 const operation={stage,phase:stage==='test'&&action==='parse-only'?'parse':'body',unitId:stage==='test'?'u1':'u0',realmId:'test'};
 const child={driverVersion:2,nonce,requestSha256:binding.requestSha256,mode,operation,source:null,testBodyEvaluated:stage==='test'&&action==='execute',harnessValidated:preflightId!==null,preflightId,completedUnits:['u0'],inspection:null,result:{kind:'normal'}};
 const identity={schemaVersion:2,runId:'offline-reduction',mode,corpusRevision:'b'.repeat(40),manifestSha256:'a'.repeat(64),path:'test/dummy.js',blob:units[1].blob,sourceSha256:units[1].sourceSha256,variant,goal:'Script',lane,engineCommit:'b'.repeat(40),engineBuildSha256:'a'.repeat(64),adapterSha256:'a'.repeat(64),policySha256:'a'.repeat(64),dirtySourceSha256:null};
 const inputs={units,transformedSourceSha256:units[1].transformedSha256,profileId:'synthetic-only-not-certification',capabilityLedgerSha256:mode==='conformance'?'a'.repeat(64):null,host:'synthetic',platform:'synthetic',toolchain:'synthetic',limits,requestSha256:binding.requestSha256,preflightId,realms,ruleRegistrySha256:'a'.repeat(64)};
 const evidence={stage,operation,source:null,testBodyEvaluated:child.testBodyEvaluated,harnessValidated:child.harnessValidated,preflightId,completedUnits:['u0'],inspection:null,process:{exitCode:0,signal:null,deadlineExpired:false},stdoutSha256:hash(''),stderrSha256:hash(''),elapsedMs:0};
 const envelope={identity,inputs,evidence,observation:{kind:'normal'}};
 if(mode==='conformance')envelope.classification={status:stage==='harness'?'harness-error':'pass',reasonCode:stage==='harness'?'harness':'normal',blockers:[],expectedNegative:null,observedPhase:null,observedConstructorName:null};
 const outcomes=[];
 for(const [name,invoke,expected] of [
  ['child',()=>parseScriptDriverResult(Buffer.from(JSON.stringify(child)),binding),child],
  ['envelope',()=>parseScriptEnvelope(JSON.stringify(envelope),binding),envelope]]){
  if(accepted){assert.deepEqual(invoke(),expected,id+'/'+name);outcomes.push({decoder:name,accepted:true,fullResult:expected});}
  else{assert.throws(invoke,{message:'protocol'},id+'/'+name);outcomes.push({decoder:name,accepted:false,error:'protocol'});}
 }
 rows.push({id:lane+'/'+id,synthetic:true,request,binding,child,envelope,expectedAccepted:accepted,outcomes});
}
// No generated result is used as the expected decision on replay.
const parserRows=[
 {id:'strict-null',argv:['conformance','strict','execute','offline','a'.repeat(64),'-','RESULT','100000','128','100000','64','256','10000','1048576','u0','harness','SOURCE-0','u1','test','SOURCE-1'],error:'script-producer/variant-preflight'},
 {id:'strict-data-ID',argv:['conformance','strict','execute','offline','a'.repeat(64),'fabricated-data-ID','RESULT','100000','128','100000','64','256','10000','1048576','u0','harness','SOURCE-0','u1','test','SOURCE-1'],error:null},
 {id:'raw-null',argv:['conformance','raw','execute','offline','a'.repeat(64),'-','RESULT','100000','128','100000','64','256','10000','1048576','u0','test','SOURCE-0'],error:null},
];
for(const row of parserRows)if(row.error===null)assert.equal(validateConformanceScriptArguments(row.argv),undefined);else assert.throws(()=>validateConformanceScriptArguments(row.argv),{message:row.error});
const result={kind:'offline-protocol-reduction',engineExecutions:0,nativeExecutions:0,parserRows,rows};
if(process.argv.includes('--write'))writeFileSync(here+'reduction.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
else assert.deepEqual(result,JSON.parse(readFileSync(here+'reduction.json')));
console.log(JSON.stringify({rows:rows.length,decoderChecks:rows.length*2,engineExecutions:0,nativeExecutions:0,passed:true}));
