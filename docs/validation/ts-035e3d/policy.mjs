import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const here=import.meta.dirname,{sandbox}=JSON.parse(readFileSync(join(here,'run-location.json')));
const {prepareScriptSelection,inspectScriptSelection}=await import(pathToFileURL(join(sandbox,'tools/test262/script-plan.mjs')));
const ledger=await import(pathToFileURL(join(sandbox,'tools/test262/script-ledger.mjs')));
const {frozenManifest,REVISION}=await import(pathToFileURL(join(sandbox,'tools/test262/input.mjs')));
const {manifest}=await frozenManifest(),actual=[];
for(const lane of ['node','native']){
 const token=await prepareScriptSelection({root:'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',revision:REVISION,lane,paths:manifest.entries.map(e=>e.path)}),selection=inspectScriptSelection(token);
 const owner=ledger.newScriptLedger(token),slots=selection.files.flatMap(f=>f.slots??[]);
 assert.equal(selection.policy.files.length,242);assert.equal(selection.authority.entries.length,0);assert.equal(slots.length,60);assert(slots.every(s=>s.admission==='blocked'));
 for(const s of slots)ledger.appendScriptPolicy(owner,s.id);
 const final=ledger.reportScriptLedger(owner);assert.equal(final.counts['unsupported-feature'],19);assert.equal(final.counts['unsupported-profile'],41);assert.equal(final.completed,60);assert.equal(final.executedVariants,0);assert.equal(final.testBodyEvaluatedVariants,0);
 actual.push({lane,selection,history:ledger.inspectScriptLedger(owner),final});
}
writeFileSync(join(here,'policy-results.json'),JSON.stringify(actual,null,2)+'\n',{flag:'wx'});
console.log('PASS both actual policy lanes: empty registry, 60 blocked, 19 feature/41 profile, 0 executed/0 body entries');
