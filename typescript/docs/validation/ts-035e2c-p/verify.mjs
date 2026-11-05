import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const own='docs/validation/ts-035e2c-p';
const read=p=>JSON.parse(readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const proposals=read(own+'/proposal-manifest.json');
for(const row of proposals){
 assert.equal(hash(readFileSync(row.original)),row.originalSha256,row.path+' original');
 assert.equal(hash(readFileSync(row.proposed)),row.proposedSha256,row.path+' proposed');
 assert.equal(hash(readFileSync(row.path)),row.originalSha256,row.path+' actual preserved');
 const syntax=spawnSync(process.execPath,['--check','--input-type=module'],{input:readFileSync(row.proposed),encoding:'utf8'});
 assert.equal(syntax.status,0,row.path+syntax.stderr);
}
const baseline=read(own+'/baseline.json');
for(const row of baseline)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
console.log(JSON.stringify({wholeFileProposals:proposals.length,baselineIdentities:baseline.length,syntax:true,productionUnchanged:true}));
