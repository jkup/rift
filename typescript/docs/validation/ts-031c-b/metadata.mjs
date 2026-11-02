// F25/C08: actual parent transport, source-only audit, no conformance admission.
import { auditScriptReturns } from '../../../build/node/src/parser.js';
import { prepareObservation, launchObservation } from '../../../tools/test262/observe.mjs';
import { blobHash, sha256 } from '../../../tools/test262/input.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const here=fileURLToPath(new URL('.',import.meta.url));
const archiveRoot=join(here,'metadata-attempts');
await mkdir(archiveRoot);
const rows=[];
{
 for(const lane of ['node','native']) for(const mode of ['parser-observation','body-observation']) for(const negative of [null,{phase:'parse',type:'SyntaxError'},{phase:'runtime',type:'TypeError'}]){
  const sourceBytes=Buffer.from('return 1;');
  assert.deepEqual(auditScriptReturns(sourceBytes.toString('utf8')), {kind:'complete',goal:'Script',sourceUnits:9,consumedUnits:9,candidates:[{ruleCode:'return-outside-function',loc:{line:1,column:1},start:0,end:6}]});
  const variant={id:'C08-'+lane,path:'test/synthetic.js',lane,variant:'non-strict',goal:'Script',blob:blobHash(sourceBytes),sourceSha256:sha256(sourceBytes),transformedSourceSha256:sha256(sourceBytes),metadata:{negative},harness:[],blockers:[{status:'unsupported-profile',reasonCode:'synthetic-profile'}]};
  const plan=await prepareObservation({selection:{revision:'b'.repeat(40),manifestSha256:'a'.repeat(64),files:[{path:variant.path,inputError:null,variants:[variant]}]},variantId:variant.id,sourceBytes,mode,archiveRoot});
  const result=await launchObservation(plan);
  assert.equal(result.state,'complete');
  assert.deepEqual(result.record.observation,{kind:'syntax-error',phase:'parse',constructorName:'SyntaxError',ruleCode:'return-outside-function',diagnostic:'return outside function'});
  assert.deepEqual(result.record.evidence.location,{line:1,column:1});
  assert.deepEqual(result.record.inputs.harness,[]);
  assert.equal(result.record.evidence.bodyEvaluated,false);
  assert.equal(result.record.evidence.harnessValidated,false);
  assert.equal(Object.hasOwn(result.record,'classification'),false);
  rows.push({lane,mode,negative,record:result.record});
 }
 for(const row of rows) assert.deepEqual(row.record.observation,rows[0].record.observation);
 await writeFile(join(here,'metadata-results.json'),JSON.stringify(rows,null,2)+'\n');
 console.log('C08: 12 actual parent/child observations unchanged across null, parse/SyntaxError, runtime/TypeError metadata.');
}
