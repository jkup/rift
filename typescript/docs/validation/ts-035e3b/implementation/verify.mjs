import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {probeVerdict} from '../../../../tools/probe-verdict.mjs';
const here=import.meta.dirname,root=resolve(here,'../../../..'),json=p=>JSON.parse(readFileSync(join(here,p))),hash=b=>createHash('sha256').update(b).digest('hex');
for(const row of json('artifacts.json'))assert.equal(hash(readFileSync(join(here,row.path))),row.sha256,row.path);
const stages=json('final-stages.json');assert.equal(stages.length,40);assert(stages.every(r=>r.status===0&&r.signal===null&&r.error===null));
const gates=json('native-build-results.json'),success={status:0,signal:null,error:null,stdout:''};assert.equal(gates.length,71);
for(const g of gates)assert.equal(probeVerdict({build:g.build,coverage:g.coverage,node:success,native:success}),'PASS',g.entry);
for(const lane of ['node','native']){const rows=json('guest-'+lane+'-results.json');assert.equal(rows.length,212);assert(rows.every(r=>r.verdict==='PASS'));}
const probes=json('probe-results.json');assert.equal(probes.length,10);assert(probes.every(r=>r.verdict==='PASS'));
assert.equal(json('transport-results.json').length,172);
const producer=json('producer-artifacts.json');assert.equal(producer.children.length,66);assert.equal(producer.negativeDirectories.length,114);assert.equal(producer.spoofDirectories.length,8);
const policies=json('policy-results.json');assert.equal(policies.length,2);
for(const p of policies){assert.equal(p.selection.authority.entries.length,0);assert.equal(p.final.completed,60);assert.equal(p.final.counts['unsupported-feature'],19);assert.equal(p.final.counts['unsupported-profile'],41);assert.equal(p.final.executedVariants,0);assert.equal(p.final.testBodyEvaluatedVariants,0);}
const {sandbox}=json('run-location.json');assert(!existsSync(join(root,'src/script-producer-request.ts')));assert(!existsSync(join(sandbox,'build/node/src/script-producer-request.js')));
for(const row of json('fresh-native-outputs.json'))assert.equal(hash(readFileSync(join(sandbox,'build/native',row.binary))),row.sha256,row.binary);
for(const row of json('copied-inputs.json'))assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
const repair=json('sandbox-input-repair.json');assert.equal(hash(readFileSync(repair.source)),repair.sha256);assert.equal(hash(readFileSync(repair.target)),repair.sha256);
const cache=json('cache-inspection/result.json');assert.equal(cache.onlyFieldChanged,'ino');assert.equal(cache.changed.length,54);assert.equal(cache.artifacts,98);assert(cache.allOriginalAndCopiedObjectBytesMatchRecordedSha256);
assert.equal(hash(readFileSync(join(root,cache.path))),cache.beforeSha256);assert.equal(hash(readFileSync(join(sandbox,cache.path))),cache.afterSha256);
console.log(JSON.stringify({stages:40,nativeGates:71,guestsPerLane:212,producerLiterals:66,driverNegatives:114,lateFailures:8,spoofs:8,transportRecords:172,probes:10,blockedPerLane:60,originalInputsUnchanged:json('copied-inputs.json').length,implementationArtifacts:json('artifacts.json').length}));
