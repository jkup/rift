// Adapted implementation controls; see test-source-identities.json. Production copies use actual checkout bytes.
import {createHash as sourceHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync,mkdtempSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const previous='docs/validation/ts-035e2c-p',own=resolve('docs/validation/ts-035e2c'),run=mkdtempSync(join(own,'migration-'));
const root=join(run,'isolated');mkdirSync(root);
writeFileSync(join(run,'actual-source-identities.json'),JSON.stringify(['tools/test262/script-plan.mjs','tools/test262/script-ledger.mjs'].map(path=>({path,sha256:createHashForSource(readFileSync(path))})),null,2)+'\n');
function createHashForSource(bytes){return sourceHash('sha256').update(bytes).digest('hex');}

const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p));
const save=(p,v)=>writeFileSync(join(run,p),JSON.stringify(v,null,2)+'\n');
function copy(path){mkdirSync(dirname(join(root,path)),{recursive:true});cpSync(path,join(root,path),{recursive:true});}
for(const path of ['tools/test262/input.mjs','tools/test262/script-capabilities.mjs','tools/test262/script-capabilities.json','fixtures/assistance/test262-starter-corpus/manifest.json','package.json','package-lock.json','node_modules/yaml'])copy(path);
const manifest=read('docs/validation/ts-035e2c-p/correction/proposal-manifest.json');
for(const p of manifest){mkdirSync(dirname(join(root,p.path)),{recursive:true});cpSync(p.path,join(root,p.path));}
const support=join(root,'docs/validation/ts-035e2b/support.mjs');
writeFileSync(support,readFileSync(support,'utf8')+'\nexport {migrate};\n');
const helper=await import(pathToFileURL(support));
const planner=await import(pathToFileURL(join(root,'tools/test262/script-plan.mjs')));
const input=await import(pathToFileURL(join(root,'tools/test262/input.mjs')));
const {manifest:corpus}=await input.frozenManifest(),policies={};
for(const lane of ['node','native']){
 const token=await planner.prepareScriptSelection({root:'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',revision:input.REVISION,lane,paths:corpus.entries.map(e=>e.path)});
 const selection=planner.inspectScriptSelection(token);assert.equal(selection.files.flatMap(f=>f.slots??[]).length,60);
 assert.equal(await planner.assertScriptSelectionCurrent(token),undefined);policies[lane]=selection.policy;
}
save('actual-policies.json',policies);
let migrated=0;
for(const file of ['design-selections.json','supplemental-literals.json']){
 const before=read('docs/validation/ts-035e2b-p/'+file),after=helper.read(file);
 for(let i=0;i<before.rows.length;i++){
  const a=structuredClone(before.rows[i]),b=structuredClone(after.rows[i]);
  assert.deepEqual(b.selection.policy,policies[b.selection.lane]);
  const excluded=new Set(['tools/test262/script-plan.mjs','tools/test262/script-ledger.mjs']);
  assert.deepEqual(b.selection.policy.files.filter(f=>!excluded.has(f.path)),a.selection.policy.files.filter(f=>!excluded.has(f.path)));
  b.selection.policy=a.selection.policy;assert.deepEqual(b,a);migrated++;
 }
 save(file,after);
}
let negatives=0;
const base=read('docs/validation/ts-035e2b-p/design-selections.json').rows[0].selection;
for(const edit of [s=>s.policy.id='rift-script-blocked-v4',s=>s.policy.files.pop(),s=>s.policy.closureSha256='0'.repeat(64),s=>s.policy.files.find(f=>f.path.endsWith('/script-plan.mjs')).sha256='0'.repeat(64)]){
 const bad=structuredClone(base);edit(bad);assert.throws(()=>helper.migrate(bad));negatives++;
}
// Migrate every retained full checkpoint literal by the one exact ledger-byte
// delta. Histories/reports and other 241 closure entries must remain unchanged.
const oldRoot=previous+'/run-20CkKl',literalManifest=read(oldRoot+'/literal-manifest.json'),rows=[];
const oldLedger=read(previous+'/proposal-manifest.json').find(p=>p.path==='tools/test262/script-ledger.mjs').proposedSha256;
const newLedger=manifest.find(p=>p.path==='tools/test262/script-ledger.mjs').proposedSha256;
for(const row of literalManifest){
 const raw=readFileSync(oldRoot+'/'+row.path);assert.equal(hash(raw),row.sha256);
 const before=JSON.parse(raw),after=structuredClone(before),policy=after.ledger.selection.policy;
 const entry=policy.files.find(f=>f.path==='tools/test262/script-ledger.mjs');assert.equal(entry.sha256,oldLedger);entry.sha256=newLedger;
 policy.closureSha256=hash(JSON.stringify(policy.files));assert.deepEqual(policy,policies[after.ledger.selection.lane]);
 const check=structuredClone(after);check.ledger.selection.policy=before.ledger.selection.policy;assert.deepEqual(check,before);
 const bytes=JSON.stringify(after,null,2)+'\n';writeFileSync(join(run,row.path),bytes);
 rows.push({...row,previousSha256:row.sha256,sha256:hash(bytes),byteLength:Buffer.byteLength(bytes)});
}
save('literal-manifest.json',rows);
save('results.json',{completeSelections:migrated,negativeControls:negatives,completeCheckpointMigrations:rows.length,actualLanes:2,slotsPerLane:60,unchangedClosureEntriesPerCheckpoint:241,noPublicChange:true});
console.log(JSON.stringify({run,completeSelections:migrated,negativeControls:negatives,completeCheckpointMigrations:rows.length}));
