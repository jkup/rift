import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {hash} from './files.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),old=join(here,'../ts-035e3h-build-integration-p'),json=p=>JSON.parse(fs.readFileSync(p));
export function expectedProposal(){
 const original=fs.readFileSync(join(old,'runner.mjs.proposed.txt'),'utf8'),bindings=json(join(old,'integration-bindings.json'));
 for(const r of bindings.files)if(r.path.startsWith('typescript/docs/validation/ts-035e3h-build-integration-p/'))r.path=r.path.replace('ts-035e3h-build-integration-p/','ts-035e3h-build-ready-p/');
 const bindingText=JSON.stringify(bindings,null,2)+'\n';
 let runner=original;for(const [a,b] of [['const RUN_ENABLED=false;','const RUN_ENABLED=true;'],[hash(fs.readFileSync(join(old,'integration-bindings.json'))),hash(bindingText)]]){assert.equal(runner.split(a).length-1,1);runner=runner.replace(a,b);}
 const plan=json(join(here,'../ts-035e3h-build-p/proposal.json'));
 return {runner,bindings:bindingText,dependencies:json(join(here,'copied-dependencies.json')).map(r=>({path:r.to,hex:fs.readFileSync(join(repo,r.from)).toString('hex')})),command:{executable:plan.node.path,argv:[join(here,'runner.mjs')],cwd:repo,environment:plan.childEnvironment},budgets:{helperCompilerMaximum:1,supervisorAddTypeMaximum:1,generatedOutputLaunches:0,retries:0}};
}
export function validateProposal(actual){assert.deepEqual(actual,expectedProposal());return {accepted:true,authority:'none'};}
export function actualProposal(){const invocation=json(join(here,'invocation.proposed.json'));return {runner:fs.readFileSync(join(here,'runner.mjs.proposed.txt'),'utf8'),bindings:fs.readFileSync(join(here,'integration-bindings.json'),'utf8'),dependencies:json(join(here,'copied-dependencies.json')).map(r=>({path:r.to,hex:fs.readFileSync(join(repo,r.to)).toString('hex')})),command:invocation.command,budgets:Object.fromEntries(['helperCompilerMaximum','supervisorAddTypeMaximum','generatedOutputLaunches','retries'].map(k=>[k,invocation[k]]))};}
