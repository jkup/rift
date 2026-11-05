// Review correction: preserve the original candidate before strengthening oracles.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=new URL('./',import.meta.url),prior=new URL('original-blocked-oracle/',here),sha=b=>createHash('sha256').update(b).digest('hex');
mkdirSync(prior,{recursive:true});const manifest=[];
for(const name of ['cases.mjs','freeze.mjs','probe.mjs','semantic-matrix.json','probe-results.json','checks.json']){
 const dest=new URL(name,prior);assert(!existsSync(dest),'Never overwrite prior evidence '+name);const bytes=readFileSync(new URL(name,here));writeFileSync(dest,bytes);manifest.push({name,sha256:sha(bytes)});
}
writeFileSync(new URL('manifest.json',prior),JSON.stringify(manifest,null,2)+'\n');
const matrix=JSON.parse(readFileSync(new URL('semantic-matrix.json',prior))),probes=JSON.parse(readFileSync(new URL('probe-results.json',prior))).results;
const rows=matrix.rows.filter(r=>r.expected.kind==='blocked').map(r=>{
 const p=probes.find(p=>p.id===r.id);assert(p);assert.equal(p.text.length,r.text.length);
 let expected=structuredClone(p.actual),basis='Exact retained current bounded audit on the explicit same-width valid-reference neighbor; only original numeric assignment failure is deferred.';
 if(r.id.startsWith('M5-')){
  assert.equal(p.actual.kind,'eligible');const second=p.actual.candidates[0].second;
  expected={kind:'blocked',reason:'other-conflict',rejection:null,diagnostic:{phase:'parse',name:'SyntaxError',message:'duplicate-lexical: '+second.name,loc:structuredClone(second.loc)}};
  basis='Authored numeric-audit block-pair veto: duplicate-lexical diagnostic at retained second binding; current block audit remains eligible.';
 }
 assert.equal(expected.kind,'blocked');assert.equal(expected.reason,r.expected.reason);assert.equal(expected.rejection?.capabilityCode??expected.rejection?.guardCode??null,r.expected.code);
 return {id:r.id,text:r.text,witnessText:p.text,basis,expected};
});
writeFileSync(new URL('blocked-expectations.json',here),JSON.stringify({claim:'Literal full future blocked oracles reviewed against explicit same-width current neighbors; no numeric audit implementation.',rows},null,2)+'\n');
console.log(JSON.stringify({fullBlockedRows:rows.length,originalFilesPreserved:manifest.length}));
