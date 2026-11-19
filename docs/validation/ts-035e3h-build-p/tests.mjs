import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join} from 'node:path';
import {preflight} from './preflight-model.mjs';
const here=import.meta.dirname,plan=JSON.parse(fs.readFileSync(join(here,'proposal.json'))),fixtures=JSON.parse(fs.readFileSync(join(here,'preflight-literals.json'))),observations=[];
const test=(name,fn)=>{fn();observations.push({name,status:'passed'});};
try{
 for(const f of fixtures)test(f.id,()=>assert.deepEqual(preflight(f.input,plan),f.expected));
 const source=fs.readFileSync(join(here,'preflight-model.mjs'),'utf8');
 const changes=[['argv-unchecked','remove-noconfig','if(!same(c.argv,plan.argv))','if(false)'],['system-policy-bypassed','actual-policy-unapproved','if(s.systemHardlinksApproved!==true)','if(false)'],['source-links-accepted','copy-hardlink',"if(r.kind!=='file'||r.alias!==false||r.nlink!==1)",'if(false)'],['bootstrap-hidden','hide-bootstrap-compilation','if(s.compilationActivities!==2||plan.limits.helperCompilerInvocations!==1||plan.limits.supervisorAddTypeCompilations!==1)','if(false)'],['gate-open-accepted','runtime-gate-removed','if(s.runtimeGateClosed!==true)','if(false)']];
 for(const [name,id,old,next] of changes){assert.equal(source.split(old).length-1,1);const mutant=await import('data:text/javascript;base64,'+Buffer.from(source.replace(old,next)).toString('base64')),f=fixtures.find(f=>f.id===id),actual=mutant.preflight(f.input,plan);test('mutant/'+name,()=>{let e;try{assert.deepEqual(actual,f.expected);}catch(err){e=err;}assert.equal(e?.code,'ERR_ASSERTION');});}
 fs.writeFileSync(process.argv[2],JSON.stringify({status:'passed',observations,fullStateLiterals:fixtures.length,mutants:changes.length,compilerInvocations:0,addTypeInvocations:0,generatedLaunches:0,executionAuthorized:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'passed',controls:observations.length,compilerInvocations:0}));
}catch(e){fs.writeFileSync(process.argv[2],JSON.stringify({status:'failed',observations,error:{name:e.name,message:e.message,actual:e.actual,expected:e.expected}},null,2)+'\n',{flag:'wx'});throw e;}
