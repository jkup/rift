import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const own=resolve('docs/validation/ts-035e2c-p'),run=resolve(process.argv[2]);assert(run.startsWith(own+'\\run-'));
const read=p=>JSON.parse(readFileSync(p));
const manifest=read(join(own,'proposal-manifest.json'));
const proposal=manifest.find(p=>p.path==='docs/validation/ts-035e2b/support.mjs');
const path=join(run,'isolated',proposal.path);mkdirSync(dirname(path),{recursive:true});
writeFileSync(path,readFileSync(proposal.proposed,'utf8')+'\nexport {migrate};\n');
const api=await import(pathToFileURL(path));
let count=0;
for(const file of ['design-selections.json','supplemental-literals.json']){
 const original=read('docs/validation/ts-035e2b-p/'+file),next=api.read(file);
 for(let i=0;i<original.rows.length;i++){
  const a=structuredClone(original.rows[i]),b=structuredClone(next.rows[i]);
  const prior=a.selection.policy,p=b.selection.policy;
  assert.equal(p.id,'rift-script-blocked-v4');assert.equal(p.files.length,242);
  assert.equal(p.closureSha256,createHash('sha256').update(JSON.stringify(p.files)).digest('hex'));
  assert.deepEqual(p,read(join(run,'actual-selections.json'))[b.selection.lane].policy);
  for(const name of ['script-plan.mjs','script-ledger.mjs']){
   const label='tools/test262/'+name;assert.equal(p.files.find(f=>f.path===label).sha256,manifest.find(m=>m.path===label).proposedSha256);
  }
  const keep=p.files.filter(f=>!f.path.endsWith('/script-plan.mjs')&&!f.path.endsWith('/script-ledger.mjs'));
  assert.deepEqual(keep,prior.files.filter(f=>!f.path.endsWith('/script-plan.mjs')&&!f.path.endsWith('/script-ledger.mjs')));
  b.selection.policy=a.selection.policy;assert.deepEqual(a,b);count++;
 }
}
const base=read('docs/validation/ts-035e2b-p/design-selections.json').rows[0].selection;
let negatives=0;
for(const edit of [s=>s.policy.id='rift-script-blocked-v4',s=>s.policy.files.pop(),s=>s.policy.closureSha256='0'.repeat(64),s=>s.policy.files.find(f=>f.path.endsWith('/script-plan.mjs')).sha256='0'.repeat(64)]){
 const value=structuredClone(base);edit(value);assert.throws(()=>api.migrate(value));negatives++;
}
writeFileSync(join(run,'migration-checks.json'),JSON.stringify({completeSelections:count,negativeControls:negatives,unchangedEntriesPerSelection:240,noObservedSelectionInput:true},null,2)+'\n');
console.log(JSON.stringify({completeSelections:count,negativeControls:negatives}));
