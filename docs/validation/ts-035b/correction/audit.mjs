import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,base=here+'/..',read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(read(base+'/proposed-source.json'));
assert.equal(hash(read('src/script-execution-internal.ts')),'a9d69ee2a0439653817aa116ad491c413d4a82f6aa4dcf1228cea3d42bba8614');
assert.equal(hash(read(here+'/previous-source.ts.txt')),manifest.originalSha256);
let rendered=read(here+'/previous-source.ts.txt').toString();
for(const edit of manifest.edits){assert.equal(rendered.split(edit.before).length,2);rendered=rendered.replace(edit.before,edit.after);}
assert.equal(rendered,read('src/script-execution-internal.ts').toString());
for(const f of ['source-review.mjs','source-review.json','source-review.md','proposed-source.ts.txt','proposed-source.patch','proposed-source.json','proposed-source-controls.json','proposed-source-review.md','proposal-audit.mjs','proposal-audit.json','frozen-controls.md','suite-results.json','guest-node-results.json','guest-native-results.json','probe-results.json'])assert.deepEqual(read(base+'/'+f),read(here+'/previous/'+f),f);
assert.deepEqual(read('docs/script-admission.md'),read(here+'/coordinator-admission.md.txt'));
const before=read(here+'/previous-test.ts.txt').toString(),after=read('test/script-throw-inspection.ts').toString();
assert.ok(after.startsWith(before.trimEnd()+'\n')); // original X/U checks unchanged
const prior=JSON.parse(read(here+'/previous/native-build-results.json')),now=JSON.parse(read(base+'/native-build-results.json'));
assert.deepEqual(prior.slice(0,60),now.slice(0,60));assert.equal(now[60].verdict,'PASS');
const outputs=JSON.parse(read(base+'/inspection-results.json'));assert.equal(outputs.length,2);
for(const row of outputs)for(const lane of ['node','native'])assert.ok(row[lane].stdout.includes('PASS P01-P09 positions=2 seeds=2 synthetic=56 guest=16 call=4 prefixes=16'));
writeFileSync(here+'/audit.json',JSON.stringify({approvedEdits:5,approvedProductionSha256:hash(read('src/script-execution-internal.ts')),originalWitnessAndProposalUnchanged:true,priorFullResultsPreserved:true,oldNativeGatesReused:60,coordinatorAmendmentExact:true,originalXUChecksUnchanged:true,P01P09BothHostsBothInputs:true},null,2)+'\n');
console.log('PASS exact approved amendment, preserved witness/proposal/full results, additive controls');
