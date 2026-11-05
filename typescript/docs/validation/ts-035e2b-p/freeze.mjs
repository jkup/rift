import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve,dirname} from 'node:path';
const own='docs/validation/ts-035e2b-p', hash=x=>createHash('sha256').update(x).digest('hex'),read=p=>fs.readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
const save=(p,x)=>{fs.mkdirSync(dirname(p),{recursive:true});fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n');};
const replace=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,b);};
const planPath='tools/test262/script-plan.mjs',testPath='tools/test262/script-plan.test.mjs',supportPath='docs/validation/ts-035e2a/support.mjs';
assert(!fs.existsSync(own+'/freeze-record.json'),'one-time freeze; never overwrite accepted literals');
const old=read(planPath),needle="'tools/test262/script-capabilities.json', 'tools/test262/script-plan.mjs',",added=needle+"\n    'tools/test262/script-ledger.mjs',";
const plan=replace(replace(old,needle,added),"id: 'rift-script-blocked-v2'","id: 'rift-script-blocked-v3'");
const helper=`
// E2b: preserve historical expectations; transform only the exact closure delta.
async function ledgerPolicyLiteral(selection) {
  const value=structuredClone(selection), policy=value.policy;
  assert.equal(policy.id,'rift-script-blocked-v2');
  assert.equal(policy.files.length,241);
  assert.equal(policy.closureSha256,sha256(JSON.stringify(policy.files)));
  assert.equal(policy.files.filter(f=>f.path==='tools/test262/script-plan.mjs').length,1);
  assert.equal(policy.files.find(f=>f.path==='tools/test262/script-plan.mjs').sha256,'${hash(old)}');
  assert(!policy.files.some(f=>f.path==='tools/test262/script-ledger.mjs'));
  const planHash=sha256(await readFile('tools/test262/script-plan.mjs'));
  assert.equal(planHash,'${hash(plan)}');
  policy.files.find(f=>f.path==='tools/test262/script-plan.mjs').sha256=planHash;
  policy.files.push({path:'tools/test262/script-ledger.mjs',sha256:sha256(await readFile('tools/test262/script-ledger.mjs'))});
  policy.files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  assert.equal(policy.files.length,242);
  policy.id='rift-script-blocked-v3';
  policy.closureSha256=sha256(JSON.stringify(policy.files));
  return value;
}
`;
let test=replace(read(testPath),'async function cleanup(root) {',helper+'\nasync function cleanup(root) {');
test=replace(test,"const literals = await json(resolve(evidence,'selection-literals.json'));","const literals = await Promise.all((await json(resolve(evidence,'selection-literals.json'))).map(async row=>({...row,selection:await ledgerPolicyLiteral(row.selection)})));");
test=replace(test,"const expected=await json(resolve(evidence,'input-literals.json'));","const expected=await Promise.all((await json(resolve(evidence,'input-literals.json'))).map(ledgerPolicyLiteral));");
const support=replace(read(supportPath),needle,added),proposals=[];
for(const [path,value] of [[planPath,plan],[testPath,test],[supportPath,support]]){const prefix=own+'/proposals/'+path;save(prefix+'.original',read(path));save(prefix+'.proposed',value);proposals.push({path,originalSha256:hash(read(path)),proposedSha256:hash(value),original:prefix+'.original',proposed:prefix+'.proposed'});}
save(own+'/proposal-manifest.json',proposals);
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8',cwd:'..'}).split('\0').filter(Boolean);
const preserved=tracked.filter(p=>!['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/script-policy-ledger.md'].includes(p)&&!p.startsWith('typescript/docs/validation/ts-035e2b-p/')).map(path=>({path,sha256:hash(fs.readFileSync(resolve('..',path)))}));save(own+'/preservation.json',preserved);
const actual=json('docs/validation/ts-035e2a/selection-literals.json').filter(r=>r.revision.length===40);assert.equal(actual.length,2);save(own+'/actual-selection-literals.json',actual);
const marker=hash('E2b-P synthetic ledger byte marker; NOT PRODUCTION CODE');
function upgrade(s){s=structuredClone(s);s.policy.id='rift-script-blocked-v3';s.policy.files.find(f=>f.path===planPath).sha256=hash(plan);s.policy.files.push({path:'tools/test262/script-ledger.mjs',sha256:marker});s.policy.files.sort((a,b)=>a.path<b.path?-1:1);s.policy.closureSha256=hash(JSON.stringify(s.policy.files));return s;}
const selections=[...actual.map(r=>({id:r.lane,selection:upgrade(r.selection)})),...json('docs/validation/ts-035e2a/input-literals.json').map((s,i)=>({id:'input-'+i,selection:upgrade(s)}))];save(own+'/design-selections.json',{syntheticClosureMarker:marker,productionAuthority:false,rows:selections});
const statuses=['pass','fail','unsupported-feature','unsupported-profile','harness-error','resource-limit','timeout','host-fault'];
function terminal(f,s){return {kind:'policy',stage:f.inputError?'input':'preflight',status:f.inputError?.status??s.debts[0].status,reasonCode:f.inputError?.reasonCode??s.debts[0].reasonCode,executed:false,testBodyEvaluated:false};}
function oracle(selection,attempts){const all=selection.files.flatMap(f=>f.slots??[]),first=new Map();for(const a of attempts)if(!first.has(a.slotId))first.set(a.slotId,a);const counts=Object.fromEntries(statuses.map(s=>[s,[...first.values()].filter(a=>a.terminal.status===s).length]));const unplannedInputErrors=selection.files.filter(f=>f.slots===null).length,completed=first.size,complete=unplannedInputErrors===0&&completed===all.length;return {lane:selection.lane,selectedFiles:selection.files.length,plannedVariants:all.length,executedVariants:0,testBodyEvaluatedVariants:0,unplannedInputErrors,completed,missing:all.length-completed,attempts:attempts.length,counts,passedFiles:0,files:selection.files.map(f=>({path:f.path,manifestId:f.manifestId,statuses:f.slots===null?null:f.slots.map(s=>({slotId:s.id,variant:s.variant,status:first.get(s.id)?.terminal.status??null})),inputError:f.inputError,passed:false})),excludedFixtures:[],complete,passOverPlanned:complete?{numerator:0,denominator:all.length}:null,conditionalPass:null,exitCode:complete?1:2};}
const reports=[];
for(const row of selections){const s=row.selection,slots=s.files.flatMap(f=>f.slots??[]),attempts=[];const emit=kind=>reports.push({id:row.id+'-'+kind,selectionId:row.id,attempts:structuredClone(attempts),expected:oracle(s,attempts)});const append=(slot,reason=null)=>attempts.push({sequence:attempts.length+1,slotId:slot.id,attempt:attempts.filter(a=>a.slotId===slot.id).length+1,retryReason:reason,terminal:terminal(s.files[slot.fileOrdinal],slot)});emit('initial');if(slots.length){append(slots.at(-1));if(slots.length>1)append(slots[0]);append(slots.at(-1),'  investigate original reason\t');emit('partial-retry');for(const slot of slots)if(!attempts.some(a=>a.slotId===slot.id))append(slot);emit('final-retry');}attempts.length=0;for(const slot of slots)append(slot);emit('final');}
save(own+'/report-literals.json',reports);save(own+'/freeze-record.json',{base:'cbdf4fc8d99ece3672414267e3c155e86172ec72',preserved:preserved.length,proposals:proposals.length,reports:reports.length,selections:selections.length,designOnly:true,syntheticClosureMarker:marker});console.log(JSON.stringify({preserved:preserved.length,proposals:proposals.length,reports:reports.length}));
