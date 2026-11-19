import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const here=import.meta.dirname,read=name=>JSON.parse(readFileSync(here+'/'+name));
const clean=row=>{assert.equal(row.status,0);assert.equal(row.signal,null);assert.equal(row.error,null);};
const preservation=read('preservation.json'),source=read('source-preservation.json'),kernel=read('kernel-results.json');
assert.equal(preservation.coverage.length,55);assert.ok(preservation.coverage.every(r=>r.dynamic===0));
assert.equal(kernel.length,2);for(const row of kernel)for(const lane of ['node','native'])clean(row[lane]);
const feature=read('feature-checks.json'),inherited=read('replays/replays-results.json');assert.equal(feature.length,9);assert.equal(inherited.length,17);for(const row of [...feature,...inherited])clean(row);
const early=read('suites-typecheck-runner-guests-node-host-observations.json');clean(read('suites-typecheck.json')[0]);for(const name of ['runner','guests-node'])clean(early.find(r=>r.name===name));
for(const [name,count] of [['runner',20],['host',73],['observations',22]]){const row=name==='runner'?early.find(r=>r.name===name):read('suites-'+name+'.json')[0];clean(row);assert.match(row.stdout,new RegExp('tests '+count+'\\b'));assert.match(row.stdout,new RegExp('pass '+count+'\\b'));assert.match(row.stdout,/fail 0\b/);}
clean(read('suites-probes.json')[0]);const probes=read('probe-results.json');assert.equal(probes.length,10);assert.ok(probes.every(r=>r.verdict==='PASS'));
const result={status:'candidate awaiting actual and independent second acceptance',base:preservation.base,recordsPerLane:preservation.records,staticGates:preservation.coverage.length,kernelStatic:preservation.coverage.at(-1).static,dynamic:0,runtimeInputs:2,rows:'A01-A09',budgetCasesPerInput:24,featureGroups:9,inheritedGroups:17,typecheck:'PASS',runner:20,probes:10,host:73,observations:22,protectedFiles:source.protectedFiles,unchangedOldTests:source.oldTests,oldTestMigrations:0,blockedVariants:source.variants.length};
writeFileSync(here+'/validation-summary.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
