import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseScriptDriverResult} from './script-driver-result.mjs';
import {parseScriptEnvelope} from './script-result.mjs';
const original=JSON.parse(readFileSync(new URL('../../docs/validation/ts-035c/parse-only-review.json',import.meta.url))).results.find(r=>r.action==='parse-only');
const copy=()=>structuredClone(original);
function rebind(r){const b=r.binding;b.requestSha256=createHash('sha256').update(JSON.stringify({requestVersion:2,nonce:b.nonce,mode:b.mode,variant:b.variant,units:b.units,realms:b.realms,limits:b.limits,preflightId:b.preflightId,action:b.action})).digest('hex');r.child.requestSha256=b.requestSha256;r.envelope.inputs.requestSha256=b.requestSha256;}
function sync(r){const c=r.child;r.envelope.observation=c.result;for(const k of ['operation','source','testBodyEvaluated','harnessValidated','preflightId','completedUnits','inspection'])r.envelope.evidence[k]=c[k];r.envelope.evidence.stage=c.operation.stage;}
function accept(r){sync(r);assert.deepEqual(parseScriptDriverResult(Buffer.from(JSON.stringify(r.child)),r.binding),r.child);assert.deepEqual(parseScriptEnvelope(JSON.stringify(r.envelope),r.binding),r.envelope);}
function reject(r){sync(r);assert.throws(()=>parseScriptDriverResult(Buffer.from(JSON.stringify(r.child)),r.binding));assert.throws(()=>parseScriptEnvelope(JSON.stringify(r.envelope),r.binding));}
test('approved closure: parse-only harness secondary steps/calls/unsupported retain original',()=>{
 for(const result of [{kind:'resource-limit',guardCode:'steps',count:100001,limit:100000},{kind:'resource-limit',guardCode:'calls',count:64,limit:64},{kind:'unsupported-operation',phase:'runtime',capabilityCode:'runtime.map-species'}]){const r=copy();r.child.result=result;accept(r);}
});
test('approved closure: every forbidden neighbor remains rejected in both boundaries',()=>{
 for(const phase of ['body','instantiation']){const r=copy();r.child.operation={stage:'test',phase,unitId:'u3',realmId:'test'};r.child.inspection.operation=r.child.operation;r.child.testBodyEvaluated=phase==='body';r.child.completedUnits=['u0','u1','u2'];reject(r);}
 for(const edit of [r=>{r.child.operation.phase='parse';r.child.inspection.operation=r.child.operation;},r=>r.child.operation.stage='test',r=>r.child.inspection.operation.unitId='u1',r=>r.child.completedUnits=['u1','u0'],r=>r.child.inspection.original.valueKind='number',r=>{r.binding.variant='raw';r.envelope.identity.variant='raw';rebind(r);}]){const r=copy();edit(r);reject(r);}
});
test('approved closure: exactly the reviewed C predicates and D2/D4 closed rule additions changed from accepted base',()=>{
 const from="need(b.action==='execute' && op.phase!=='parse' && ['resource-limit','unsupported-operation'].includes(o.kind));";
 const to="need((b.action==='execute' || op.stage==='harness') && op.phase!=='parse' && ['resource-limit','unsupported-operation'].includes(o.kind));";
 const ruleFrom="ruleCode:one(['return-outside-function'])";
 const ruleTo="ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter'])";
 for(const name of ['script-driver-result.mjs','script-result.mjs']){const old=execFileSync('git',['show','e66876d:typescript/tools/test262/'+name],{encoding:'utf8'});assert.equal(old.split(from).length,2);assert.equal(old.split(ruleFrom).length,2);assert.equal(readFileSync(new URL(name,import.meta.url),'utf8').replaceAll('\r\n','\n'),old.replace(from,to).replace(ruleFrom,ruleTo).replaceAll('\r\n','\n'));}
});
