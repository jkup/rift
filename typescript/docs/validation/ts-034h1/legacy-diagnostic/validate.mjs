import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {probeVerdict} from '../../../../tools/probe-verdict.mjs';
const labels=['runtime source','C01','C02','C03','C05','C11','C12','C13','D01','D02','D03','D04','D08','D09',
 'C06 C07 D05 D06 D07 D10 grammar neighbors','P14 fresh/seven-seeded all prefixes','P14R fresh/seven-seeded all prefixes',
 'P05 fresh/seven-seeded all prefixes','P15F fresh/seven-seeded all prefixes','C14 same Realm','C14 cross Realm',
 'C04 C08 C09 C10 consumption history and origin distinction','declaration inspection detached catch metadata',
 'explicit empty and C01 C04 C13 cross-unit cross-Realm controls','exact legacy var and distinct try-catch AST diagnostics'];
const expected=labels.map(x=>'PASS '+x+'\n').join('');
const gate=JSON.parse(readFileSync('build/native-build-results.json')).find(r=>r.entry==='test/harness-catch.ts');
assert.ok(gate);
const results=[];
try {
 for(const input of ['seed','other']) {
  const row={input};
  for(const lane of ['node','native']) {
   const file='fixtures/harness-catch/'+input+'.txt';
   const r=spawnSync(lane==='node'?process.execPath:'build/native/harness-catch.exe',lane==='node'?['build/node/test/harness-catch.js',file]:[file],{encoding:'utf8',timeout:60000});
   row[lane]={status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};
  }
  results.push(row);
  assert.equal(probeVerdict({...gate,...row}),'PASS',JSON.stringify(row));
  for(const lane of ['node','native']) {assert.equal(row[lane].stdout,expected);assert.equal(row[lane].stderr,'');}
 }
} finally {writeFileSync(import.meta.dirname+'/catch-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS literal catch matrix and 104 fresh/seven-seeded prefixes in both lanes, both runtime sources');
