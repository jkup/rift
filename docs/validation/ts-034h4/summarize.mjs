import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const here=import.meta.dirname,read=p=>JSON.parse(readFileSync(here+'/'+p));
const good=r=>{assert.equal(r.status,0,r.name??'process');assert.equal(r.signal,null);assert.equal(r.error,null);};
const checks=read('final-checks.json');assert.equal(checks.length,9);checks.forEach(good);
const replays=read('replays/replays-results.json');assert.equal(replays.length,17);replays.forEach(good);
const early=read('replays/suite-typecheck.json');const runner=early.find(r=>r.name==='test:runner');good(runner);assert.match(runner.stdout,/tests 20/);
const host=read('replays/suite-test-test262.json');for(const [name,count] of [['test:test262',73],['test:observations',22]]){const row=host.find(r=>r.name===name);good(row);assert.match(row.stdout,new RegExp('tests '+count));}
const probe=read('replays/suite-test-probes.json')[0];good(probe);assert.equal((probe.stdout.match(/^PASS\s/gm)??[]).length,10);
assert.match(readFileSync(here+'/typecheck-final.log','utf8'),/tsc -p tsconfig.json/);
const preserved=read('preservation.json');assert.equal(preserved.records,212);assert.equal(preserved.coverage.length,53);assert.ok(preserved.coverage.every(r=>r.dynamic===0));
const own=read('nonstrict-results.json');assert.equal(own.length,2);for(const r of own){good(r.node);good(r.native);assert.equal(r.node.stdout,r.native.stdout);assert.match(r.node.stdout,/190 fresh\/seven-seeded prefixes/);}
const result={status:'PASS candidate awaiting actual and independent second review',base:'3742d71',guestRecordsPerLane:212,staticGates:53,h4Static:preserved.coverage.find(r=>r.entry==='test/harness-nonstrict.ts').static,dynamic:0,h4Prefixes:190,h3Prefixes:190,h2Prefixes:208,h1Prefixes:104,runtimeInputsPerFeature:2,inheritedReplayGroups:17,runner:20,host:73,observations:22,probes:10,protectedFiles:read('source-preservation.json').protectedFiles,oldTestMigrations:0,blockedVariants:60,amendments:'AMENDMENTS.md',initialFailuresRetained:['initial-full-build-results.json','initial-guest-native-results.json','compiler-investigation/'],nodeOnlyReflection:['replays/node-boundary-results.json','replays/bounded-boundary-results.json']};
writeFileSync(here+'/validation-summary.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
