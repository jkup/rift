import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {validateAliases} from '../../ts-035e3h-build-home-p/policy.mjs';
import {parseAliasList} from '../../ts-035e3h-build-home-p/runtime-support.mjs';
await import('../../ts-035e3h-build-home-p/check-freeze.mjs');
const here=resolve(resolve(resolve(resolve(resolve(resolve(resolve(import.meta.dirname,'../../ts-035e3h-unicode-p/_preserve'),'../../ts-035e3h-runtime-exec/_preserve'),'../../ts-035e3h-runtime-ready-p/_preserve'),'../../ts-035e3h-runtime-inert/_preserve'),'../../ts-035e3h-runtime-p/_preserve'),'../../ts-035e3h-build-exec/_preserve'),'../../ts-035e3h-build-home-p'),json=n=>JSON.parse(fs.readFileSync(join(here,n))),t=json('source-transformations.json').find(r=>r.target==='runner.mjs.proposed.txt');
const p=json('preflight-results.json'),policy=json('alias-policy.json');assert.equal(p.status,'passed');assert.deepEqual(p.errors,[]);assert.equal(p.phases.length,2);
for(const name of ['aliases','tools','pins','dependencies','absence'])assert.deepEqual(p[name+'Before'],p[name+'After']);validateAliases(p.aliasesBefore,policy);assert.equal(p.aliasesBefore.groups.reduce((n,g)=>n+g.names.length,0),15);
for(const phase of p.phases){assert.deepEqual(phase.result,json('aliases-'+phase.phase+'.json'));assert.equal(phase.result.error,null);assert.equal(phase.result.calls.length,6);validateAliases(phase.result.snapshot,policy);for(let i=0;i<6;i++){const c=phase.result.calls[i];assert.equal(c.executable,policy.utility.path);assert.deepEqual(c.argv,['hardlink','list',policy.groups[i].named]);assert.equal(c.exit,0);assert.equal(c.signal,null);assert.equal(c.error,null);assert.equal(c.stderrHex,'');for(const stream of ['stdout','stderr']){const b=fs.readFileSync(join(here,`aliases-${phase.phase}-${i}.${stream}.bin`));assert.equal(b.toString('hex'),c[stream+'Hex']);if(stream==='stdout')assert.deepEqual(parseAliasList(b,policy.groups[i].named),policy.groups[i].names);}}}
for(const r of p.absenceAfter)assert.equal(r.absent,true); // Historical absence evidence; current runtime inventory is checked by check-runtime.mjs.
assert.deepEqual(p.runner,{bytes:t.bytes,sha256:t.sha256});for(const k of ['compilerInvocations','addTypeInvocations','reservations','stagingCalls','generatedLaunches'])assert.equal(p[k],0);
const tests=json('test-results.json');assert.equal(tests.status,'passed');assert.equal(tests.results.length,66);assert(tests.results.every(r=>r.passed));assert.equal(tests.proposedSourceExecuted,false);
const syntax=json('syntax-results.json');assert.equal(syntax.exit,0);assert.equal(syntax.sourceExecuted,false);assert.equal(syntax.sha256,t.sha256);
console.log(JSON.stringify({inertHomeCorrection:true,semanticHomeControls:48,syntheticControls:66,readonlyPreflight:'passed',utilityCalls:12,aliasNames:15,historicalAbsenceEvidence:true,compilerInvocations:0,addTypeInvocations:0,executionAuthorized:false,passed:true}));
