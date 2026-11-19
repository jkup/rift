import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const labels=['runtime source','S01-S30 literal semantics','N01-N10 whole-source boundaries and neighbors','208 fresh/seven-seeded prefixes','X01 exact throw origins at three stages','X02 consumed throw history same/cross Realm','X03 nested B host fault restores active A and permits','X04 exact legacy guards and audit closure','X05 ownership inspection and retained closure','S07 host symbol/object identity without coercion'];
const expected=labels.map(label=>'PASS '+label+'\n').join('');
const frozen=JSON.parse(readFileSync(import.meta.dirname+'/../ts-034h2/frozen.json'));
const hashes=[];
for(const input of ['seven','eleven']){
 const path='fixtures/harness-switch/input-'+input+'.js', hash=createHash('sha256').update(readFileSync(path)).digest('hex');
 assert.equal(hash,frozen.files['docs/validation/ts-034h2-p/input-'+input+'.js']);hashes.push({path,sha256:hash});
}
writeFileSync(import.meta.dirname+'/switch-runtime-input-hashes.json',JSON.stringify(hashes,null,2)+'\n');
const gate=JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/harness-switch.ts');assert.ok(gate);
const results=[];
try {
 for(const input of ['seven','eleven']) {
  const row={input};
  for(const lane of ['node','native']) {
   const file='fixtures/harness-switch/input-'+input+'.js';
   const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-switch.exe',lane==='node'?['build/node/test/harness-switch.js',file]:[file],{encoding:'utf8',timeout:60000});
   row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};
  }
  results.push(row);assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));
  for(const lane of ['node','native']){assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
 }
} finally {writeFileSync(import.meta.dirname+'/switch-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS switch controls and 208 prefixes on both hosts for both hashed runtime sources');
