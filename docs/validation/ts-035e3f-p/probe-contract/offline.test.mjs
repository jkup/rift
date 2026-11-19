import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {plan} from './runner.mjs';
const here=import.meta.dirname,json=p=>JSON.parse(readFileSync(join(here,p))),c=json('contract.json'),expected=json('expected-plan.json');
const original=json('../probe-proposal.json');assert.deepEqual(c.argv,original.argv);assert.equal(c.timeoutMs,original.timeoutMs);assert.equal(c.streamCapBytes,original.stdoutBytes);assert.equal(c.streamCapBytes,original.stderrBytes);
const result=plan(c);assert.deepEqual(result,expected);
const out=mkdtempSync(join(here,'offline-')),source=readFileSync(join(here,'runner.mjs'),'utf8');
const rows=[];
const mutants=[
 ['omit-zig-lib',"const environment=Object.fromEntries(Object.entries(c.childEnvironment));","const environment=Object.fromEntries(Object.entries(c.childEnvironment)); delete environment.ZIG_LIB_DIR;"],
 ['substitute-path',"const environment=Object.fromEntries(Object.entries(c.childEnvironment));","const environment=Object.fromEntries(Object.entries(c.childEnvironment)); environment.PATH='other-tool';"],
 ['extra-node-option',"const environment=Object.fromEntries(Object.entries(c.childEnvironment));","const environment=Object.fromEntries(Object.entries(c.childEnvironment)); environment.NODE_OPTIONS='--inspect';"],
 ['drop-argv',"argv:[...c.argv],cwd:c.root","argv:c.argv.slice(1),cwd:c.root"],
 ['wrong-cwd',"argv:[...c.argv],cwd:c.root","argv:[...c.argv],cwd:c.sourceRoot"],
 ['two-invocations',"supervisorWatchdogMs:c.supervisorWatchdogMs,maxCompilerInvocations:1","supervisorWatchdogMs:c.supervisorWatchdogMs,maxCompilerInvocations:2"],
 ['long-timeout',"timeoutMs:c.timeoutMs,streamCapBytes:c.streamCapBytes","timeoutMs:c.timeoutMs+1,streamCapBytes:c.streamCapBytes"],
 ['wrong-compiler',"compiler:join(c.root,'node_modules/scriptc/bin/scriptc.exe')","compiler:join(c.root,'node_modules/scriptc/bin/other.exe')"]
];
try {
 for(const [id,from,to] of mutants){assert.equal(source.split(from).length,2,id);const path=join(out,id+'.mjs');writeFileSync(path,source.replace(from,to),{flag:'wx'});
   const mutant=await import(pathToFileURL(path));const actual=mutant.plan(c); // Any import/call exception fails the test, never counts as rejection.
   let rejected=false;try{assert.deepEqual(actual,expected);}catch(e){if(e.code!=='ERR_ASSERTION')throw e;rejected=true;}assert(rejected,id);
   rows.push({id,completed:true,rejectedBy:'independent-whole-plan-literal',actual});
 }
 const lifecycle=json('lifecycle-literals.json');assert.equal(lifecycle.length,8);assert(lifecycle.every(r=>r.expected.authority==='none'));
 // Source inspection only. These assertions do not exercise or compile Win32.
 const cs=readFileSync(join(here,'supervisor.cs'),'utf8');
 assert(cs.indexOf('Need(AssignProcessToJobObject(job,pi.Process)')<cs.indexOf('Need(ResumeThread(pi.Thread)'));
 for(const text of ['limits.Basic.Flags=0x2000','0x08080404','TerminateJobObject(job,0xe0350001)','active==0&&pipes','FileMode.CreateNew','ObservedBytes>cap','cleanup-unconfirmed'])assert(cs.includes(text),text);
 const summary={kind:'offline-plan-only-not-supervisor-feasibility',wholePlanLiterals:1,environmentKeys:Object.keys(expected.environment).length,completedPlanMutants:rows.length,lifecycleDesignCases:8,compilerInvocations:0,supervisorInvocations:0,actualPlan:result,mutants:rows};
 writeFileSync(join(out,'results.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,wholePlanLiterals:1,completedPlanMutants:rows.length,compilerInvocations:0}));
}catch(e){writeFileSync(join(out,'failure.json'),JSON.stringify({rows,error:{name:e.name,code:e.code,message:e.message,stack:e.stack}},null,2)+'\n',{flag:'wx'});throw e;}
