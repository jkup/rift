import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const own='docs/validation/ts-035e2c-p/correction';
const read=p=>JSON.parse(readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifests=read(own+'/proposal-manifest.json');
for(const row of manifests){
 assert.equal(hash(readFileSync(row.path)),row.originalSha256,row.path);
 for(const key of ['original','proposed'])assert.equal(hash(readFileSync(row[key])),row[key+'Sha256'],row[key]);
 if(row.previousProposed)assert.equal(hash(readFileSync(row.previousProposed)),row.previousProposedSha256);
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:readFileSync(row.proposed),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
}
const prior=read(own+'/retained-candidate-identities.json');
for(const row of prior)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
const baseline=read('docs/validation/ts-035e2c-p/baseline.json');
for(const row of baseline)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
console.log(JSON.stringify({proposals:manifests.length,changedProposals:manifests.filter(r=>r.previousProposed).length,retainedCandidate:prior.length,baseline:baseline.length}));
