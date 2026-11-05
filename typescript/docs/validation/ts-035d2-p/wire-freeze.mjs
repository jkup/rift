// Synthetic future rows. Validate existing structural constraints using the
// already accepted return code; never change or load a modified production file.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope,assertScriptContext,inspectScriptEnvelope} from '../../../tools/test262/script-result.mjs';
const here=new URL('./',import.meta.url),copy=structuredClone;
const hash=x=>createHash('sha256').update(x).digest('hex');
const read=p=>readFileSync(new URL(p,here),'utf8');
const fixtures=JSON.parse(read('../../../test/fixtures/script-observation-serialization/frozen.json'));
const base=fixtures.find(r=>r.id==='alpha/syntax');
function rebind(b){b.requestSha256=hash(JSON.stringify({requestVersion:2,nonce:b.nonce,mode:b.mode,variant:b.variant,units:b.units,realms:b.realms,limits:b.limits,preflightId:b.preflightId,action:b.action}));}
function ascii(v){return JSON.stringify(v).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));}
const rows=[];
for(const host of ['node','native'])for(const input of ['alpha','beta'])for(const action of ['parse-only','execute'])for(const role of ['test','harness'])for(const rule of ['return-outside-function','duplicate-block-lexical-function'])for(const diagnostic of [false,true]){
 const r=copy(base),b=r.binding,c=r.child;
 const text=rule==='return-outside-function'?'return 1;':read('inputs/'+input+'.js');
 const location=rule==='return-outside-function'?{line:1,column:1}:{line:1,column:input==='alpha'?44:60};
 b.nonce=input;b.action=action;b.variant=role==='test'?'raw':'non-strict';b.preflightId=role==='test'?null:'preflight';
 const sourceTexts=role==='test'?[text]:['0;',text,'7;'];
 b.units=sourceTexts.map((s,i)=>({id:'u'+i,ordinal:i,role:i===sourceTexts.length-1?'test':'harness',path:i===sourceTexts.length-1?'test/synthetic.js':'harness/repeated.js',blob:'b'.repeat(40),sourceSha256:hash(s),transformedSha256:hash(s),byteLength:Buffer.byteLength(s),sourceUnits:s.length}));
 b.sources=sourceTexts.map((transformedText,i)=>({unitId:'u'+i,transformedText}));rebind(b);
 const unitId=role==='test'?'u0':'u1';
 Object.assign(c,{nonce:input,requestSha256:b.requestSha256,operation:{stage:role,phase:'parse',unitId,realmId:'test'},source:{unitId,realmId:'test',location},
  harnessValidated:b.preflightId!==null,preflightId:b.preflightId,completedUnits:role==='test'?[]:['u0'],
  result:{kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:rule}});
 if(diagnostic)c.result.diagnostic='TypeError: diagnostic only '+input+'\0"\\\ud800';
 const e=r.envelope;
 e.identity.lane=host;e.identity.variant=b.variant;e.identity.sourceSha256=b.units.at(-1).sourceSha256;
 e.inputs.units=copy(b.units);e.inputs.transformedSourceSha256=b.units.at(-1).transformedSha256;e.inputs.requestSha256=b.requestSha256;e.inputs.preflightId=b.preflightId;
 for(const key of ['operation','source','testBodyEvaluated','harnessValidated','preflightId','completedUnits','inspection'])e.evidence[key]=copy(c[key]);
 e.evidence.stage=role;e.observation=copy(c.result);
 if(role==='harness')Object.assign(e.classification,{status:'harness-error',reasonCode:'harness'});
 r.context.identity=copy(e.identity);r.context.inputs=copy(e.inputs);
 r.id=[host,input,action,role,rule,diagnostic?'diagnostic':'plain'].join('/');r.ascii=ascii(c);
 // Codec data validity is independent of C's return emission boundary. Return
 // execute/harness rows are synthetic boundary controls, never production claims.
 r.productionEmission=rule==='duplicate-block-lexical-function'||(action==='parse-only'&&role==='test');
 const surrogate=copy(c),surrogateEnvelope=copy(e);
 surrogate.result.ruleCode='return-outside-function';surrogateEnvelope.observation.ruleCode='return-outside-function';
 assert.deepEqual(parseScriptDriverResult(Buffer.from(ascii(surrogate)),b),surrogate);
 assert.deepEqual(parseScriptEnvelope(JSON.stringify(surrogateEnvelope),b),surrogateEnvelope);
 assert.deepEqual(assertScriptContext(surrogateEnvelope,r.context,b),surrogateEnvelope);
 if(rule==='duplicate-block-lexical-function'){
  assert.throws(()=>parseScriptDriverResult(Buffer.from(r.ascii),b));
  assert.throws(()=>parseScriptEnvelope(JSON.stringify(e),b));
 }
 rows.push(r);
}
// Paths are explicit dot components. Values are literal, not parser-computed.
const edits=[
 ['unknown-rule',['result','ruleCode'],'unreviewed-rule'],
 ['parameter-rule',['result','ruleCode'],'duplicate-strict-parameter'],
 ['assignment-rule',['result','ruleCode'],'assignment-target'],
 ['statement-rule',['result','ruleCode'],'lexical-declaration-statement'],
 ['empty-rule',['result','ruleCode'],''],['null-rule',['result','ruleCode'],null],
 ['wrong-result-phase',['result','phase'],'runtime'],['wrong-constructor',['result','constructorName'],'TypeError'],
 ['body-operation',['operation','phase'],'body'],['instantiation-operation',['operation','phase'],'instantiation'],
 ['body-evaluated',['testBodyEvaluated'],true],['source-null',['source'],null],
 ['source-unit',['source','unitId'],'missing'],['source-Realm',['source','realmId'],'other'],
 ['entry-Realm',['operation','realmId'],'missing'],['entry-unit',['operation','unitId'],'missing'],
 ['out-of-range-line',['source','location','line'],999],['zero-column',['source','location','column'],0],
 ['fraction-column',['source','location','column'],1.5],['stale-request',['requestSha256'],'c'.repeat(64)],
 ['stale-nonce',['nonce'],'stale'],['extra-prefix',['completedUnits'],['u0','u1','u2']],
 ['inspection',['inspection'],{}],['bad-diagnostic',['result','diagnostic'],null],
 ['empty-diagnostic',['result','diagnostic'],''],['extra-result',['result','unexpected'],true],
 ['constructor-object',['result','constructor'],{}],['diagnostic-top',['diagnostic'],'text'],
];
const envelopePath=path=>path[0]==='result'?['observation',...path.slice(1)]:path[0]==='requestSha256'?['inputs','requestSha256']:path[0]==='nonce'?null:['evidence',...path];
function set(object,path,value){let p=object;for(const k of path.slice(0,-1))p=p[k];p[path.at(-1)]=copy(value);}
const mutations=edits.map(([id,path,value])=>({id,childPath:path,envelopePath:envelopePath(path),value,expected:'protocol rejection at both applicable boundaries'}));
let tested=0;
for(const r of rows){
 for(const m of mutations){
  const c=copy(r.child),e=copy(r.envelope);c.result.ruleCode='return-outside-function';e.observation.ruleCode='return-outside-function';
  set(c,m.childPath,m.value);assert.throws(()=>parseScriptDriverResult(Buffer.from(JSON.stringify(c)),r.binding),r.id+'/'+m.id);
  if(m.envelopePath){set(e,m.envelopePath,m.value);assert.throws(()=>parseScriptEnvelope(JSON.stringify(e),r.binding),r.id+'/'+m.id);}
  tested++;
 }
}
const structural=[];
function nested(v,path=[]){if(v===null||typeof v!=='object'||Array.isArray(v))return;for(const k of Object.keys(v)){if(k!=='diagnostic')structural.push({op:'delete',path:[...path,k]});nested(v[k],[...path,k]);}structural.push({op:'set',path:[...path,'unexpected'],value:true});}
nested(rows[0].child);
// These two deliberately pass the codec. Source semantics and exact location
// come from producer tests, never from a decoder's name/coordinate allowlist.
const semanticOnly=[{id:'known-rule-swap',edit:'swap return-outside-function and duplicate-block-lexical-function',futureCodec:'accept',producerOracle:'exact expected rule rejects wrong emission'},
 {id:'in-range-wrong-location',childPath:['source','location','column'],value:2,futureCodec:'accept',producerOracle:'exact selected binding location rejects wrong emission'}];
