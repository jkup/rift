import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const root=fileURLToPath(new URL('../../../',import.meta.url));
export const rows=JSON.parse(readFileSync(new URL('../../../test/fixtures/script-observation-serialization/frozen.json',import.meta.url)));
export const copy=structuredClone;
export const hash=s=>createHash('sha256').update(s).digest('hex');
export function rebind(b) {
 b.requestSha256=hash(JSON.stringify({requestVersion:2,nonce:b.nonce,mode:b.mode,variant:b.variant,units:b.units,realms:b.realms,limits:b.limits,preflightId:b.preflightId,action:b.action}));
 return b;
}
export function serialized() {
 const result=[];
 for (const lane of ['node','native']) for (const input of ['alpha','beta']) {
  const args=lane==='node'?['build/node/test/script-observation-serialization.js']:[];
  args.push('test/fixtures/script-observation-serialization/'+input+'.txt');
  const r=spawnSync(lane==='node'?process.execPath:root+'build/native/script-observation-serialization.exe',args,{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
  assert.equal(r.status,0,r.stderr); assert.equal(r.signal,null); assert.equal(r.error,undefined);
  const expected=rows.filter(r=>r.binding.nonce===input);
  const lines=r.stdout.replace(/\r\n/g,'\n').split('\n');
  assert.equal(lines.pop(),''); assert.equal(lines.length,expected.length);
  for (let i=0;i<lines.length;i++) {
   assert.equal(lines[i],expected[i].ascii,`${lane}/${expected[i].id} exact ASCII`);
   assert.match(lines[i],/^[\x20-\x7e]+$/);
   result.push({...copy(expected[i]),lane,bytes:Buffer.from(lines[i])});
  }
 }
 return result;
}
export function envelope(child,row) {
 const v=copy(row.envelope);
 for (const k of ['operation','source','testBodyEvaluated','harnessValidated','preflightId','completedUnits','inspection']) v.evidence[k]=copy(child[k]);
 v.evidence.stage=child.operation.stage; v.observation=copy(child.result);
 return v;
}
export function mutations(x) {
 const result=[];
 function walk(value,path=[]) {
  if (!value || typeof value!=='object') return;
  if (!Array.isArray(value)) {
   for (const key of Object.keys(value).filter(k=>k!=='diagnostic')) {
    const clone=copy(x); let at=clone; for (const part of path) at=at[part]; delete at[key];
    result.push([path.join('.')+'/missing/'+key,clone]);
   }
   const clone=copy(x); let at=clone; for (const part of path) at=at[part]; at.unexpected=true;
   result.push([path.join('.')+'/unknown',clone]);
  }
  for (const [key,v] of Object.entries(value)) walk(v,[...path,key]);
 }
 walk(x); return result;
}
export function transport(row) { return {process:copy(row.envelope.evidence.process),outputBytes:0,outputLimit:row.binding.limits.outputBytes,capCount:null,capKilled:false,crashBeforeCap:false}; }
export function harnessRow(base) {
 const r=copy(base), b=r.binding;
 b.variant='non-strict'; b.preflightId='preflight';
 const test=copy(b.units[0]); test.id='u3'; test.ordinal=3;
 b.units=[0,1,2].map(ordinal=>({...copy(b.units[0]),id:'u'+ordinal,ordinal,role:'harness',path:ordinal===0?'harness/assert.js':'harness/repeated.js'})).concat(test);
 b.sources=b.units.map(u=>({unitId:u.id,transformedText:base.binding.sources[0].transformedText})); rebind(b);
 r.child.requestSha256=b.requestSha256; r.child.preflightId=b.preflightId; r.child.harnessValidated=true; r.child.completedUnits=['u0','u1','u2']; r.child.operation.unitId='u3';
 r.context.identity.variant=b.variant; r.context.inputs.units=copy(b.units); r.context.inputs.requestSha256=b.requestSha256; r.context.inputs.preflightId=b.preflightId;
 r.envelope.identity=copy(r.context.identity); r.envelope.inputs=copy(r.context.inputs); r.envelope=envelope(r.child,r);
 return r;
}
