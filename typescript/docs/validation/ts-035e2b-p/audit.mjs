import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,cpSync,mkdirSync,mkdtempSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareScriptSelection,inspectScriptSelection} from '../../../tools/test262/script-plan.mjs';
import {newLedger,report} from '../../../tools/test262/ledger.mjs';
const own='docs/validation/ts-035e2b-p',hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(readFileSync(p)),save=(p,x)=>writeFileSync(own+'/'+p,JSON.stringify(x,null,2)+'\n');
const originals=json(own+'/actual-selection-literals.json'),results=[];
const root='C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075';
for(const row of originals){const token=await prepareScriptSelection({root,revision:row.revision,lane:row.lane,paths:row.selection.files.map(f=>f.path)}),actual=inspectScriptSelection(token);assert.deepEqual({...actual,runId:row.selection.runId},row.selection);const slots=actual.files.flatMap(f=>f.slots??[]);assert.equal(slots.length,60);assert.equal(slots.filter(s=>s.debts[0].status==='unsupported-feature').length,19);assert.equal(slots.filter(s=>s.debts[0].status==='unsupported-profile').length,41);assert.throws(()=>inspectScriptSelection(structuredClone(token)),{message:'script-plan/token'});results.push({lane:row.lane,selection:actual});}
save('actual-results.json',results);
// Record, do not silently fix, v1's lack of an outer version discriminator.
const boundaries=[];
for(const [name,value] of [['v2-selection',originals[0].selection],['empty-token',{}]]){let stage='newLedger';try{const ledger=newLedger(value);stage='report';report(ledger);boundaries.push({name,accepted:true,stage});}catch(e){boundaries.push({name,accepted:false,stage,errorName:e.name,message:e.message});}}
save('v1-boundary-results.json',boundaries);
// Exercise the exact proposed planner in an isolated copy. The ledger marker
// has no API and is only a hash input: this is not an E2b implementation probe.
const box=mkdtempSync(resolve(own,'closure-probe-'));
for(const path of ['tools/test262/input.mjs','tools/test262/script-capabilities.mjs','tools/test262/script-capabilities.json','fixtures/assistance/test262-starter-corpus/manifest.json','package.json','package-lock.json']){mkdirSync(dirname(resolve(box,path)),{recursive:true});cpSync(path,resolve(box,path));}
cpSync('node_modules/yaml',resolve(box,'node_modules/yaml'),{recursive:true});
const proposal=json(own+'/proposal-manifest.json').find(r=>r.path==='tools/test262/script-plan.mjs');cpSync(proposal.proposed,resolve(box,proposal.path));
const marker='// E2b-P closure-only inert marker, no implementation or exports.\n';writeFileSync(resolve(box,'tools/test262/script-ledger.mjs'),marker);
const api=await import(pathToFileURL(resolve(box,proposal.path)));const row=originals[0],selected=api.inspectScriptSelection(await api.prepareScriptSelection({root,revision:row.revision,lane:'node',paths:row.selection.files.map(f=>f.path)}));
const expected=structuredClone(row.selection);expected.policy.id='rift-script-blocked-v3';expected.policy.files.find(f=>f.path===proposal.path).sha256=proposal.proposedSha256;expected.policy.files.push({path:'tools/test262/script-ledger.mjs',sha256:hash(marker)});expected.policy.files.sort((a,b)=>a.path<b.path?-1:1);expected.policy.closureSha256=hash(JSON.stringify(expected.policy.files));assert.deepEqual({...selected,runId:expected.runId},expected);assert.equal(selected.policy.files.length,242);
save('closure-probe-results.json',{exactProposedPlanner:true,inertLedgerMarker:true,implementationValidated:false,selection:selected});
// Full migration helper from rendered old-test proposal, with imports confined
// to the sandbox: compare all 11 old literals, not only two corpus totals.
const testProposal=json(own+'/proposal-manifest.json').find(r=>r.path==='tools/test262/script-plan.test.mjs');const source=readFileSync(testProposal.proposed,'utf8'),start=source.indexOf('async function ledgerPolicyLiteral('),end=source.indexOf('\nasync function cleanup(root)',start);assert(start>0&&end>start);
const helper="import assert from 'node:assert/strict';\nimport {readFile} from 'node:fs/promises';\nimport {sha256} from './input.mjs';\n"+source.slice(start,end)+'\nexport {ledgerPolicyLiteral};\n';writeFileSync(resolve(box,'tools/test262/helper.mjs'),helper);const h=await import(pathToFileURL(resolve(box,'tools/test262/helper.mjs')));const cwd=process.cwd();let migrated=[];
try{process.chdir(box);const literals=[...json(resolve(cwd,'docs/validation/ts-035e2a/selection-literals.json')).map(r=>r.selection),...json(resolve(cwd,'docs/validation/ts-035e2a/input-literals.json'))];for(const s of literals){const after=await h.ledgerPolicyLiteral(s),unchanged=structuredClone(after);unchanged.policy=structuredClone(s.policy);assert.deepEqual(unchanged,s);assert.equal(after.policy.files.length,242);assert.equal(after.policy.id,'rift-script-blocked-v3');const rest=after.policy.files.filter(f=>!['tools/test262/script-plan.mjs','tools/test262/script-ledger.mjs'].includes(f.path));assert.deepEqual(rest,s.policy.files.filter(f=>f.path!=='tools/test262/script-plan.mjs'));migrated.push(after);}for(const edit of [s=>s.policy.id='other',s=>s.policy.files.pop(),s=>s.policy.closureSha256='0'.repeat(64),s=>{s.policy.files.find(f=>f.path==='tools/test262/script-plan.mjs').sha256='0'.repeat(64);s.policy.closureSha256=hash(JSON.stringify(s.policy.files));}]){const s=structuredClone(literals[0]);edit(s);await assert.rejects(h.ledgerPolicyLiteral(s));}}
finally{process.chdir(cwd);}
save('migrated-closure-literals.json',migrated);save('audit-results.json',{actualLanes:2,slotsPerLane:60,feature:19,profile:41,closureProbe:242,fullMigratedLiterals:11,migrationNegatives:4,productionLedger:false});console.log('PASS actual2 / 60blocked19-41 / proposed closure242 / 11 full migration literals / 4 negatives');
