import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {hash} from './files.mjs';
import {verifyBound,run} from './runner.mjs';
import {collect,stageInputs,checkStaged,readOutputs,reviewObservation} from './controller-pieces.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=n=>JSON.parse(fs.readFileSync(join(here,n))),root=fs.mkdtempSync(join(repo,'typescript/build/ts035e3h-runtime-more-')),results=[];
const test=(id,fn)=>{fn();results.push({id,passed:true});},reject=(id,fn)=>test(id,()=>assert.throws(fn));
const report={root,status:'incomplete',results,childExecutions:0};
try{
 await assert.rejects(run(),/INERT_RECORDER_ENTRY_GATE/);results.push({id:'entry-gate-before-bindings-and-import',passed:true});
 const b=fs.readFileSync(join(here,'runtime-bindings.json'));test('exact-runtime-binding-verification',()=>assert.equal(verifyBound(b,hash(b),repo),20));
 const src=join(root,'input.txt');fs.writeFileSync(src,'test bytes',{flag:'wx'});const row={path:relative(repo,src).replaceAll('\\','/'),bytes:10,sha256:hash(Buffer.from('test bytes'))},raw=Buffer.from(JSON.stringify([row]));
 test('binding-positive-fixture',()=>assert.equal(verifyBound(raw,hash(raw),repo),1));
 reject('missing-binding-row',()=>verifyBound(Buffer.from('[]'),hash(raw),repo));reject('extra-binding-row',()=>verifyBound(Buffer.from(JSON.stringify([row,row])),hash(raw),repo));
 reject('duplicate-manifest-entry',()=>{const x=Buffer.from(JSON.stringify([row,row]));verifyBound(x,hash(x),repo);});
 fs.appendFileSync(src,'x');reject('tampered-bound-input',()=>verifyBound(raw,hash(raw),repo));
 fs.renameSync(src,join(root,'retained-input.txt'));reject('missing-bound-input',()=>verifyBound(raw,hash(raw),repo));
 const source=join(root,'ordinary.txt');fs.writeFileSync(source,'ordinary',{flag:'wx'});const plan=json('proposal.json'),policy=json('output-policy.proposed.json'),copies=plan.copies.map(c=>({from:source,to:relative(plan.root,c.to).replaceAll('\\','/'),bytes:8,sha256:hash(Buffer.from('ordinary'))}));
 const state=stageInputs(join(root,'owned'),plan.freshDirectories,copies);fs.renameSync(join(state.root,copies[0].to),join(root,'retained-staged-input.txt'));reject('missing-private-staged-input',()=>checkStaged(state,policy,plan.freshDirectories));reject('missing-status-and-stream-files',()=>readOutputs(state.root));
 fs.writeFileSync(join(state.root,'capture/oversized-marker'),Buffer.alloc(33),{flag:'wx'});test('capture-file-cap',()=>assert.equal(collect(state.root,policy,plan.freshDirectories).complete,false));
 const positive=json('review-literals.json')[0];const make=()=>{const p=structuredClone(positive.input);p.streams=Object.fromEntries(Object.entries(p.streamHex).map(([k,v])=>[k,Buffer.from(v,'hex')]));delete p.streamHex;return p;};
 for(const f of json('status-literals.json'))test('status/'+f.id,()=>{const p=make();p.status=f.input;const actual=reviewObservation(p);if(f.expected.kind==='stop-hint-only')assert.deepEqual(actual,positive.expected);else assert.deepEqual(actual,{outcome:'refused-stop-review',phase:'status',detail:f.expected.code,totalAttempts:null,attemptCoverage:'unproven',authority:'none'});});
 test('consistent-creation-time-remains-variable',()=>{const p=make();for(const f of p.observation.files){const b=Buffer.from(f.hex,'hex');b.writeBigUInt64LE(10n,16);f.hex=b.toString('hex');if(f.name.startsWith('entry-'))f.name='entry-00000007-000000000000000a.bin';}assert.deepEqual(reviewObservation(p),{...positive.expected,observedIdentity:{pid:7,creationTime:'10'}});});
 const missing=make();missing.observation.files=[];test('zero-observable-entries-not-zero-attempts',()=>assert.deepEqual(reviewObservation(missing),{outcome:'refused-stop-review',phase:'publication',detail:'no-registered-attempt',totalAttempts:null,attemptCoverage:'unproven',authority:'none'}));
 report.status='passed';
}catch(e){report.status='failed';report.error={name:e.name,code:e.code??null,message:e.message,stack:e.stack};process.exitCode=1;}
finally{const inventory=[];function walk(p){const s=fs.lstatSync(p,{bigint:true}),r={path:p,dev:String(s.dev),ino:String(s.ino),nlink:String(s.nlink),kind:s.isDirectory()?'directory':'file'};assert(!s.isSymbolicLink());if(r.kind==='file'){const b=fs.readFileSync(p);r.bytes=b.length;r.sha256=hash(b);}inventory.push(r);if(s.isDirectory())for(const n of fs.readdirSync(p))walk(join(p,n));}walk(root);report.inventory=inventory;fs.writeFileSync(join(here,'additional-results.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
console.log(JSON.stringify({status:report.status,controls:results.length,error:report.error,childExecutions:0}));
