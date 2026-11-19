import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,basename} from 'node:path';
import {hash} from './files.mjs';
import {validateEnvironment} from '../ts-035e3h-build-home-p/home-policy.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),old='typescript/docs/validation/ts-035e3h-runtime-inert',prefix='typescript/docs/validation/ts-035e3h-runtime-ready-p';
const read=n=>fs.readFileSync(join(repo,old,n)),json=b=>JSON.parse(b),encode=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
export function expectedFiles(){
 const files={},put=(n,b)=>files[n]=Buffer.from(b),replace=(b,a,z)=>{const s=b.toString();assert.equal(s.split(a).length-1,1);return s.replace(a,z);};
 const oldBindings=json(read('runtime-bindings.json'));
 for(const r of oldBindings)if(r.path.startsWith(old+'/'))put(basename(r.path),fs.readFileSync(join(repo,r.path)));
 delete files['controller.mjs'];
 put('controller.mjs.proposed.txt',replace(read('controller.mjs'),'export const RUN_ENABLED=false;','export const RUN_ENABLED=true;'));
 put('supervisor.cs.proposed.txt',replace(read('supervisor.cs.proposed.txt'),'const bool CaptureRuntimeEnabled = false;','const bool CaptureRuntimeEnabled = true;'));
 put('supervise.ps1.proposed.txt',replace(read('supervise.ps1.proposed.txt'),"throw 'DESIGN_ONLY_RECORDER_RUNTIME_GATE'\n",''));
 const identities=json(read('identities.json'));
 for(const r of identities)if(['execution-config.proposed.json','supervisor.cs.proposed.txt','supervise.ps1.proposed.txt'].includes(r.role)){r.path=prefix+'/'+r.role;r.bytes=files[r.role].length;r.sha256=hash(files[r.role]);}put('identities.json',encode(identities));
 const bindings=structuredClone(oldBindings);for(const r of bindings)if(r.path.startsWith(old+'/')){r.path=r.path.replace(old+'/',prefix+'/');const name=basename(r.path),b=files[name==='controller.mjs'?'controller.mjs.proposed.txt':name];r.bytes=b.length;r.sha256=hash(b);}put('runtime-bindings.json',encode(bindings));
 put('runner.mjs.proposed.txt',replace(replace(read('runner.mjs'),'export const RUN_ENABLED=false;','export const RUN_ENABLED=true;'),hash(read('runtime-bindings.json')),hash(files['runtime-bindings.json'])));
 const inv=json(read('invocation.proposed.json'));inv.argv=[join(here,'runner.mjs')];inv.gates={entry:'true in inert txt only',controller:'true in inert txt only',supervisor:'true in inert txt only',wrapper:'throw removed in inert txt only'};inv.reviewRequired='actual/root/second review of exact hashes before separate recorder runtime approval; previous helper approval consumed';put('invocation.proposed.json',encode(inv));
 const materialization=bindings.map(r=>({source:r.path.endsWith('/controller.mjs')?r.path+'.proposed.txt':r.path,destination:r.path,mode:r.path.endsWith('/controller.mjs')?'exclusive-copy-after-approval':r.path.startsWith(prefix+'/')?'verify-existing-dependency':'verify-readonly-external',bytes:r.bytes,sha256:r.sha256}));
 for(const name of ['runner.mjs','runtime-bindings.json']){const source=prefix+'/'+(name==='runner.mjs'?name+'.proposed.txt':name),b=files[basename(source)];materialization.push({source,destination:prefix+'/'+name,mode:name==='runner.mjs'?'exclusive-copy-after-approval':'verify-existing-dependency',bytes:b.length,sha256:hash(b)});}put('materialization.proposed.json',encode(materialization));
 return files;
}
export function actualCandidate(){return Object.fromEntries(Object.keys(expectedFiles()).map(n=>[n,fs.readFileSync(join(here,n)).toString('hex')]));}
export function validateCandidate(candidate){assert.deepEqual(candidate,Object.fromEntries(Object.entries(expectedFiles()).map(([k,b])=>[k,b.toString('hex')])));return {exact:true,executionAuthorized:false};}
export function validateEnvironments(outer,child){const oracle=json(read('smoke-oracle.json'));assert.equal(Object.keys(outer).length,19);assert.equal(Object.keys(child).length,19);validateEnvironment(oracle.root,outer,oracle.environment);validateEnvironment(oracle.root,child,oracle.environment);return {suppliedOuter:'exact',intendedChild:'exact',observedChild:'not-yet-observed',normalization:'none'};}
