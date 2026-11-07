import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {hash} from '../../ts-035e3h-build-ready-p/files.mjs';
import {validateAliases} from '../../ts-035e3h-build-ready-p/policy.mjs';
import {parseAliasList} from '../../ts-035e3h-build-ready-p/runtime-support.mjs';
import {actualProposal,validateProposal} from '../../ts-035e3h-build-ready-p/check-proposal.mjs';
const here=resolve(resolve(resolve(resolve(import.meta.dirname,'../../ts-035e3h-runtime-inert/_preserve'),'../../ts-035e3h-runtime-p/_preserve'),'../../ts-035e3h-build-exec/_preserve'),'../../ts-035e3h-build-ready-p'),repo=resolve(here,'../../../..'),old=join(here,'../ts-035e3h-build-integration-p'),json=n=>JSON.parse(fs.readFileSync(join(here,n)));
validateProposal(actualProposal());
const bindings=json('integration-bindings.json'),copies=json('copied-dependencies.json'),oldBindings=JSON.parse(fs.readFileSync(join(old,'integration-bindings.json')));
assert.deepEqual(copies,oldBindings.files.filter(r=>r.path.includes('/ts-035e3h-build-integration-p/')).map(r=>({from:r.path,to:r.path.replace('ts-035e3h-build-integration-p/','ts-035e3h-build-ready-p/'),bytes:r.bytes,sha256:r.sha256})));
for(const r of bindings.files){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
for(const r of json('source-identities.json')){const b=fs.readFileSync(join(here,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
const t=json('runner-transformation.json'),source=fs.readFileSync(join(repo,t.source));assert.equal(source.length,t.sourceBytes);assert.equal(hash(source),t.sourceSha256);let expected=source.toString();assert.equal(t.replacements.length,2);for(const r of t.replacements){assert.equal(expected.split(r.old).length-1,r.count);assert.equal(r.count,1);expected=expected.replace(r.old,r.next);}const runner=fs.readFileSync(join(here,t.target));assert.equal(runner.toString(),expected);assert.equal(runner.length,t.bytes);assert.equal(hash(runner),t.sha256);
const invocation=json('invocation.proposed.json');assert.equal(invocation.authorized,false);assert.deepEqual(invocation.materialization,{source:join(here,'runner.mjs.proposed.txt'),destination:join(here,'runner.mjs'),mode:'exclusive-byte-copy-after-review',sha256:t.sha256,bytes:t.bytes});assert.equal(Object.keys(invocation.command.environment).length,16);
const p=json('preflight-results.json'),policy=json('alias-policy.json');assert.equal(p.status,'passed');assert.deepEqual(p.errors,[]);assert.equal(p.phases.length,2);
for(const name of ['aliases','tools','pins','dependencies','absence'])assert.deepEqual(p[name+'Before'],p[name+'After']);validateAliases(p.aliasesBefore,policy);assert.equal(p.aliasesBefore.groups.reduce((n,g)=>n+g.names.length,0),15);
for(const phase of p.phases){assert.deepEqual(phase.result,json('aliases-'+phase.phase+'.json'));assert.equal(phase.result.error,null);assert.equal(phase.result.calls.length,6);validateAliases(phase.result.snapshot,policy);for(let i=0;i<6;i++){const c=phase.result.calls[i];assert.equal(c.executable,policy.utility.path);assert.deepEqual(c.argv,['hardlink','list',policy.groups[i].named]);assert.equal(c.exit,0);assert.equal(c.signal,null);assert.equal(c.error,null);assert.equal(c.stderrHex,'');for(const stream of ['stdout','stderr']){const b=fs.readFileSync(join(here,`aliases-${phase.phase}-${i}.${stream}.bin`));assert.equal(b.toString('hex'),c[stream+'Hex']);if(stream==='stdout')assert.deepEqual(parseAliasList(b,policy.groups[i].named),policy.groups[i].names);}}}
for(const r of p.absenceAfter)assert.equal(r.absent,true); // Historical absence evidence; current runtime inventory is checked by check-runtime.mjs.
assert.deepEqual(p.runner,{bytes:t.bytes,sha256:t.sha256});for(const k of ['compilerInvocations','addTypeInvocations','reservations','stagingCalls','generatedLaunches'])assert.equal(p[k],0);
const tests=json('test-results.json');assert.equal(tests.status,'passed');assert.equal(tests.results.length,22);assert(tests.results.every(r=>r.passed));assert.equal(tests.proposedSourceExecuted,false);
const syntax=json('syntax-results.json');assert.equal(syntax.exit,0);assert.equal(syntax.sourceExecuted,false);assert.equal(syntax.sha256,t.sha256);
console.log(JSON.stringify({inertGateEnabledProposal:true,exactChanges:2,copiedDependencies:9,syntheticControls:22,readonlyPreflight:'passed',utilityCalls:12,aliasNames:15,historicalAbsenceEvidence:true,compilerInvocations:0,addTypeInvocations:0,executionAuthorized:false,passed:true}));
