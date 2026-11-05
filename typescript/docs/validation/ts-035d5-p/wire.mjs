// Actual current serializer on typed-shape fixtures; never numeric producer proof.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {scriptObservationJSONRecord} from '../../../build/node/src/script-observation-json.js';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope,assertScriptContext,inspectScriptEnvelope} from '../../../tools/test262/script-result.mjs';
import {parseDriverResult} from '../../../tools/test262/driver-result.mjs';
import {parseEnvelope} from '../../../tools/test262/result.mjs';
const here=new URL('./',import.meta.url),copy=structuredClone,hash=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(readFileSync(new URL('../ts-035d4-p/wire-matrix.json',import.meta.url)));
const matrix=JSON.parse(readFileSync(new URL('semantic-matrix.json',here)));
const rows=copy(old.rows);
for(const oldRow of old.rows.filter(r=>r.child.result.ruleCode==='duplicate-block-lexical-function')){
 const r=copy(oldRow),b=r.binding,c=r.child,e=r.envelope;
 const input=r.id.split('/')[1],source=matrix.rows.find(x=>x.id===(input==='alpha'?'R0':'R1'));
 const sourceId=c.operation.unitId,index=b.units.findIndex(u=>u.id===sourceId),u=b.units[index],text=source.text;
 Object.assign(u,{sourceSha256:hash(text),transformedSha256:hash(text),byteLength:Buffer.byteLength(text),sourceUnits:text.length});
 b.sources.find(u=>u.unitId===sourceId).transformedText=text;
 b.requestSha256=hash(JSON.stringify({requestVersion:2,nonce:b.nonce,mode:b.mode,variant:b.variant,units:b.units,realms:b.realms,limits:b.limits,preflightId:b.preflightId,action:b.action}));
 c.requestSha256=b.requestSha256;c.result.ruleCode='assignment-target';c.source.location=copy(source.expected.candidates[0].target.loc);
 e.identity.sourceSha256=b.units.at(-1).sourceSha256;e.inputs.units=copy(b.units);e.inputs.transformedSourceSha256=b.units.at(-1).transformedSha256;e.inputs.requestSha256=b.requestSha256;
 e.observation=copy(c.result);e.evidence.source=copy(c.source);r.context.identity=copy(e.identity);r.context.inputs=copy(e.inputs);
 r.id=r.id.replace('duplicate-block-lexical-function','assignment-target');r.productionEmission=true;rows.push(r);
}
for(const r of rows){r.ascii=scriptObservationJSONRecord(r.child);assert.deepEqual(JSON.parse(r.ascii),r.child);assert.match(r.ascii,/^[\x20-\x7e]*\n?$/);}
const mutations=old.mutations.filter(m=>m.id!=='assignment-rule');
const future=process.argv.includes('--future');let accepted=0,unimplemented=0,rejections=0;
function set(o,path,v){for(const k of path.slice(0,-1))o=o[k];o[path.at(-1)]=copy(v);}
function structural(v){const result=[];function visit(at,path=[]){if(at===null||typeof at!=='object')return;if(!Array.isArray(at)){
 for(const k of Object.keys(at).filter(k=>k!=='diagnostic')){const c=copy(v);let p=c;for(const x of path)p=p[x];delete p[k];result.push(c);}
 const c=copy(v);let p=c;for(const x of path)p=p[x];p.unexpected=true;result.push(c);}
 for(const [k,x] of Object.entries(at))visit(x,[...path,k]);}visit(v);return result;}
