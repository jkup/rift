import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join} from 'node:path';
import {actualProposal,validateProposal} from './check-proposal.mjs';
const here=import.meta.dirname,positive=actualProposal(),results=[];
assert.deepEqual(validateProposal(positive),{accepted:true,authority:'none'});results.push({id:'exact-proposal',passed:true});
const cases=[
 ['gate-left-closed',p=>p.runner=p.runner.replace('RUN_ENABLED=true','RUN_ENABLED=false')],
 ['extra-runner-change',p=>p.runner+='\n// unapproved\n'],
 ['removed-gate-assertion',p=>p.runner=p.runner.replace("assert(RUN_ENABLED,'DESIGN_ONLY_RUN_GATE');",'')],
 ['extra-generated-launch',p=>p.runner+='\nspawn("generated.exe",[]);\n'],
 ['wrong-bindings',p=>p.bindings+=' '],
 ['dependency-byte-drift',p=>p.dependencies[0].hex+='00'],
 ['missing-dependency',p=>p.dependencies.pop()],
 ['extra-dependency',p=>p.dependencies.push({path:'extra',hex:''})],
 ['redirected-dependency',p=>p.dependencies[0].path+='x'],
 ['wrong-node',p=>p.command.executable+='x'],
 ['wrong-runner-path',p=>p.command.argv[0]+='x'],
 ['extra-argument',p=>p.command.argv.push('--extra')],
 ['wrong-cwd',p=>p.command.cwd+='x'],
 ['changed-environment',p=>p.command.environment.PATH+='x'],
 ['extra-environment',p=>p.command.environment.EXTRA='1'],
 ['missing-environment',p=>delete p.command.environment.TEMP],
 ['extra-helper-budget',p=>p.budgets.helperCompilerMaximum=2],
 ['extra-bootstrap-budget',p=>p.budgets.supervisorAddTypeMaximum=2],
 ['output-launch-budget',p=>p.budgets.generatedOutputLaunches=1],
 ['retry-budget',p=>p.budgets.retries=1],
 ['unexpected-field',p=>p.extra=true]
];
for(const [id,mutate] of cases){const p=structuredClone(positive);mutate(p);assert.notDeepEqual(p,positive,id+' effective mutation');let error;try{validateProposal(p);}catch(e){error=e;}assert.equal(error?.code,'ERR_ASSERTION',id);results.push({id,passed:true});}
fs.writeFileSync(join(here,'test-results.json'),JSON.stringify({status:'passed',results,proposedSourceExecuted:false,compilerInvocations:0,addTypeInvocations:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({controls:results.length,passed:true,proposedSourceExecuted:false}));
