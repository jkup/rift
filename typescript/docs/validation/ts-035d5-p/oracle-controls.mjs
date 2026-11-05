import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=new URL('./',import.meta.url),json=p=>JSON.parse(readFileSync(new URL(p,here)));
const literals=json('blocked-expectations.json'),matrix=json('semantic-matrix.json'),controls=[];
for(const entry of json('original-blocked-oracle/manifest.json'))assert.equal(createHash('sha256').update(readFileSync(new URL('original-blocked-oracle/'+entry.name,here))).digest('hex'),entry.sha256,entry.name+' original evidence');
for(const r of literals.rows){
 const row=matrix.rows.find(x=>x.id===r.id);assert.equal(row.text,r.text);assert.deepEqual(row.expected,r.expected);
 const mutations=[['location-line',e=>e.diagnostic.loc.line++],['location-column',e=>e.diagnostic.loc.column++],['message',e=>e.diagnostic.message+=' wrong'],['phase',e=>e.diagnostic.phase='runtime'],['name',e=>e.diagnostic.name='TypeError'],['rejection',e=>e.rejection={kind:'unsupported-syntax',capabilityCode:'parse.unexpected'}]];
 if(r.expected.rejection?.kind==='resource-limit')mutations.push(['resource-count',e=>e.rejection.count++],['resource-limit',e=>e.rejection.limit++],['resource-guard',e=>e.rejection.guardCode='calls']);
 for(const [id,mutate] of mutations){const value=structuredClone(r.expected);mutate(value);
  // Some rows already have parse.unexpected; choose a different capability.
  if(JSON.stringify(value)===JSON.stringify(r.expected))value.rejection.capabilityCode='parse.assignment-target';
  assert.throws(()=>assert.deepEqual(value,r.expected),r.id+'/'+id);
  controls.push({id:r.id+'/'+id,actual:value,expected:'full-object oracle rejects'});
 }
}
writeFileSync(new URL('oracle-controls.json',here),JSON.stringify({claim:'Negative oracle tests, not future engine execution',blockedRows:literals.rows.length,controls},null,2)+'\n');
console.log(JSON.stringify({blockedRows:literals.rows.length,negativeOracleControls:controls.length}));
