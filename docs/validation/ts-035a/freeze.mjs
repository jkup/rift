// Independent literal oracle. Run before implementation; never imports a codec.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
const H = 'a'.repeat(64), B = 'b'.repeat(40);
const hash = s => createHash('sha256').update(s).digest('hex');
const ascii = x => JSON.stringify(x).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4,'0')).replace(/\\u0000/g,'\\u0000');
const limits = {sourceUnits:100000,parseDepth:128,steps:100,calls:64,evaluationDepth:256,wallMs:1000,outputBytes:1024};
const site = {unitId:'u0',realmId:'test',location:{line:1,column:1}};
const original = {valueKind:'object',origin:'guest',site};
const ctor = (outcome,name=null,realmId=null,secondary=null) => ({outcome,name,realmId,secondary});
const throwResult = c => ({kind:'throw',phase:'runtime',original,constructor:c});
const specs = [
 ['normal',{kind:'normal'},'body','pass','normal',null],
 ['parse-normal',{kind:'normal'},'parse','fail','expected-parse-error',{phase:'parse',type:'SyntaxError'}],
 ['syntax',{kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:'return-outside-function'},'parse','pass','negative-match',{phase:'parse',type:'SyntaxError'}],
 ['syntax-positive',{kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:'return-outside-function'},'parse','fail','unexpected-parse-error',null],
 ['syntax-mismatch',{kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:'return-outside-function'},'parse','fail','phase-mismatch',{phase:'runtime',type:'SyntaxError'}],
 ['unsupported-syntax',{kind:'unsupported-syntax',capabilityCode:'script.uncertified-conflict'},'parse','unsupported-feature','script.uncertified-conflict',null],
 ['profile-strict',{kind:'unsupported-profile',reasonCode:'strict'},'parse','unsupported-profile','strict',null],
 ['profile-realm',{kind:'unsupported-profile',reasonCode:'realm'},'parse','unsupported-profile','realm',null],
 ['available',throwResult(ctor('available','ReferenceError','test')),'body','pass','negative-match',{phase:'runtime',type:'ReferenceError'}],
 ['other-realm',throwResult(ctor('available','ReferenceError','other')),'body','pass','negative-match',{phase:'runtime',type:'ReferenceError'}],
 ['empty-name',throwResult(ctor('available','','other')),'body','fail','type-mismatch',{phase:'runtime',type:'ReferenceError'}],
 ['instantiation',throwResult(ctor('available','ReferenceError','test')),'instantiation','pass','negative-match',{phase:'runtime',type:'ReferenceError'}],
 ['uncaught',throwResult(ctor('available','ReferenceError','test')),'body','fail','uncaught-throw',null],
 ['expected-throw',{kind:'normal'},'body','fail','expected-throw',{phase:'runtime',type:'ReferenceError'}],
 ...['absent','non-callable','non-string-name','foreign-profile','unregistered-realm','abrupt'].map(outcome=>[
   outcome,throwResult(ctor(outcome,null,outcome==='non-string-name'?'other':null,outcome==='abrupt'?{site:{...site,realmId:'other'},valueKind:'string',origin:'guest'}:null)),
   'body', ['foreign-profile','unregistered-realm'].includes(outcome)?'unsupported-feature':'fail',
   ['foreign-profile','unregistered-realm'].includes(outcome)?'constructor.'+outcome:outcome==='abrupt'?'constructor-inspection-abrupt':'type-mismatch',{phase:'runtime',type:'ReferenceError'}]),
 ...['undefined','null','boolean','number','string','symbol'].map(valueKind=>['primitive-'+valueKind,{...throwResult(ctor('absent')),original:{...original,valueKind}},'body','fail','type-mismatch',{phase:'runtime',type:'ReferenceError'}]),
 ...['runtime.object-to-number','runtime.object-to-string','runtime.map-species'].flatMap(capabilityCode=>[
   [capabilityCode,{kind:'unsupported-operation',phase:'runtime',capabilityCode},'body','unsupported-feature',capabilityCode,{phase:'runtime',type:'TypeError'}],
   ['secondary-'+capabilityCode,{kind:'unsupported-operation',phase:'runtime',capabilityCode},'body','unsupported-feature',capabilityCode,{phase:'runtime',type:'ReferenceError'},true]]),
 ...Object.entries({'source-units':'sourceUnits','parse-depth':'parseDepth',steps:'steps',calls:'calls','evaluation-depth':'evaluationDepth'}).flatMap(([guardCode,key])=>[
   [guardCode,{kind:'resource-limit',guardCode,count:limits[key]+(guardCode==='calls'?0:1),limit:limits[key]},['source-units','parse-depth'].includes(guardCode)?'parse':'body','resource-limit',guardCode,null],
   ...(['steps','calls','evaluation-depth'].includes(guardCode)?[['secondary-'+guardCode,{kind:'resource-limit',guardCode,count:limits[key]+(guardCode==='calls'?0:1),limit:limits[key]},'body','resource-limit',guardCode,null,true]]:[])]),
];
const rows=[];
for (const input of ['alpha','beta']) for (const [id,result,phase,status,reasonCode,negative,secondary] of specs) {
 for (const diagnostic of result.kind==='normal'?[false]:[false,true]) {
  const text='1;\r\nsecond\u2028last';
  const unit={id:'u0',ordinal:0,role:'test',path:'test/synthetic.js',blob:B,sourceSha256:hash(text),transformedSha256:hash(text),byteLength:Buffer.byteLength(text),sourceUnits:text.length};
  const request={requestVersion:2,nonce:input,mode:'conformance',variant:'raw',units:[unit],realms:[{id:'test',profile:'script'},{id:'other',profile:'script'}],limits,preflightId:null,action:phase==='parse'?'parse-only':'execute'};
  const binding={nonce:input,requestSha256:hash(JSON.stringify(request)),mode:request.mode,variant:request.variant,units:request.units,realms:request.realms,preflightId:null,action:request.action,limits,sources:[{unitId:'u0',transformedText:text}]};
  const operation={stage:'test',phase,unitId:'u0',realmId:'test'};
  const child={driverVersion:2,nonce:input,requestSha256:binding.requestSha256,mode:'conformance',operation,source:result.kind==='normal'?null:secondary?{...site,realmId:'other',location:{line:2,column:2}}:site,testBodyEvaluated:phase==='body',harnessValidated:false,preflightId:null,completedUnits:[],inspection:secondary?{original,operation}:null,result:diagnostic?{...result,diagnostic:'TypeError: text only '+input+'\u0000"\\\ud800'}:result};
  const identity={schemaVersion:2,runId:'synthetic-only',mode:'conformance',corpusRevision:B,manifestSha256:H,path:unit.path,blob:B,sourceSha256:unit.sourceSha256,variant:'raw',goal:'Script',lane:'node',engineCommit:B,engineBuildSha256:H,adapterSha256:H,policySha256:H,dirtySourceSha256:null};
  const inputs={units:[unit],transformedSourceSha256:unit.transformedSha256,profileId:'synthetic-only',capabilityLedgerSha256:H,host:'synthetic',platform:'synthetic',toolchain:'synthetic',limits,requestSha256:binding.requestSha256,preflightId:null,realms:request.realms,ruleRegistrySha256:H};
  const context={identity,inputs,expectedNegative:negative,blockers:[]};
  const evidence={stage:'test',operation,source:child.source,testBodyEvaluated:child.testBodyEvaluated,harnessValidated:false,preflightId:null,completedUnits:[],inspection:child.inspection,process:{exitCode:0,signal:null,deadlineExpired:false},stdoutSha256:H,stderrSha256:H,elapsedMs:1};
  const classification={status,reasonCode,blockers:[],expectedNegative:negative,observedPhase:['throw','syntax-error','unsupported-operation'].includes(result.kind)?result.phase:null,observedConstructorName:result.kind==='throw'?result.constructor.name:result.kind==='syntax-error'?'SyntaxError':null};
  rows.push({id:input+'/'+id+(diagnostic?'/diagnostic':''),binding,context,child,envelope:{identity,inputs,evidence,observation:child.result,classification},ascii:ascii(child)});
 }
}
const destination=new URL('../../../test/fixtures/script-observation-serialization/',import.meta.url);
mkdirSync(destination,{recursive:true});
writeFileSync(new URL('alpha.txt',destination),'alpha');
writeFileSync(new URL('beta.txt',destination),'beta');
writeFileSync(new URL('frozen.json',destination),JSON.stringify(rows,null,2)+'\n');
writeFileSync(new URL('frozen-sha256.txt',import.meta.url),hash(JSON.stringify(rows,null,2)+'\n')+'\n');
console.log(`${rows.length} frozen literal child/envelope/ASCII rows; no implementation imports`);
