import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {hash} from '../../ts-035e3h-runtime-ready-p/files.mjs';
import {validateAliases} from '../../ts-035e3h-runtime-ready-p/policy.mjs';
import {actualCandidate,validateCandidate,validateEnvironments} from '../../ts-035e3h-runtime-ready-p/proposal-check.mjs';
const here=resolve(resolve(resolve(resolve(import.meta.dirname,'../../ts-035e3h-unicode-inert/_preserve'),'../../ts-035e3h-unicode-p/_preserve'),'../../ts-035e3h-runtime-exec/_preserve'),'../../ts-035e3h-runtime-ready-p'),repo=resolve(here,'../../../..'),json=n=>JSON.parse(fs.readFileSync(join(here,n)));
validateCandidate(actualCandidate());validateEnvironments(json('invocation.proposed.json').environment,json('execution-config.proposed.json').childEnvironment);
assert.equal(json('source-transformations.json').length,4);
for(const t of json('source-transformations.json')){const b=fs.readFileSync(join(repo,t.source));assert.equal(b.length,t.sourceBytes);assert.equal(hash(b),t.sourceSha256);let s=b.toString();for(const r of t.replacements){assert.equal(s.split(r.old).length-1,r.count);assert.equal(r.count,1);s=s.replace(r.old,r.next);}const actual=fs.readFileSync(join(here,t.target));assert.equal(actual.toString(),s);assert.equal(actual.length,t.bytes);assert.equal(hash(actual),t.sha256);assert(t.target.endsWith('.txt'));}
for(const r of json('copied-dependencies.json')){const b=fs.readFileSync(join(repo,r.source));assert.deepEqual(b,fs.readFileSync(join(here,r.target)));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
for(const r of json('frozen-identities.json')){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
const materialization=json('materialization.proposed.json');assert.equal(materialization.length,22);assert.equal(materialization.filter(r=>r.mode==='exclusive-copy-after-approval').length,2);assert.equal(new Set(materialization.map(r=>r.destination)).size,22);
for(const r of materialization){const b=fs.readFileSync(join(repo,r.source));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);if(r.mode==='exclusive-copy-after-approval')assert(r.source.endsWith('.proposed.txt')); /* Current authorized copies checked by check-observation.mjs. */}
const pre=json('preflight-results.json');assert.equal(pre.status,'passed');assert.deepEqual(pre.errors,[]);assert.deepEqual(pre.before,pre.after);assert.deepEqual(pre.before,json('preflight-before.json'));assert.deepEqual(pre.after,json('preflight-after.json'));validateAliases(pre.before.aliasSnapshot,json('alias-policy.json'));assert.equal(pre.before.aliasSnapshot.groups.reduce((n,g)=>n+g.names.length,0),15);
for(const r of pre.after.absence)assert.equal(r.absent,true); // Historical preflight evidence only.
for(const k of ['processInvocations','utilityInvocations','recorderLaunches','addTypeCalls','reservations','materializations'])assert.equal(pre[k],0);
const tests=json('test-results.json');assert.equal(tests.status,'passed');assert.equal(tests.results.length,39);assert(tests.results.every(r=>r.passed));assert.equal(tests.enabledSourcesExecuted,false);
console.log(JSON.stringify({exactGateTransformations:4,materializationRows:22,exclusiveCopiesProposed:2,syntheticControls:39,readonlyPreflightPassed:true,aliasNames:15,historicalAbsenceEvidence:true,historicalEnabledProposalsTxtOnly:true,executionAuthorized:false,recorderLaunches:0,addTypeCalls:0,passed:true}));
