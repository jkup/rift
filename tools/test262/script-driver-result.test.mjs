import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScriptDriverResult as parse } from './script-driver-result.mjs';
import { parseDriverResult as oldParse } from './driver-result.mjs';
import { serialized, copy, mutations, rebind, harnessRow } from '../../docs/validation/ts-035a/controls.mjs';
const rows=serialized();
const encode=x=>Buffer.from(JSON.stringify(x));
test('T01 both runtime inputs/lane bytes match literal ASCII and all valid closed arms',()=>{
 for(const r of rows) { assert.deepEqual(parse(r.bytes,r.binding),r.child,r.id); assert.throws(()=>oldParse(r.bytes,{nonce:r.binding.nonce,mode:'body-observation',unit:'test/synthetic.js'})); }
});
test('T02 every required nested key and unknown field fails closed, both lanes',()=>{
 for(const r of rows) for(const [name,v] of mutations(r.child)) assert.throws(()=>parse(encode(v),r.binding),r.id+'/'+name);
});
test('T02 UTF8, size, duplicate-equivalent keys, versions, missing/concatenated JSON',()=>{
 for(const r of rows.filter(r=>r.id.endsWith('/normal'))) {
  for(const bytes of [Buffer.from('{}'),r.bytes.subarray(0,-1),Buffer.concat([r.bytes,r.bytes]),Buffer.from([0xc0,0xaf]),Buffer.alloc(65537,32),
    Buffer.from(r.bytes.toString().replace('"nonce":','"nonce":"extra","nonce":')),
    Buffer.from(r.bytes.toString().replace('"nonce":','"\\u006eonce":"extra","nonce":'))]) assert.throws(()=>parse(bytes,r.binding));
  for(const driverVersion of [1,3,NaN,2.5,-1]) assert.throws(()=>parse(encode({...r.child,driverVersion}),r.binding));
 }
});
test('B01 binding exact shape, sources, canonical hashes, variant and limits',()=>{
 for(const r of rows.filter(r=>r.id.endsWith('/normal'))) {
  for(const [name,b] of mutations(r.binding)) assert.throws(()=>parse(r.bytes,b),name);
  for(const edit of [b=>b.nonce='stale',b=>b.requestSha256='b'.repeat(64),b=>b.mode='script-observation',b=>b.variant='non-strict',b=>b.variant='module',
   b=>b.units[0].ordinal=1,b=>b.units[0].sourceUnits++,b=>b.sources[0].transformedText='changed',b=>b.sources[0].unitId='unknown',b=>b.sources.push(b.sources[0]),
   b=>b.realms[1].profile='legacy',b=>b.realms[1].id='test',b=>b.preflightId='forged',b=>b.limits.steps++,b=>b.limits.parseDepth=127]) {
   const b=copy(r.binding);edit(b);assert.throws(()=>parse(r.bytes,b));
  }
  for(const key of Object.keys(r.binding.limits)) for(const bad of [-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1]) {
   const b=copy(r.binding);b.limits[key]=bad;assert.throws(()=>parse(r.bytes,b));
  }
  const strict=copy(r.binding); strict.variant='non-strict';rebind(strict);
  assert.notEqual(strict.requestSha256,r.binding.requestSha256);
  assert.throws(()=>parse(encode({...r.child,requestSha256:strict.requestSha256}),strict));
  strict.preflightId='preflight';rebind(strict);
  assert.doesNotThrow(()=>parse(encode({...r.child,requestSha256:strict.requestSha256,preflightId:'preflight',harnessValidated:true}),strict));
 }
});
test('T03 operation/phase/source/Realm/preflight/entry and constructor mutations',()=>{
 for(const r of rows) {
  for(const edit of [v=>v.nonce='other',v=>v.requestSha256='c'.repeat(64),v=>v.mode='script-observation',v=>v.operation.unitId='u1',v=>v.operation.realmId='unknown',
   v=>v.operation.stage='harness',v=>v.preflightId='forged',v=>v.harnessValidated=true,v=>v.testBodyEvaluated=!v.testBodyEvaluated,v=>v.completedUnits=['u0']]) {
   const v=copy(r.child);edit(v);assert.throws(()=>parse(encode(v),r.binding),r.id);
  }
  if(r.child.source) for(const loc of [{line:99,column:1},{line:1,column:5},{line:2,column:8},{line:0,column:1},{line:1,column:1.5}]) {
   const v=copy(r.child);v.source.location=loc;if(v.result.kind==='throw')v.result.original.site=copy(v.source);
   assert.throws(()=>parse(encode(v),r.binding),r.id);
  }
  if(r.child.result.kind==='throw') {
   const v=copy(r.child);v.result.constructor={outcome:'available',name:'ReferenceError',realmId:null,secondary:null};assert.throws(()=>parse(encode(v),r.binding));
   v.result.constructor.realmId='unknown';assert.throws(()=>parse(encode(v),r.binding));
   v.result.constructor.realmId='test';v.result.original.valueKind='string';assert.throws(()=>parse(encode(v),r.binding));
  }
 }
});
test('U01/U02 wrong capability arm, phase, inspection and constructor; resource bounds',()=>{
 for(const r of rows) {
  if(r.child.result.kind==='unsupported-operation') for(const edit of [v=>v.result.phase='parse',v=>v.result.capabilityCode='parse.unexpected',v=>v.result.kind='unsupported-syntax',v=>v.result.constructor={},v=>v.source.unitId='missing']) {
   const v=copy(r.child);edit(v);assert.throws(()=>parse(encode(v),r.binding));
  }
  if(r.child.inspection) {
   const b=copy(r.binding);b.action='parse-only';rebind(b);const v=copy(r.child);v.requestSha256=b.requestSha256;assert.throws(()=>parse(encode(v),b));
  }
  if(r.child.result.kind==='resource-limit') for(const key of ['count','limit']) for(const value of [-1,NaN,1.5,Number.MAX_SAFE_INTEGER+1]) {
   const v=copy(r.child);v.result[key]=value;assert.throws(()=>parse(encode(v),r.binding));
  }
 }
});
test('D01 diagnostic allowed only nonempty at nonnormal Result, all arms both lanes',()=>{
 for(const r of rows) {
  for(const diagnostic of [null,'',1,{},[]]) assert.throws(()=>parse(encode({...r.child,result:{...r.child.result,diagnostic}}),r.binding));
  assert.throws(()=>parse(encode({...r.child,diagnostic:'TypeError: text only'}),r.binding));
  if(r.child.result.kind==='normal') assert.throws(()=>parse(encode({...r.child,result:{kind:'normal',diagnostic:'text'}}),r.binding));
 }
});
test('B01 ordered repeated harness occurrences, failing/current prefix, raw restrictions',()=>{
 for(const base of rows.filter(r=>r.id.endsWith('/normal'))) {
  const r=harnessRow(base);assert.deepEqual(parse(encode(r.child),r.binding),r.child);
  for(const prefix of [[],['u0','u2','u1'],['u0','u1'],['u0','u1','u1'],['u0','u1','u2','u3']]) assert.throws(()=>parse(encode({...r.child,completedUnits:prefix}),r.binding));
  const b=copy(r.binding);b.sources.reverse();assert.throws(()=>parse(encode(r.child),b));
  b.sources=copy(r.binding.sources);b.variant='raw';rebind(b);assert.throws(()=>parse(encode({...r.child,requestSha256:b.requestSha256}),b));
  const c=copy(r.child);c.operation={stage:'harness',phase:'body',unitId:'u1',realmId:'test'};c.testBodyEvaluated=false;c.completedUnits=['u0','u1'];assert.doesNotThrow(()=>parse(encode(c),r.binding));
  c.result={kind:'unsupported-operation',phase:'runtime',capabilityCode:'runtime.map-species'};c.source={unitId:'u0',realmId:'other',location:{line:1,column:1}};c.completedUnits=['u0'];assert.doesNotThrow(()=>parse(encode(c),r.binding));
  c.source.unitId='u2';assert.throws(()=>parse(encode(c),r.binding));
 }
});
