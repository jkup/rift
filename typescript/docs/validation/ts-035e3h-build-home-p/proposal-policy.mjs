import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,basename} from 'node:path';
import {hash} from './files.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),old=join(here,'../ts-035e3h-build-ready-p');
export function expectedSources(){
 const output={},read=n=>fs.readFileSync(join(old,n)),put=(n,b)=>output[n]=Buffer.from(b);
 const oldHome=JSON.stringify('\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3fp-link-info-observation\\home'),newHome=JSON.stringify('\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3h-recorder-build\\home');
 const replace=(b,a,z,count)=>{const s=b.toString();assert.equal(s.split(a).length-1,count);return s.replaceAll(a,z);};
 put('proposal.json',replace(fs.readFileSync(join(here,'../ts-035e3h-build-p/proposal.json')),oldHome,newHome,2));
 put('execution-config.json',replace(read('execution-config.json'),oldHome,newHome,1));
 put('supervise.ps1.proposed.txt',replace(read('supervise.ps1.proposed.txt'),hash(read('execution-config.json')),hash(output['execution-config.json']),1));
 for(const n of ['files.mjs','policy.mjs','runtime-support.mjs','alias-policy.json','output-policy.json','staging-policy.json','supervisor.cs.unchanged.txt','.gitattributes'])put(n,read(n));
 const bindings=JSON.parse(read('integration-bindings.json'));
 for(const r of bindings.files){if(r.path.includes('/ts-035e3h-build-ready-p/'))r.path=r.path.replace('/ts-035e3h-build-ready-p/','/ts-035e3h-build-home-p/');if(r.path==='typescript/docs/validation/ts-035e3h-build-p/proposal.json')r.path='typescript/docs/validation/ts-035e3h-build-home-p/proposal.json';const bytes=r.path.includes('/ts-035e3h-build-home-p/')?output[basename(r.path)]:fs.readFileSync(join(repo,r.path));assert(bytes);r.bytes=bytes.length;r.sha256=hash(bytes);}
 put('integration-bindings.json',JSON.stringify(bindings,null,2)+'\n');
 let runner=replace(read('runner.mjs.proposed.txt'),"'../ts-035e3h-build-p/proposal.json'","'proposal.json'",1);runner=replace(runner,hash(read('integration-bindings.json')),hash(output['integration-bindings.json']),1);put('runner.mjs.proposed.txt',runner);
 const inv=JSON.parse(read('invocation.proposed.json'));inv.materialization.source=join(here,'runner.mjs.proposed.txt');inv.materialization.destination=join(here,'runner.mjs');inv.materialization.sha256=hash(output['runner.mjs.proposed.txt']);inv.materialization.bytes=output['runner.mjs.proposed.txt'].length;inv.command.argv=[join(here,'runner.mjs')];inv.command.environment.HOMEPATH=JSON.parse(newHome);put('invocation.proposed.json',JSON.stringify(inv,null,2)+'\n');
 put('preflight.mjs',replace(read('preflight.mjs'),"'../ts-035e3h-build-p/proposal.json'","'proposal.json'",1));
 return output;
}
export function expectedSnapshot(){return Object.fromEntries(Object.entries(expectedSources()).map(([name,b])=>[name,b.toString('hex')]));}
export function actualSnapshot(){return Object.fromEntries(Object.keys(expectedSources()).map(name=>[name,fs.readFileSync(join(here,name)).toString('hex')]));}
export function validateSnapshot(actual){assert.deepEqual(actual,expectedSnapshot());return {exact:true,executionAuthorized:false};}
