import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const own='docs/validation/ts-035e2b-p',hash=x=>createHash('sha256').update(x).digest('hex'),read=p=>readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
assert(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--proposed'));
const proposedMode=process.argv[2]==='--proposed',proposals=json(own+'/proposal-manifest.json');
const preserved=json(own+'/preservation.json');for(const row of preserved){const migration=proposals.find(p=>'typescript/'+p.path===row.path);assert.equal(hash(readFileSync(resolve('..',row.path))),proposedMode&&migration?migration.proposedSha256:row.sha256,row.path);}
assert.deepEqual(proposals.map(r=>r.path),['tools/test262/script-plan.mjs','tools/test262/script-plan.test.mjs','docs/validation/ts-035e2a/support.mjs']);
for(const row of proposals){assert.equal(hash(read(row.path)),proposedMode?row.proposedSha256:row.originalSha256,row.path);assert.equal(read(row.path),read(proposedMode?row.proposed:row.original));assert.equal(hash(read(row.original)),row.originalSha256);assert.equal(hash(read(row.proposed)),row.proposedSha256);}
const replace=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,b);};
const [p,t,s]=proposals,added="\n    'tools/test262/script-ledger.mjs',";
assert.equal(replace(replace(read(p.proposed),added,''),"id: 'rift-script-blocked-v3'","id: 'rift-script-blocked-v2'"),read(p.original));
assert.equal(replace(read(s.proposed),added,''),read(s.original));
let test=read(t.proposed),start=test.indexOf('\n// E2b: preserve historical expectations;'),end=test.indexOf('\nasync function cleanup(root)',start);assert(start>0&&end>start);test=test.slice(0,start)+test.slice(end+1);
test=replace(test,"const literals = await Promise.all((await json(resolve(evidence,'selection-literals.json'))).map(async row=>({...row,selection:await ledgerPolicyLiteral(row.selection)})));","const literals = await json(resolve(evidence,'selection-literals.json'));");
test=replace(test,"const expected=await Promise.all((await json(resolve(evidence,'input-literals.json'))).map(ledgerPolicyLiteral));","const expected=await json(resolve(evidence,'input-literals.json'));");assert.equal(test,read(t.original));
const reports=json(own+'/report-literals.json');for(const lane of ['node','native']){const initial=reports.find(r=>r.id===lane+'-initial').expected,final=reports.find(r=>r.id===lane+'-final').expected,retry=reports.find(r=>r.id===lane+'-final-retry').expected;assert.equal(initial.plannedVariants,60);assert.equal(initial.exitCode,2);assert.equal(final.counts['unsupported-feature'],19);assert.equal(final.counts['unsupported-profile'],41);assert.equal(final.attempts,60);assert.equal(final.exitCode,1);assert.deepEqual({...retry,attempts:60},final);assert.equal(retry.attempts,61);assert.deepEqual(final.passOverPlanned,{numerator:0,denominator:60});}
for(const lane of ['node','native']){const records=json('docs/validation/ts-035d8/guest-'+lane+'-results.json');assert.equal(records.length,212);assert(records.every(r=>r.verdict==='PASS'));}
assert.equal(json('docs/validation/ts-035d8/native-build-results.json').length,71);
const output={preserved:preserved.length,completeProposals:3,productionChanges:proposedMode?1:0,oldTestChanges:proposedMode?2:0,historicalChanges:0,literalReports:reports.length+json(own+'/supplemental-literals.json').reports.length,retainedGuestPerLane:212,retainedStaticGates:71,blockedPerLane:60,feature:19,profile:41,freshNativeBuild:false};writeFileSync("C:\\Users\\jonku\\code\\rift\\typescript\\docs\\validation\\ts-035e2b\\run-LVNrmY\\preservation.json",JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
