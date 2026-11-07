// One read-only metadata observation. No child process, root reservation, staging or enabled-source import.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {openAttributes,observeNamed} from './runtime-support.mjs';
import {validateAliases} from './policy.mjs';
import {ordinary,readIdentity,hash} from './files.mjs';
import {actualCandidate,validateCandidate,validateEnvironments} from './proposal-check.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=n=>JSON.parse(fs.readFileSync(join(here,n))),save=(n,v)=>fs.writeFileSync(join(here,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const report={status:'incomplete',errors:[],processInvocations:0,utilityInvocations:0,recorderLaunches:0,addTypeCalls:0,reservations:0,materializations:0};
save('preflight-started.json',{scope:'named accepted aliases/tools/frozen source identities and three absences only',retries:0});let native;
try{
 validateCandidate(actualCandidate());validateEnvironments(json('invocation.proposed.json').environment,json('execution-config.proposed.json').childEnvironment);
 for(const r of json('frozen-identities.json')){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
 native=openAttributes();const plan=json('proposal.json'),build=json('build-plan.json'),policy=json('alias-policy.json');
 const absence=()=>[plan.root,join(here,'runner.mjs'),join(here,'controller.mjs')].map(path=>{ordinary(dirname(path),true,native.get);let error;try{fs.lstatSync(path);}catch(e){error=e;}assert.equal(error?.code,'ENOENT',path);return {path,absent:true};});
 const observe=()=>{
  const aliasSnapshot={groups:policy.groups.map(g=>({named:g.named,names:g.names,records:g.names.map(p=>observeNamed(p,native.get))})),utility:observeNamed(policy.utility.path,native.get)};validateAliases(aliasSnapshot,policy);
  const tools=[build.supervisorIdentity,build.supervisor.powershellRuntimeConfig,build.supervisor.roslynCSharp].map(r=>{const actual=readIdentity(r.path,r,native.get).identity;for(const k of ['dev','ino','nlink','bytes','sha256'])assert.equal(actual[k],r[k]);return actual;});
  const node=readIdentity(build.node.path,{bytes:100097864,sha256:build.node.sha256},native.get,134217728).identity;const accepted=JSON.parse(fs.readFileSync(join(here,'../ts-035e3h-build-exec/invocation-result.json'))).nodeAfter;assert.deepEqual(node,accepted);tools.push(node);
  const inputs=json('identities.json').map(r=>readIdentity(join(repo,r.path),r,native.get).identity);
  const frozen=json('frozen-identities.json').map(r=>readIdentity(join(repo,r.path),r,native.get).identity);
  const baseline=json('preservation.json').rows;const pins=['typescript/package.json','typescript/package-lock.json'].map(path=>{const r=baseline.find(r=>r.path===path);assert(r);return readIdentity(join(repo,path),r,native.get).identity;});
  return {aliasSnapshot,tools,inputs,frozen,pins,absence:absence()};
 };
 report.before=observe();save('preflight-before.json',report.before);report.after=observe();save('preflight-after.json',report.after);assert.deepEqual(report.before,report.after);report.status='passed';
}catch(e){report.status='blocked';report.errors.push({name:e.name,code:e.code??null,message:e.message,stack:e.stack});process.exitCode=1;}
finally{try{native?.close();}catch(e){report.status='blocked';report.errors.push({name:e.name,message:e.message});process.exitCode=1;}save('preflight-results.json',report);}
console.log(JSON.stringify({status:report.status,errors:report.errors,utilityInvocations:0,recorderLaunches:0,addTypeCalls:0,materializations:0}));
