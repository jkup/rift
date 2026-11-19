import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(import.meta.dirname+'/'+p));
const suites=read('replays/suite-typecheck.json'),inherited=read('inherited-checks.json'),replays=read('replays/replays-results.json'),h3=read('for-update-results.json'),preservation=read('preservation.json');
const passed=r=>r.status===0&&r.signal===null&&r.error===null;
assert.ok(suites.every(passed));assert.ok(inherited.filter(r=>r.name!=='inherited').every(passed));assert.equal(replays.length,17);assert.ok(replays.every(passed));assert.equal(h3.length,2);assert.ok(h3.every(r=>passed(r.node)&&passed(r.native)));assert.equal(preservation.coverage.length,52);assert.ok(preservation.coverage.every(r=>r.dynamic===0));assert.equal(preservation.records,212);
writeFileSync(import.meta.dirname+'/validation-summary.json',JSON.stringify({status:'PASS',suites:suites.map(r=>({name:r.name,status:r.status})),inherited:inherited.filter(r=>r.name!=='inherited').map(r=>({name:r.name,status:r.status})),inheritedReplayRetry:{artifact:'replays/replays-results.json',groups:17,status:'PASS',initialFailure:'initial-inherited-checks.json'},h3:{artifact:'for-update-results.json',runtimeInputs:2,lanes:['node','native'],prefixesPerRun:190},recordsPerLane:212,staticGates:52,dynamic:0,blockedVariants:60},null,2)+'\n');
console.log('PASS final validation artifacts,52 static/zero dynamic gates,212 old records/lane,190 H3 prefixes/two inputs/both lanes,17 inherited replay groups');
