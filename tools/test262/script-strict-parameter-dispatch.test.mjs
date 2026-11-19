import {join} from 'node:path';
import {scratchRoot} from './test-support/environment.mjs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parseScriptDriverResult} from './script-driver-result.mjs';
import {parseScriptEnvelope,assertScriptContext} from './script-result.mjs';
const matrix=JSON.parse(readFileSync('docs/validation/ts-035d4-p/wire-matrix.json'));
test('D4 real serializer bytes: both hosts, two runtime inputs, all three closed codes',()=>{
 const results=[];
 for(const row of matrix.rows){
  const [lane,input,action,role,rule,diagnostic]=row.id.split('/');
  const sourceDir=rule==='duplicate-strict-parameter'?'script-strict-parameter-dispatch':'script-strict-rule-dispatch';
  const args=['fixtures/'+sourceDir+'/'+input+'.js',input,'wire',action,role,rule,diagnostic,row.binding.requestSha256];
  const r=spawnSync(lane==='node'?process.execPath:'build/native/script-strict-parameter-dispatch.exe',lane==='node'?['build/node/test/script-strict-parameter-dispatch.js',...args]:args,{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
  results.push({id:row.id,productionEmission:row.productionEmission,status:r.status,signal:r.signal,stdout:r.stdout,stderr:r.stderr});
  writeFileSync(join(scratchRoot,'script-strict-parameter-wire-results.json'),JSON.stringify(results,null,2)+'\n');
  assert.equal(r.status,0,row.id+': '+r.stderr);assert.equal(r.signal,null);
  const bytes=r.stdout.trim();assert.ok(!/[^\x00-\x7f]/.test(bytes));
  assert.equal(bytes,row.ascii,row.id+' exact ASCII serialization');
  assert.deepEqual(JSON.parse(bytes),row.child,row.id+' literal serialized result');
  assert.deepEqual(parseScriptDriverResult(Buffer.from(bytes),row.binding),row.child,row.id+' child decoder');
  // Bind the independently decoded envelope to the actual producer's fields.
  const child=JSON.parse(bytes),envelope=structuredClone(row.envelope);
  for(const key of ['operation','source','testBodyEvaluated','harnessValidated','preflightId','completedUnits','inspection'])envelope.evidence[key]=child[key];
  envelope.observation=child.result;
  assert.deepEqual(parseScriptEnvelope(JSON.stringify(envelope),row.binding),row.envelope,row.id+' envelope decoder');
  assert.deepEqual(assertScriptContext(envelope,row.context,row.binding),row.envelope);
 }
 assert.equal(results.length,96);
});
test('D4 frozen mutations, closed schema, v1 exclusion and independent transport priority',()=>{
 const r=spawnSync(process.execPath,['docs/validation/ts-035d4-p/wire.mjs','--future'],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 writeFileSync(join(scratchRoot,'script-strict-parameter-wire-mutations.log'),r.stdout+r.stderr);assert.equal(r.status,0,r.stderr);
});

test('D4 fixed source authority across variant and expected-negative metadata on both hosts',()=>{
 const results=[];
 for(const row of matrix.rows.filter(r=>r.id.endsWith('/duplicate-strict-parameter/plain')))for(const variant of ['strict','non-strict','raw']){
  const [lane,input,action,role,rule,diagnostic]=row.id.split('/'),binding=structuredClone(row.binding);
  binding.variant=variant;
  binding.requestSha256=createHash('sha256').update(JSON.stringify({requestVersion:2,nonce:binding.nonce,mode:binding.mode,variant:binding.variant,units:binding.units,realms:binding.realms,limits:binding.limits,preflightId:binding.preflightId,action:binding.action})).digest('hex');
  const args=['fixtures/script-strict-parameter-dispatch/'+input+'.js',input,'wire',action,role,rule,diagnostic,binding.requestSha256];
  const r=spawnSync(lane==='node'?process.execPath:'build/native/script-strict-parameter-dispatch.exe',lane==='node'?['build/node/test/script-strict-parameter-dispatch.js',...args]:args,{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
  results.push({id:row.id,variant,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
  writeFileSync(join(scratchRoot,'script-strict-parameter-metadata-results.json'),JSON.stringify(results,null,2)+'\n');
  assert.equal(r.status,0,r.stderr);assert.equal(r.signal,null);
  const expected={...row.child,requestSha256:binding.requestSha256},child=JSON.parse(r.stdout);
  // Metadata cannot change producer semantics or manufacture preflight authority.
  const incompatible=(role==='test'&&variant!=='raw')||(role==='harness'&&variant==='raw');
  assert.deepEqual(child,expected);assert.equal(r.stdout.trim(),row.ascii.replace(row.binding.requestSha256,binding.requestSha256));
  for(const negative of [null,{phase:'parse',type:'SyntaxError'},{phase:'runtime',type:'TypeError'}]){
   const envelope=structuredClone(row.envelope),context=structuredClone(row.context);
   for(const object of [envelope,context]){object.identity.variant=variant;object.inputs.requestSha256=binding.requestSha256;}
   envelope.observation=child.result;context.expectedNegative=negative;
   const status=role==='harness'?'harness-error':negative?.phase==='parse'?'pass':'fail';
   const reasonCode=role==='harness'?'harness':negative===null?'unexpected-parse-error':negative.phase==='parse'?'negative-match':'phase-mismatch';
   Object.assign(envelope.classification,{expectedNegative:negative,status,reasonCode});
   if(incompatible){
    assert.throws(()=>parseScriptDriverResult(Buffer.from(r.stdout.trim()),binding));
    assert.throws(()=>parseScriptEnvelope(JSON.stringify(envelope),binding));
   }else{
    assert.deepEqual(parseScriptDriverResult(Buffer.from(r.stdout.trim()),binding),child);
    assert.deepEqual(parseScriptEnvelope(JSON.stringify(envelope),binding),envelope);
    assert.deepEqual(assertScriptContext(envelope,context,binding),envelope);
   }
  }
 }
 assert.equal(results.length,48);
});
