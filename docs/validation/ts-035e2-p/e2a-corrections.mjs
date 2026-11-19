// Offline design controls. No new production API, registry injection or token.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {planCorpus,REVISION} from '../../../tools/test262/input.mjs';
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url)));
const preserved=read('preservation.json');
for(const row of preserved)assert.equal(createHash('sha256').update(readFileSync(row.path)).digest('hex'),row.sha256,row.path);
for(const [name,path] of [['script-selection-ledger.md','typescript/docs/script-selection-ledger.md'],['README.md','typescript/docs/validation/ts-035e2-p/README.md'],['verify-results.json','typescript/docs/validation/ts-035e2-p/verify-results.json'],['model-results.json','typescript/docs/validation/ts-035e2-p/model-results.json']]){
 const original=execFileSync('git',['show','5e9492b:'+path]);
 assert.deepEqual(readFileSync(new URL('initial-candidate/'+name,import.meta.url)),original,name);
}
let checks=0;
for(const row of read('wrong-revision-literals.json')){
 const plan=await planCorpus(row.input);assert.deepEqual(plan,row.expectedPlan);checks++;
 assert.equal(row.pinnedRevision,REVISION);assert.equal(plan.revision,'wrong');
 // Complete outer shape, projected from actual InputError plan. Fixed context
 // is synthetic fixture data, not production closure or token authentication.
 const selection={selectionVersion:2,kind:'script-blocked-selection',runId:row.fixedContext.runId,revision:plan.revision,manifestSha256:plan.manifestSha256,lane:plan.lane,cache:false,authority:structuredClone(row.fixedContext.authority),policy:structuredClone(row.fixedContext.policy),execution:null,files:plan.files.map((f,ordinal)=>({ordinal,path:f.path,manifestId:f.id,inputError:structuredClone(f.inputError),slots:f.variants})),excludedFixtures:structuredClone(plan.excludedFixtures)};
 assert.deepEqual(selection,row.expectedSelection);checks++;
 const plannedVariants=selection.files.reduce((n,f)=>n+(f.slots?.length??0),0),unplannedInputErrors=selection.files.filter(f=>f.slots===null).length;
 assert.deepEqual({selectedFiles:selection.files.length,plannedVariants,unplannedInputErrors,completed:0,missing:plannedVariants,complete:false,passOverPlanned:null,conditionalPass:null,exitCode:2},row.expectedDenominator);checks++;
 // Arbitrary nonempty revision, including whitespace, stays requested data.
 for(const revision of [' ', 'not-a-hash', 'a'.repeat(40)]){
  const p=await planCorpus({...row.input,revision});assert.equal(p.revision,revision);assert(p.files.every(f=>f.variants===null&&f.inputError.reasonCode==='revision-mismatch'));checks++;
 }
}
// A sequence model with independent failure boundaries. No production reader
// takes these values and no WeakMap token is ever minted by this evidence.
function secondCheck(input){
 const trace=[];let published=false;
 try{
  trace.push('authority-read');
  if(input.authority==='read-error'||input.authority==='invalid-bytes')throw Error('script-plan/authority');
  trace.push('authority-compare');
  if(input.authority!=='same')throw Error('script-plan/drift');
  trace.push('closure-read');
  if(input.closure==='read-error')throw Error('script-plan/closure');
  trace.push('closure-compare');
  if(input.closure!=='same')throw Error('script-plan/drift');
  trace.push('publish');published=true;
  return {error:null,published,trace};
 }catch(error){return {error:error.message,published,trace};}
}
for(const row of read('second-check-literals.json')){
 assert.deepEqual(secondCheck(row.input),row.expected,row.id);checks++;
 if(row.expected.error){assert.equal(row.expected.published,false);assert(!row.expected.trace.includes('publish'));checks++;}
}
const result={designOnly:true,preservedFiles:preserved.length,retainedInitialFiles:4,actualWrongRevisionPlans:2,completeWrongRevisionSelections:2,secondCheckLiterals:12,checks,productionTokenPublication:false};
writeFileSync(new URL('e2a-correction-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
