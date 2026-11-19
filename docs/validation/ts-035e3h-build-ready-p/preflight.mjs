// Authorized read-only metadata preflight. Never import or execute the proposed runner.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {openAttributes,observeAliases} from './runtime-support.mjs';
import {ordinary,readIdentity,hash} from './files.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=p=>JSON.parse(fs.readFileSync(p));
const save=(name,value)=>fs.writeFileSync(join(here,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const plan=json(join(here,'../ts-035e3h-build-p/proposal.json')),policy=json(join(here,'alias-policy.json')),config=json(join(here,'execution-config.json'));
const report={status:'incomplete',phases:[],errors:[],compilerInvocations:0,addTypeInvocations:0,reservations:0,stagingCalls:0,generatedLaunches:0};
save('preflight-started.json',{root:plan.root,utilityMaximum:12,retries:0,operation:'readonly identities and absence only'});
let native;
try{
 native=openAttributes();
 const absent=path=>{ordinary(dirname(path),true,native.get);let error;try{fs.lstatSync(path);}catch(e){error=e;}assert.equal(error?.code,'ENOENT','required absent: '+path);return {path,absent:true};};
 const absence=()=>[absent(plan.root),absent(join(here,'runner.mjs'))];
 const tools=()=>[plan.supervisorIdentity,plan.supervisor.powershellRuntimeConfig,plan.supervisor.roslynCSharp].map(r=>{const actual=readIdentity(r.path,r,native.get).identity;for(const k of ['dev','ino','nlink','bytes','sha256'])assert.equal(actual[k],r[k]);return actual;}).concat([readIdentity(plan.node.path,{bytes:100097864,sha256:plan.node.sha256},native.get,134217728).identity]);
 const baseline=json(join(here,'preservation.json')).rows;
 const pins=()=>[plan.source,...['typescript/package.json','typescript/package-lock.json'].map(p=>{const r=baseline.find(r=>r.path===p);assert(r);return r;})].map(r=>readIdentity(join(repo,r.path),r,native.get).identity);
 const dependencies=()=>json(join(here,'integration-bindings.json')).files.map(r=>readIdentity(join(repo,r.path),r,native.get).identity);
 function aliases(phase){const result=observeAliases(policy,native.get,here,config.childEnvironment);report.phases.push({phase,result});save('aliases-'+phase+'.json',result);for(let i=0;i<result.calls.length;i++)for(const stream of ['stdout','stderr'])fs.writeFileSync(join(here,`aliases-${phase}-${i}.${stream}.bin`),Buffer.from(result.calls[i][stream+'Hex'],'hex'),{flag:'wx'});assert.equal(result.error,null,phase+' aliases');return result.snapshot;}
 report.absenceBefore=absence();report.toolsBefore=tools();report.pinsBefore=pins();report.dependenciesBefore=dependencies();
 report.aliasesBefore=aliases('before');
 report.aliasesAfter=aliases('after');assert.deepEqual(report.aliasesAfter,report.aliasesBefore);
 report.toolsAfter=tools();assert.deepEqual(report.toolsAfter,report.toolsBefore);
 report.pinsAfter=pins();assert.deepEqual(report.pinsAfter,report.pinsBefore);
 report.dependenciesAfter=dependencies();assert.deepEqual(report.dependenciesAfter,report.dependenciesBefore);
 report.absenceAfter=absence();assert.deepEqual(report.absenceAfter,report.absenceBefore);
 report.runner={bytes:fs.statSync(join(here,'runner.mjs.proposed.txt')).size,sha256:hash(fs.readFileSync(join(here,'runner.mjs.proposed.txt')))};
 report.status='passed';
}catch(e){report.errors.push({name:e.name,code:e.code??null,message:e.message,stack:e.stack});report.status='blocked';process.exitCode=1;}
finally{try{native?.close();}catch(e){report.errors.push({name:e.name,message:e.message});report.status='blocked';process.exitCode=1;}save('preflight-results.json',report);}
console.log(JSON.stringify({status:report.status,utilityCalls:report.phases.reduce((n,p)=>n+p.result.calls.length,0),compilerInvocations:0,addTypeInvocations:0,errors:report.errors}));