const transport=[
 {id:'deadline-over-child',process:{exitCode:70,signal:null,deadlineExpired:true},outputBytes:2000,capCount:1500,capKilled:true,crashBeforeCap:true,expected:{status:'timeout',reasonCode:'deadline'}},
 {id:'crash-before-cap',process:{exitCode:70,signal:null,deadlineExpired:false},outputBytes:2000,capCount:1500,capKilled:true,crashBeforeCap:true,expected:{status:'host-fault',reasonCode:'crash'}},
 {id:'cap-over-child',process:{exitCode:null,signal:'SIGTERM',deadlineExpired:false},outputBytes:2000,capCount:1500,capKilled:true,crashBeforeCap:false,expected:{status:'resource-limit',reasonCode:'output'}},
 {id:'crash-over-child',process:{exitCode:70,signal:null,deadlineExpired:false},outputBytes:0,capCount:null,capKilled:false,crashBeforeCap:false,expected:{status:'host-fault',reasonCode:'crash'}},
];
for(const r of rows)for(const t of transport){const {id,expected,...facts}=t;assert.deepEqual(inspectScriptEnvelope(JSON.stringify(r.envelope),r.context,{...facts,outputLimit:r.binding.limits.outputBytes},r.binding),expected,id);}
const result={base:'62a8787',claims:'Future exact v2 rows, not current block emission. Existing decoders reject every block row. Structural probes substitute only accepted return rule; this is not widened decoder validation.',rows,mutations,
 structuralMutations:{applyTo:'every valid row, independently at child and envelope boundaries; recurse their own required keys including binding/context',childExample:structural},
 bytes:[{id:'invalid-utf8',hex:'c0af',expected:'protocol'},{id:'too-large',length:65537,fillHex:'20',expected:'protocol'},{id:'duplicate-rule',replace:'"ruleCode":',with:'"ruleCode":"return-outside-function","ruleCode":',expected:'protocol'},{id:'escaped-duplicate-rule',replace:'"ruleCode":',with:'"\\u0072uleCode":"return-outside-function","ruleCode":',expected:'protocol'},{id:'concatenated-records',operation:'append full valid record to itself',expected:'protocol'}],
 semanticOnly,transport,
 classification:[{negative:{phase:'parse',type:'SyntaxError'},stage:'test',status:'pass',reasonCode:'negative-match'},{negative:{phase:'runtime',type:'SyntaxError'},stage:'test',status:'fail',reasonCode:'phase-mismatch'},{negative:{phase:'parse',type:'TypeError'},stage:'test',status:'fail',reasonCode:'type-mismatch'},{negative:null,stage:'test',status:'fail',reasonCode:'unexpected-parse-error'},{negative:{phase:'parse',type:'SyntaxError'},stage:'harness',status:'harness-error',reasonCode:'harness'}],
 preservation:['v1 child rejects v2 records; v1 envelope rejects schemaVersion2','same sources raw versus non-strict require distinct bound requests','preflight/profile/source and seven limits mutations remain rejected','diagnostic absent/nonempty exact ASCII roundtrip cannot alter classification']};
writeFileSync(new URL('wire-matrix.json',here),JSON.stringify(result,null,2)+'\n');
writeFileSync(new URL('wire-audit.json',here),JSON.stringify({rows:rows.length,existingBlockRejected:rows.filter(r=>r.child.result.ruleCode==='duplicate-block-lexical-function').length,surrogateMutationChecks:tested,transportChecks:rows.length*transport.length,claims:result.claims},null,2)+'\n');
console.log(JSON.stringify({rows:rows.length,surrogateMutationChecks:tested,transportChecks:rows.length*transport.length}));