for(const r of rows){
 const decodeChild=c=>parseScriptDriverResult(Buffer.from(JSON.stringify(c)),r.binding),decodeEnvelope=e=>parseScriptEnvelope(JSON.stringify(e),r.binding);
 const parameter=r.child.result.ruleCode==='assignment-target';
 if(parameter&&!future){assert.throws(()=>parseScriptDriverResult(Buffer.from(r.ascii),r.binding));assert.throws(()=>decodeEnvelope(r.envelope));unimplemented++;}
 else {assert.deepEqual(parseScriptDriverResult(Buffer.from(r.ascii),r.binding),r.child);assert.deepEqual(decodeEnvelope(r.envelope),r.envelope);assert.deepEqual(assertScriptContext(r.envelope,r.context,r.binding),r.envelope);accepted++;}
 const child=copy(r.child),envelope=copy(r.envelope);
 if(parameter&&!future){child.result.ruleCode='duplicate-block-lexical-function';envelope.observation.ruleCode='duplicate-block-lexical-function';}
 assert.deepEqual(decodeChild(child),child);assert.deepEqual(decodeEnvelope(envelope),envelope);
 for(const m of mutations){const c=copy(child);set(c,m.childPath,m.value);assert.throws(()=>decodeChild(c),r.id+'/'+m.id);rejections++;
  if(m.envelopePath){const e=copy(envelope);set(e,m.envelopePath,m.value);assert.throws(()=>decodeEnvelope(e),r.id+'/'+m.id);rejections++;}}
 for(const c of structural(child)){assert.throws(()=>decodeChild(c));rejections++;}
 for(const e of structural(envelope)){assert.throws(()=>decodeEnvelope(e));rejections++;}
 for(const b of structural(r.binding)){assert.throws(()=>parseScriptDriverResult(Buffer.from(JSON.stringify(child)),b));assert.throws(()=>parseScriptEnvelope(JSON.stringify(envelope),b));rejections+=2;}
 for(const [text,decode] of [[JSON.stringify(child),s=>parseScriptDriverResult(Buffer.from(s),r.binding)],[JSON.stringify(envelope),s=>parseScriptEnvelope(Buffer.from(s),r.binding)]])for(const bad of [Buffer.from([0xc0,0xaf]),Buffer.alloc(65537,32),text+text,text.replace('"ruleCode":','"ruleCode":"return-outside-function","ruleCode":'),text.replace('"ruleCode":','"\\u0072uleCode":"return-outside-function","ruleCode":')]){assert.throws(()=>decode(bad));rejections++;}
 assert.throws(()=>parseDriverResult(Buffer.from(r.ascii),{nonce:r.binding.nonce,mode:'body-observation',unit:'test/synthetic.js'}));assert.throws(()=>parseEnvelope(JSON.stringify(r.envelope)));
 for(const code of ['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter',...(future?['assignment-target']:[])]){const c=copy(child),e=copy(envelope);c.result.ruleCode=code;e.observation.ruleCode=code;assert.deepEqual(decodeChild(c),c);assert.deepEqual(decodeEnvelope(e),e);}
 const facts={process:{exitCode:0,signal:null,deadlineExpired:false},outputBytes:0,outputLimit:r.binding.limits.outputBytes,capCount:null,capKilled:false,crashBeforeCap:false};
 for(const t of old.transport){const {id,expected,...patch}=t;assert.deepEqual(inspectScriptEnvelope(JSON.stringify(r.envelope),r.context,{...facts,...patch},r.binding),expected,id);}
 for(const expected of old.classification.filter(x=>x.stage===child.operation.stage)){const e=copy(envelope),context=copy(r.context);context.expectedNegative=copy(expected.negative);Object.assign(e.classification,{expectedNegative:copy(expected.negative),status:expected.status,reasonCode:expected.reasonCode});assert.deepEqual(assertScriptContext(e,context,r.binding),e);}
}
assert.equal(rows.length,128);
if(!future){writeFileSync(new URL('wire-matrix.json',here),JSON.stringify({claim:'Synthetic literal future controls, current Node serializer. Host labels are future obligations, not native runs.',rows,mutations,transport:old.transport,classification:old.classification,semanticOnly:[...old.semanticOnly??[],{id:'known-three-code-swap',expected:'codec accepts known code; producer oracle must reject wrong selection'}]},null,2)+'\n');
 writeFileSync(new URL('wire-audit.json',here),JSON.stringify({accepted,unimplemented,rejections,claim:'Current actual Node encoder; both current decoders. Numeric malformed controls use block-code surrogate; no modified decoder or future engine run.'},null,2)+'\n');}
console.log(JSON.stringify({rows:rows.length,accepted,unimplemented,rejections,future}));
