import { readFixtureFileSync as readFileSync } from "../../../../tools/test262/test-support/fixture-files.mjs";
// Run ONLY after separately reviewed D2 implementation. Expected to fail on the
// current return-only allowlist. Pure host codec controls, no guest execution.
import assert from 'node:assert/strict';

import {parseScriptDriverResult} from '../../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope,assertScriptContext,inspectScriptEnvelope} from '../../../../tools/test262/script-result.mjs';
import {parseDriverResult} from '../../../../tools/test262/driver-result.mjs';
import {parseEnvelope} from '../../../../tools/test262/result.mjs';
const matrix=JSON.parse(readFileSync(new URL('wire-matrix.json',import.meta.url))),copy=structuredClone;
const currentReturnOnly=process.argv.includes('--current-return-controls');
const rows=matrix.rows.filter(r=>!currentReturnOnly||r.child.result.ruleCode==='return-outside-function');
function set(o,path,value){for(const k of path.slice(0,-1))o=o[k];o[path.at(-1)]=copy(value);}
function structural(v){
 const result=[];
 function visit(at,path=[]){
  if(at===null||typeof at!=='object')return;
  if(!Array.isArray(at)){
   for(const key of Object.keys(at).filter(k=>k!=='diagnostic')){const c=copy(v);let p=c;for(const k of path)p=p[k];delete p[key];result.push(c);}
   const c=copy(v);let p=c;for(const k of path)p=p[k];p.unexpected=true;result.push(c);
  }
  for(const [k,val] of Object.entries(at))visit(val,[...path,k]);
 }
 visit(v);return result;
}
let mutations=0;
for(const r of rows){
 const parseChild=x=>parseScriptDriverResult(Buffer.from(JSON.stringify(x)),r.binding),parseFull=x=>parseScriptEnvelope(JSON.stringify(x),r.binding);
 assert.deepEqual(parseScriptDriverResult(Buffer.from(r.ascii),r.binding),r.child,r.id);
 assert.deepEqual(parseFull(r.envelope),r.envelope,r.id);
 assert.deepEqual(assertScriptContext(r.envelope,r.context,r.binding),r.envelope);
 assert.throws(()=>parseDriverResult(Buffer.from(r.ascii),{nonce:r.binding.nonce,mode:'body-observation',unit:'test/synthetic.js'}));
 assert.throws(()=>parseEnvelope(JSON.stringify(r.envelope)));
 for(const m of matrix.mutations){
  const c=copy(r.child);set(c,m.childPath,m.value);
  if(m.id==='parameter-rule'||m.id==='assignment-rule'||m.id==='statement-rule')assert.deepEqual(parseChild(c),c,r.id+'/'+m.id+' reviewed D4 code');
  else assert.throws(()=>parseChild(c),r.id+'/'+m.id);mutations++;
  if(m.envelopePath){const e=copy(r.envelope);set(e,m.envelopePath,m.value);
   if(m.id==='parameter-rule'||m.id==='assignment-rule'||m.id==='statement-rule')assert.deepEqual(parseFull(e),e,r.id+'/'+m.id+' reviewed D4 code');
   else assert.throws(()=>parseFull(e),r.id+'/'+m.id);mutations++;}
 }
 for(const c of structural(r.child)){assert.throws(()=>parseChild(c));mutations++;}
 for(const e of structural(r.envelope)){assert.throws(()=>parseFull(e));mutations++;}
 for(const b of structural(r.binding)){assert.throws(()=>parseScriptDriverResult(Buffer.from(r.ascii),b));assert.throws(()=>parseScriptEnvelope(JSON.stringify(r.envelope),b));mutations+=2;}
 for(const [text,decode] of [[r.ascii,s=>parseScriptDriverResult(Buffer.from(s),r.binding)],[JSON.stringify(r.envelope),s=>parseScriptEnvelope(Buffer.from(s),r.binding)]]){
  for(const invalid of [Buffer.from([0xc0,0xaf]),Buffer.alloc(65537,32),text+text,text.replace('"ruleCode":','"ruleCode":"return-outside-function","ruleCode":'),text.replace('"ruleCode":','"\\u0072uleCode":"return-outside-function","ruleCode":')]){assert.throws(()=>decode(invalid));mutations++;}
 }
 const facts={process:{exitCode:0,signal:null,deadlineExpired:false},outputBytes:0,outputLimit:r.binding.limits.outputBytes,capCount:null,capKilled:false,crashBeforeCap:false};
 assert.deepEqual(inspectScriptEnvelope(JSON.stringify(r.envelope),r.context,facts,r.binding),r.envelope);
 for(const t of matrix.transport){const {id,expected,...patch}=t;assert.deepEqual(inspectScriptEnvelope(JSON.stringify(r.envelope),r.context,{...facts,...patch},r.binding),expected,id);}
 for(const expected of matrix.classification.filter(x=>x.stage===r.child.operation.stage)){
  const e=copy(r.envelope),context=copy(r.context);context.expectedNegative=copy(expected.negative);
  Object.assign(e.classification,{expectedNegative:copy(expected.negative),status:expected.status,reasonCode:expected.reasonCode});
  assert.deepEqual(assertScriptContext(e,context,r.binding),e,r.id+' classification');
 }
 for(const mode of ['location','rule']){
  if(currentReturnOnly&&mode==='rule')continue;
  const c=copy(r.child),e=copy(r.envelope);
  if(mode==='location'){c.source.location.column=2;e.evidence.source.location.column=2;}
  else {c.result.ruleCode=c.result.ruleCode==='return-outside-function'?'duplicate-block-lexical-function':'return-outside-function';e.observation.ruleCode=c.result.ruleCode;}
  assert.doesNotThrow(()=>parseChild(c));assert.doesNotThrow(()=>parseFull(e));
 }
}
console.log(JSON.stringify({rows:rows.length,mutations,currentReturnOnly,claim:'synthetic codec checks only; actual both-host serializer/C bytes remain a separate implementation gate'}));
