import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parseScriptDriverResult} from '../../../../tools/test262/script-driver-result.mjs';
const here=import.meta.dirname,hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=readFileSync(join(here,'future-literals.json'));
assert.equal(hash(bytes),'c9e11ac4f8bcfec1c9aa029fe55bb0abca1182e795b7bfb8c3ddd3db938740b2');
const frozen=JSON.parse(bytes),ids=[];
for(const lane of ['node','native'])for(const input of ['alpha','beta'])for(const layout of ['original','repeat'])for(const id of ['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16','N01','N02','I01'])ids.push(`${lane}/${input}/${layout}/${id}`);
for(const lane of ['node','native'])for(const layout of ['original','repeat'])for(const limit of ['steps','calls'])ids.push(`${lane}/alpha/${layout}/B01/zero-${limit}`);
function oracle(rows){assert.deepEqual(rows.map(r=>r.id),ids);assert.deepEqual(rows,frozen);}
oracle(structuredClone(frozen));
const results=[];
for(const [id,mutate] of [
 ['omitted-first-control',x=>x.shift()],['omitted-last-control',x=>x.pop()],
 ['duplicate-control',x=>x[1]=structuredClone(x[0])],['reordered-controls',x=>[x[0],x[1]]=[x[1],x[0]]],
 ['changed-role',x=>x[0].expected.child.operation.stage='test'],
 ['changed-realm',x=>x[0].expected.child.operation.realmId='other'],
 ['false-positive-report',x=>x[0].expected.report.passed=false],
 ['summary-only',x=>x[0].expected={passed:true}],
 ['omitted-original-harness',x=>x[0].sourceTexts.shift()],
 ['collapsed-occurrences',x=>x.find(r=>r.repeated).binding.units.splice(2,1)],
 ['constant-unit-ID',x=>{for(const r of x)r.expected.child.operation.unitId='u0';}],
 ['relabeled-input',x=>x.find(r=>r.control==='I01'&&r.input==='beta').expected.report.input='alpha'],
]){const changed=structuredClone(frozen);mutate(changed);assert.throws(()=>oracle(changed));results.push({id,rejected:true});}
// A self-consistent nonce/hash relabel remains codec-valid data, but cannot
// replace the frozen full expected control identity. No success authority here.
const changed=structuredClone(frozen),r=changed[0];r.request.nonce='forged';r.binding.nonce='forged';r.binding.requestSha256=hash(JSON.stringify(r.request));r.expected.child.nonce='forged';r.expected.child.requestSha256=r.binding.requestSha256;r.expected.report.nonce='forged';r.argv[6]='forged';r.argv[7]=r.binding.requestSha256;
assert.deepEqual(parseScriptDriverResult(Buffer.from(JSON.stringify(r.expected.child)),r.binding),r.expected.child);
assert.throws(()=>oracle(changed));results.push({id:'self-consistent-nonce-request-child-report-argv',codecAccepted:true,literalOracleRejected:true});
const directory=mkdtempSync(join(here,'oracle-'));
writeFileSync(join(directory,'result.json'),JSON.stringify({baselineRecords:160,results,engineExecutions:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({directory,baselineRecords:160,mutantsRejected:results.length,engineExecutions:0}));
