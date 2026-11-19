import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,read=f=>readFileSync(here+'/'+f,'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
const manifest=JSON.parse(read('proposed-source.json')),controls=JSON.parse(read('proposed-source-controls.json'));
const production=readFileSync(manifest.productionPath,'utf8');
assert.equal(sha(production),manifest.originalSha256);assert.equal(manifest.applied,false);assert.equal(manifest.edits.length,5);
let rendered=production;
for(const edit of manifest.edits){assert.equal(rendered.split(edit.before).length,2);rendered=rendered.replace(edit.before,edit.after);}
assert.equal(rendered,read('proposed-source.ts.txt'));assert.equal(sha(rendered),manifest.proposedSha256);
assert.deepEqual(controls.rows.map(r=>r.id.slice(0,3)),['P01','P02','P03','P04','P05','P06','P07','P08','P09']);
for(const id of ['P03','P04']) {
 const row=controls.rows.find(r=>r.id.startsWith(id));
 assert.equal(row.secondary.column,(row.getterSource??row.entrySource).indexOf('throw marker')+1);
}
const setup=controls.rows.find(r=>r.id.startsWith('P08'));
assert.deepEqual(setup.secondaryColumns,[setup.getterSource.indexOf('function')+1,setup.getterSource.indexOf('throw')+1,setup.getterSource.indexOf('marker')+1,setup.getterSource.indexOf('throw')+1]);
assert.ok(!manifest.edits[1].after.includes('realm: anchor'));
assert.ok(manifest.edits[4].after.includes('this.#inspectionSource = null;'));
assert.ok(manifest.edits[4].after.includes('finally'));
writeFileSync(here+'/proposal-audit.json',JSON.stringify({productionUnchanged:true,exactPrivateEdits:5,literalRows:9,sourceCoordinatesVerified:true,originalSha256:manifest.originalSha256,proposedSha256:manifest.proposedSha256,executedProposal:false},null,2)+'\n');
console.log('PASS exact private proposal reproduction, nine literal rows, coordinates, production unchanged');
