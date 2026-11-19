import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {parseScriptProducerArguments,validateScriptProducerRequest} from '../../../build/node/src/script-producer-request.js';
import {prepareScriptSelection,inspectScriptSelection} from '../../../tools/test262/script-plan.mjs';
import * as ledger from '../../../tools/test262/script-ledger.mjs';
import {frozenManifest,REVISION} from '../../../tools/test262/input.mjs';
const here=import.meta.dirname,read=n=>JSON.parse(readFileSync(here+'/../ts-035e3b-p/'+n));
const future=read('future-producer-literals.json');let positives=0;
for(const r of future.filter(r=>r.request.mode==='conformance')){
 assert.deepEqual(parseScriptProducerArguments(r.argv),{request:{...r.request,units:r.request.units.map(u=>({...u,text:''}))},resultPath:'RESULT',sourcePaths:r.request.units.map(u=>'SOURCE-'+u.id)});
 validateScriptProducerRequest(r.request);positives++;
}
const shapes=read('run-URuHAc/request-shapes.json');
for(const r of shapes)assert.throws(()=>validateScriptProducerRequest(r.candidate),{message:r.error});
assert.equal(positives,20);assert.equal(shapes.length,21);
const {manifest}=await frozenManifest(),actual=[];
for(const lane of ['node','native']){
 const token=await prepareScriptSelection({root:'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',revision:REVISION,lane,paths:manifest.entries.map(e=>e.path)}),selection=inspectScriptSelection(token);
 const owner=ledger.newScriptLedger(token),slots=selection.files.flatMap(f=>f.slots??[]);
 assert.equal(selection.policy.files.length,242);assert.equal(selection.authority.entries.length,0);assert.equal(slots.length,60);assert(slots.every(s=>s.admission==='blocked'));
 for(const s of slots)ledger.appendScriptPolicy(owner,s.id);
 const final=ledger.reportScriptLedger(owner);assert.equal(final.counts['unsupported-feature'],19);assert.equal(final.counts['unsupported-profile'],41);assert.equal(final.completed,60);assert.equal(final.executedVariants,0);assert.equal(final.testBodyEvaluatedVariants,0);
 actual.push({lane,selection,history:ledger.inspectScriptLedger(owner),final});
}
writeFileSync(here+'/data-controls.json',JSON.stringify({positives,shapeNegatives:shapes.length,actual},null,2)+'\n',{flag:'wx'});
console.log('PASS actual built request module: 20 parser positives, 21 shape negatives; both lanes 60 blocked, 19 feature/41 profile, empty registry');
