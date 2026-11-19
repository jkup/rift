import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope,composeScriptEnvelope} from '../../../tools/test262/script-result.mjs';
const here=fileURLToPath(new URL('./',import.meta.url)),out=mkdtempSync(resolve(here,'supplement-')),read=n=>JSON.parse(readFileSync(resolve(here,n))),save=(n,v)=>writeFileSync(resolve(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const rows=read('future-wire-literals.json'),retained=read('retained-codec-literals.json').rows;
for(const r of rows){assert.deepEqual(parseScriptDriverResult(Buffer.from(JSON.stringify(r.expected)),r.binding),r.expected);assert.deepEqual(parseScriptEnvelope(JSON.stringify(r.envelope),r.binding),r.envelope);if(r.request.mode==='conformance'){const d=structuredClone(r.envelope);delete d.classification;assert.deepEqual(composeScriptEnvelope(JSON.stringify(d),r.context,r.binding),r.envelope);}}
const negatives=[];
for(const r of retained.filter(r=>r.id.startsWith('alpha/'))){
 for(const [id,change] of [
  ['nonce',c=>c.nonce='foreign'],['hash',c=>c.requestSha256='f'.repeat(64)],['mode',c=>c.mode='script-observation'],
  ['operation-realm',c=>c.operation.realmId='unknown'],['operation-unit',c=>c.operation.unitId='u999'],['body',c=>c.testBodyEvaluated=!c.testBodyEvaluated],['preflight',c=>c.preflightId='forged'],['completed',c=>c.completedUnits=['u999']],
  ['classification',c=>c.classification={status:'pass'}]]){
  const child=structuredClone(r.child);change(child);assert.throws(()=>parseScriptDriverResult(Buffer.from(JSON.stringify(child)),r.binding));negatives.push({id:r.id+'/'+id,bytes:JSON.stringify(child),binding:r.binding,expected:'protocol'});
 }
}
const r=retained[0],valid=JSON.stringify(r.child),bytes=[];
for(const [id,b] of [['duplicate',Buffer.from(valid.replace('{','{"nonce":"duplicate",'))],['invalid-utf8',Buffer.from([0xff])],['truncated',Buffer.from(valid.slice(0,-1))],['oversize',Buffer.from(' '.repeat(65537))],['json-array',Buffer.from('[]')],['json-null',Buffer.from('null')],['trailing',Buffer.from(valid+' false')]]){
 assert.throws(()=>parseScriptDriverResult(b,r.binding));bytes.push({id,base64:b.toString('base64'),binding:r.binding,expected:'protocol'});
}
save('value-neighbors.json',negatives);save('wire-byte-negatives.json',bytes);
save('summary.json',{completeFutureWire:rows.length,valueNeighbors:negatives.length,byteNegatives:bytes.length,guestExecutions:0,authorityClaims:0});
console.log(JSON.stringify({out,completeFutureWire:rows.length,valueNeighbors:negatives.length,byteNegatives:bytes.length}));
