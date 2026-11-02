import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
const here=import.meta.dirname, root=resolve(here,'../../../..'), old=resolve(here,'..');
for(const lane of ['node','native']){
 const before=JSON.parse(readFileSync(join(old,'metadata-'+lane+'.json')));
 const after=JSON.parse(readFileSync(join(here,'metadata-'+lane+'.json')));
 assert.equal(before.length,136);assert.equal(after.length,136);
 for(let i=0;i<before.length;i++){
  assert.equal(after[i].id,before[i].id);
  assert.deepEqual(JSON.parse(after[i].stdout),JSON.parse(before[i].stdout),lane+' '+before[i].id+' entire metadata/parse/audit record');
 }
}
const changes=execFileSync('git',['diff','--name-only','61220eb'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const oldEvidenceChanges=changes.filter(x=>x.startsWith('typescript/docs/validation/ts-033a/')&&!x.includes('/stack-fix/'));
assert.deepEqual(oldEvidenceChanges.sort(),['typescript/docs/validation/ts-033a/preserve.mjs','typescript/docs/validation/ts-033a/validate.mjs']);
writeFileSync(join(here,'audit.json'),JSON.stringify({priorCommit:'61220eb37b80547bc07a33b99b6ccdc519ff9cfe',fullMetadataRecordsUnchangedPerLane:136,baselineAndOriginalEvidenceUnchanged:true,oldEvidenceChanges},null,2)+'\n');
console.log('136 full metadata/parse/audit records identical per lane; original baseline/cases/evidence unchanged. Only output-directory options added to the two prior validation scripts.');
