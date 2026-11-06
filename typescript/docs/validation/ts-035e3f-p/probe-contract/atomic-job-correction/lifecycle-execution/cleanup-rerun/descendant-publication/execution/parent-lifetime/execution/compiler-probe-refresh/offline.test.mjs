// Inert data checks only: imported runner never enters run(). No child process.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {plan,inspectStatus,validateCompletedStatus} from './runner.mjs';
const here=import.meta.dirname,json=n=>JSON.parse(readFileSync(join(here,n)));
const contract=json('contract.json');assert.deepEqual(plan(contract),json('expected-plan.json'));assert.equal(Object.keys(contract.childEnvironment).length,21);
const literal=json('status-literals.json'),stdout=Buffer.from(literal.stdoutUtf8),stderr=Buffer.from(literal.stderrUtf8);
assert.deepEqual(inspectStatus(literal.completed),{kind:'supervisor-result',compilerInvocations:1,cleanupReported:true});validateCompletedStatus(literal.completed,stdout,stderr);
const mutants=[];
for(const key of Object.keys(literal.completed))mutants.push(['missing-'+key,s=>{delete s[key];}]);
for(const name of ['Stdout','Stderr'])for(const key of Object.keys(literal.completed[name]))mutants.push(['missing-'+name+'-'+key,s=>{delete s[name][key];}]);
for(const key of ['CreatedSuspended','Assigned','Resumed','JobListConfigured','MembershipVerified','CleanupConfirmed'])mutants.push(['false-'+key,s=>{s[key]=false;}]);
mutants.push(['extra-key',s=>{s.Extra=true;}],['nonzero-exit',s=>{s.NativeExitCode=7;}],['errors-retained',s=>{s.Errors=['original fault'];}],['wrong-stop',s=>{s.StopReason='timeout';}],['lost-event',s=>{s.Events.pop();}],['active-member',s=>{s.FinalActiveProcesses=1;}],['missing-pid',s=>{s.Pid=null;}],['signal',s=>{s.Signal='SIGTERM';}],['external-effects',s=>{s.ExternalEffects='none';}]);
for(const name of ['Stdout','Stderr'])mutants.push(['no-eof-'+name,s=>{s[name].Eof=false;}],['partial-'+name,s=>{s[name].Complete=false;}],['overflow-'+name,s=>{s[name].Overflow=true;}],['pipe-error-'+name,s=>{s[name].Error='original pipe fault';}],['wrong-hash-'+name,s=>{s[name].ObservedSha256='0'.repeat(64);}],['hash-array-'+name,s=>{s[name].ObservedSha256=[s[name].ObservedSha256];}],['wrong-count-'+name,s=>{s[name].ObservedBytes++;}],['null-pipe-'+name,s=>{s[name]=null;}]);
const rejected=[];for(const [name,mutate]of mutants){const s=structuredClone(literal.completed);mutate(s);assert.throws(()=>validateCompletedStatus(s,stdout,stderr),name);rejected.push(name);}
assert.throws(()=>validateCompletedStatus(literal.completed,Buffer.from('changed'),stderr));
assert.throws(()=>validateCompletedStatus(literal.completed,stdout,Buffer.from('changed')));
for(const s of literal.wrapperFaults){assert.deepEqual(inspectStatus(s),{kind:'wrapper-fault',compilerInvocations:s.Stage==='invoke'?null:0,cleanupReported:false});assert.throws(()=>validateCompletedStatus(s,stdout,stderr));}
const failed=structuredClone(literal.completed);failed.Outcome='failed-observation-stop-review';failed.Errors=['original termination error'];failed.MembershipVerified=false;failed.Resumed=false;failed.StopReason='supervisor-fault';
assert.deepEqual(inspectStatus(failed),{kind:'supervisor-result',compilerInvocations:1,cleanupReported:true});assert.throws(()=>validateCompletedStatus(failed,stdout,stderr));
const source=readFileSync(join(here,'supervisor.cs'),'utf8');
const fields=s=>[...s.matchAll(/public \S+ (\w+) \{get;set;\}/g)].map(m=>m[1]).sort();
assert.deepEqual(fields(source.slice(source.indexOf('public sealed class Result {'),source.indexOf('public static Result Run('))),Object.keys(literal.completed).sort());
assert.deepEqual(fields(source.slice(source.indexOf('public sealed class PipeEvidence {'),source.indexOf('sealed class Pump {'))),Object.keys(literal.completed.Stdout).sort());
const result={kind:'data-only-not-lifecycle',fullPlan:1,environmentKeys:21,resultSchemaFields:18,pipeSchemaFields:7,completedLiteral:1,rejectedStatusMutants:rejected,rejectedChangedStreams:2,wrapperFaultLiterals:3,failedWithCleanupRetained:1,sourceSchemaMatches:true,childProcesses:0,csharpCompilations:0,scriptcInvocations:0};
writeFileSync(join(here,'offline-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,rejectedStatusMutants:rejected.length}));
