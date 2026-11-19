import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const here=import.meta.dirname,root=resolve(here,'../../../..'),repo=resolve(root,'..'),prior=resolve(here,'../../ts-035e3b-p'),implemented=process.argv.includes('--implemented');
const json=p=>JSON.parse(readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=json(join(here,'proposal-manifest.json'));
for(const row of manifest){
 const path=join(repo,row.path);
 if(row.operation==='replace'){
  assert.equal(hash(readFileSync(join(here,row.proposal))),row.after,row.proposal);
  assert.equal(hash(readFileSync(path)),implemented?row.after:row.before,row.path);
 }else{
  assert.equal(row.operation,'remove-unshipped-file');
  if(implemented)assert(!existsSync(path),row.path+' must be absent');
  else assert.equal(hash(readFileSync(path)),row.before,row.path);
 }
}
const baseline=json(join(prior,'preservation.json')),accepted=json(join(prior,'proposal-manifest.json'));
for(const row of baseline){const proposed=manifest.find(m=>m.path===row.path),old=accepted.find(m=>m.path===row.path);assert.equal(hash(readFileSync(join(repo,row.path))),implemented&&proposed?proposed.after:old?.after??row.sha256,row.path);}
for(const row of json(join(prior,'artifacts.json')))assert.equal(hash(readFileSync(join(prior,row.path))),row.sha256,row.path);
const previous=resolve(here,'..');
for(const row of json(join(previous,'alternative-evidence.json')).files)assert.equal(hash(readFileSync(join(previous,row.path))),row.sha256,row.path);
for(const row of json(join(here,'prior-evidence-identities.json')))assert.equal(hash(readFileSync(join(previous,row.path))),row.sha256,row.path);
for(const row of json(join(here,'artifacts.json')))assert.equal(hash(readFileSync(join(here,row.path))),row.sha256,row.path);
console.log(JSON.stringify({implemented,protectedBaseline:baseline.length,exactReplacements:3,withdrawnUnshippedModule:implemented?'absent':'original retained pending approval',originalProposalArtifacts:json(join(prior,'artifacts.json')).length,priorEvidence:json(join(here,'prior-evidence-identities.json')).length,designArtifacts:json(join(here,'artifacts.json')).length}));
