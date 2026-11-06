import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join} from 'node:path';
import {validateEnvironment,validateHome} from './home-policy.mjs';
import {actualSnapshot,validateSnapshot} from './proposal-policy.mjs';
const here=import.meta.dirname,literals=JSON.parse(fs.readFileSync(join(here,'environment-literals.json'))),results=[];
for(const f of literals.cases){let actual;try{actual=f.mode==='full'?validateEnvironment(f.root,f.env,literals.expectedEnvironment):validateHome(f.root,f.env);}catch(e){assert.equal(e.code,'ERR_ASSERTION',f.id);actual={rejected:true};}assert.deepEqual(actual,f.expected,f.id);results.push({id:f.id,passed:true});}
const positive=actualSnapshot();assert.deepEqual(validateSnapshot(positive),{exact:true,executionAuthorized:false});results.push({id:'exact-corrected-package',passed:true});
for(const name of Object.keys(positive)){const changed={...positive,[name]:positive[name]+'00'};assert.throws(()=>validateSnapshot(changed),{code:'ERR_ASSERTION'});results.push({id:'extra-byte-'+name,passed:true});}
for(const [id,mutate] of [['missing-source',p=>delete p['runner.mjs.proposed.txt']],['extra-source',p=>p.extra='00']]){const changed={...positive};mutate(changed);assert.throws(()=>validateSnapshot(changed),{code:'ERR_ASSERTION'});results.push({id,passed:true});}
fs.writeFileSync(join(here,'test-results.json'),JSON.stringify({status:'passed',results,environmentLiterals:literals.cases.length,sourceControls:results.length-literals.cases.length,proposedSourceExecuted:false,compilerInvocations:0,addTypeInvocations:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,controls:results.length,environmentLiterals:literals.cases.length,proposedSourceExecuted:false}));
