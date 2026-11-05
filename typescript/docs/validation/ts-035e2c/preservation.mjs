import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p));
const prior='docs/validation/ts-035e2c-p';
const proposals=read(prior+'/correction/proposal-manifest.json');
assert.equal(proposals.length,6);
for(const row of proposals){
 for(const key of ['original','proposed'])assert.equal(hash(readFileSync(row[key])),row[key+'Sha256'],row[key]);
 assert.equal(hash(readFileSync(row.path)),row.proposedSha256,row.path);
 if(row.previousProposed)assert.equal(hash(readFileSync(row.previousProposed)),row.previousProposedSha256);
}
const baseline=read(prior+'/baseline.json');
assert.equal(baseline.length,5898);
let replaced=0;
for(const row of baseline){const proposal=proposals.find(p=>resolve(p.path)===resolve(row.path));if(proposal){assert.equal(row.sha256,proposal.originalSha256);replaced++;}assert.equal(hash(readFileSync(row.path)),proposal?.proposedSha256??row.sha256,row.path);}
assert.equal(replaced,6);
const retained=read(prior+'/correction/retained-candidate-identities.json');
for(const row of retained)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
console.log(JSON.stringify({baseline:baseline.length,exactReplacements:6,retained:retained.length}));
