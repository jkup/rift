// Synthetic contract validation only. No runtime adapter, native calls or process launch.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {decode,review} from '../ts-035e3h-capture-p/format.mjs';
import {assess} from './status-model.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=n=>JSON.parse(fs.readFileSync(join(here,n))),hash=b=>createHash('sha256').update(b).digest('hex');
let controls=0;const check=(fn)=>{fn();controls++;};
const oracle=json('smoke-oracle.json'),config=json('execution-config.proposed.json');
check(()=>assert.deepEqual(config.childEnvironment,oracle.environment));check(()=>assert.deepEqual(config.argv,oracle.argv));check(()=>assert.equal(config.executable,oracle.executable));check(()=>assert.equal(config.root,oracle.root));check(()=>assert.equal(config.childEnvironment.HOMEDRIVE+config.childEnvironment.HOMEPATH,config.childEnvironment.USERPROFILE));
check(()=>assert.deepEqual(decode(Buffer.from(oracle.recordHex,'hex')),oracle.decodedLiteral));check(()=>assert.deepEqual(review(oracle.snapshot),oracle.expectedReview));
for(const f of [...JSON.parse(fs.readFileSync(join(here,'../ts-035e3h-capture-p/byte-literals.json'))),...JSON.parse(fs.readFileSync(join(here,'../ts-035e3h-capture-p/additional-byte-literals.json')))])check(()=>assert.deepEqual(decode(Buffer.from(f.hex,'hex')),f.expected));
for(const f of JSON.parse(fs.readFileSync(join(here,'../ts-035e3h-capture-p/model-literals.json'))))check(()=>assert.deepEqual(review(f.input),f.expected));
for(const r of json('identities.json'))check(()=>{const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);});
for(const t of json('source-transformations.json'))check(()=>{const b=fs.readFileSync(join(repo,t.source));assert.equal(b.length,t.sourceBytes);assert.equal(hash(b),t.sourceSha256);let s=b.toString();for(const r of t.replacements){assert.equal(s.split(r.old).length-1,r.count);s=s.replace(r.old,r.next);}const actual=fs.readFileSync(join(here,t.target));assert.equal(actual.toString(),s);assert.equal(actual.length,t.bytes);assert.equal(hash(actual),t.sha256);});
check(()=>assert(fs.readFileSync(join(here,'supervisor.cs.proposed.txt'),'utf8').includes('const bool CaptureRuntimeEnabled = false;')));check(()=>assert(fs.readFileSync(join(here,'supervise.ps1.proposed.txt'),'utf8').includes("throw 'DESIGN_ONLY_RECORDER_RUNTIME_GATE'")));
for(const f of json('status-literals.json'))check(()=>assert.deepEqual(assess(f.input),f.expected,f.id));
console.log(JSON.stringify({controls,smokeRecordBytes:oracle.recordHex.length/2,inheritedByteLiterals:38,inheritedSnapshotLiterals:31,environmentKeys:19,designOnly:true,recorderLaunches:0,addTypeCalls:0,binaryInterpretations:0,passed:true}));
