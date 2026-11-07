import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join} from 'node:path';
import {actualCandidate,validateCandidate,validateEnvironments} from './proposal-check.mjs';
const here=import.meta.dirname,json=n=>JSON.parse(fs.readFileSync(join(here,n))),results=[],candidate=actualCandidate();
assert.deepEqual(validateCandidate(candidate),{exact:true,executionAuthorized:false});results.push({id:'exact-four-gates-and-dependencies',passed:true});
for(const name of Object.keys(candidate)){const p={...candidate,[name]:candidate[name]+'00'};assert.throws(()=>validateCandidate(p),{code:'ERR_ASSERTION'});results.push({id:'tamper/'+name,passed:true});}
for(const [id,mutate] of [['missing-file',p=>delete p['controller.mjs.proposed.txt']],['extra-file',p=>p.extra='00']]){const p={...candidate};mutate(p);assert.throws(()=>validateCandidate(p),{code:'ERR_ASSERTION'});results.push({id,passed:true});}
const outer=json('invocation.proposed.json').environment,child=json('execution-config.proposed.json').childEnvironment;
assert.deepEqual(validateEnvironments(outer,child),{suppliedOuter:'exact',intendedChild:'exact',observedChild:'not-yet-observed',normalization:'none'});results.push({id:'full-outer-child-private-home',passed:true});
for(const side of ['outer','child'])for(const [id,mutate] of [['old-build-root',e=>e.HOMEPATH='\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3h-recorder-build\\home'],['old-observation-root',e=>e.HOMEPATH='\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3fp-link-info-observation\\home'],['wrong-drive',e=>e.HOMEDRIVE='D:'],['consistent-wrong-drive',e=>{e.HOMEDRIVE='D:';e.USERPROFILE='D:'+e.HOMEPATH;}],['surrogate-normalized',e=>e.RIFT_UNITS=e.RIFT_UNITS.replace('\ud800','\ufffd')],['missing-empty-variable',e=>delete e.RIFT_EMPTY],['extra-env',e=>e.EXTRA='1']]){const a=structuredClone(outer),b=structuredClone(child);mutate(side==='outer'?a:b);assert.throws(()=>validateEnvironments(a,b),{code:'ERR_ASSERTION'});results.push({id:side+'/'+id,passed:true});}
fs.writeFileSync(join(here,'test-results.json'),JSON.stringify({status:'passed',results,enabledSourcesExecuted:false,recorderLaunches:0,addTypeCalls:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({controls:results.length,passed:true,enabledSourcesExecuted:false}));
