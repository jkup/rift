import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,read=p=>JSON.parse(readFileSync(here+'/'+p));
function passed(rows){for(const r of rows){assert.equal(r.status,0,r.name);assert.equal(r.signal,null);assert.equal(r.error,null);}}
const features=read('feature-checks.json'),replays=read('replays/replays-results.json'),suites=read('replays/suite-typecheck.json');
assert.equal(features.length,10);passed(features);assert.equal(replays.length,17);passed(replays);assert.equal(suites.length,5);passed(suites);
for(const [name,count]of [['test:runner',20],['test:test262',73],['test:observations',22]]){const row=suites.find(r=>r.name===name);assert.ok(row);assert.match(row.stdout,new RegExp('tests '+count+'\\b'));assert.match(row.stdout,new RegExp('pass '+count+'\\b'));assert.match(row.stdout,/fail 0\b/);}
assert.equal((suites.find(r=>r.name==='test:probes').stdout.match(/^PASS\s+/gm)||[]).length,10);
const preservation=read('preservation.json');assert.equal(preservation.records,212);assert.equal(preservation.coverage.length,57);assert.ok(preservation.coverage.every(c=>c.dynamic===0));
for(const file of ['map-results.json','error-results.json']){const rows=read(file);assert.equal(rows.length,2);for(const row of rows)passed([row.node,row.native]);}
const cp=read('cp-replay/results.json');assert.ok(cp.status.startsWith('PASS'));assert.equal(cp.runs.length,2);assert.ok(cp.runs.every(r=>r.verdict==='PASS'));
for(const f of read('final-source-hashes.json'))assert.equal(createHash('sha256').update(readFileSync(here+'/../../../'+f.path)).digest('hex'),f.sha256,f.path);
const report={status:'candidate validation PASS; actual and independent second review still required',recordsPerLane:212,oldGates:56,newGates:1,staticStatements:preservation.coverage.find(c=>c.entry==='test/harness-map-default.ts').static,dynamic:0,inputs:2,lanes:['node','native'],prefixesPerInputLane:308,callControlsPerInputLane:224,parsedGetterControlsPerInputLane:200,separateSessionReentryControlsPerInputLane:48,accessorAbruptPrefixesPerInputLane:480,allTraceAbruptPrefixesPerInputLane:2340,cpReplayRowsAcrossInputsAndLanes:80,featureGroups:10,inheritedReplayGroups:17,runner:20,probes:10,host:73,observations:22,blockedVariants:60,foreignIntrinsicArray:'unrepresentable, not executed',oracleCorrection:'independently reviewed nonstrict setup tick; immutable original evidence retained'};
writeFileSync(here+'/completion.json',JSON.stringify(report,null,2)+'\n');console.log('PASS complete assigned candidate validation; stop for actual/independent second review');
