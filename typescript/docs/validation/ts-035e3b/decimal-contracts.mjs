import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const here=resolve(import.meta.dirname,'decimal-proposal'),root=resolve(import.meta.dirname,'../../..'),proposal=resolve(import.meta.dirname,'../ts-035e3b-p');
const candidate=await import(pathToFileURL(resolve(here,'script-producer-request.ts')));
const original=await import(pathToFileURL(resolve(root,'src/script-producer-request.ts')));
const decimal=await import(pathToFileURL(resolve(here,'decimal.ts')));
const read=n=>JSON.parse(readFileSync(resolve(proposal,n)));
const rows=JSON.parse(readFileSync(resolve(here,'decimal-literals.json')));
for(const row of rows){let actual;try{actual='value:'+decimal.decimal(row.text);}catch(e){actual='error:'+e.message;}assert.equal(actual,row.expected,row.id);}
const positive=read('future-producer-literals.json').filter(r=>r.request.mode==='conformance'),negative=read('argv-negatives.json'),shapes=read('run-URuHAc/request-shapes.json');
for(const r of positive){assert.deepEqual(candidate.parseScriptProducerArguments(r.argv),original.parseScriptProducerArguments(r.argv));candidate.validateScriptProducerRequest(r.request);}
for(const r of negative)assert.throws(()=>candidate.parseScriptProducerArguments(r.argv),{message:r.error});
for(const r of shapes)assert.throws(()=>candidate.validateScriptProducerRequest(r.candidate),{message:r.error});
// Full parser controls: all decimal fields retain their original left-to-right
// priority over unit metadata, and safe numeric wrong constants remain later.
const raw=positive.find(r=>r.request.variant==='raw'),compound=[];
for(let field=7;field<=13;field++)for(const text of ['','-1','9007199254740992','1x']){
 const argv=[...raw.argv];argv[field]=text;argv[15]='invalid-role';
 assert.throws(()=>candidate.parseScriptProducerArguments(argv),{message:'script-producer/limit'});
 assert.throws(()=>original.parseScriptProducerArguments(argv),{message:'script-producer/limit'});
 compound.push({field,text,argv,expected:'script-producer/limit'});
}
const contracts=[];
for(const [name,edit,error] of [
 ['own-extra',r=>{r.extra=true;},'script-producer/fields'],
 ['missing-and-extra',r=>{delete r.mode;r.extra=true;},'script-producer/fields'],
 ['inherited-required',r=>{delete r.mode;Object.setPrototypeOf(r,{mode:'conformance'});},'script-producer/fields'],
 ['inherited-extra',r=>{Object.setPrototypeOf(r,{extra:true});},null],
 ['nonenumerable-required',r=>{Object.defineProperty(r,'mode',{enumerable:false});},'script-producer/fields'],
 ['nonenumerable-extra',r=>{Object.defineProperty(r,'extra',{value:true,enumerable:false});},null],
 ['symbol-extra',r=>{r[Symbol('extra')]=true;},null],
 ['null-prototype',r=>{Object.setPrototypeOf(r,null);},null],
 ['reordered-keys',r=>{const mode=r.mode;delete r.mode;r.mode=mode;},null],
 ]){
 for(const module of [original,candidate]){const r=structuredClone(raw.request);edit(r);if(error)assert.throws(()=>module.validateScriptProducerRequest(r),{message:error});else module.validateScriptProducerRequest(r);}
 contracts.push({name,error,scope:'Node ordinary data; no native key-enumeration claim'});
}
const coverage=[];
for(const [name,path] of [['original',resolve(root,'src/script-producer-request.ts')],['decimal-only-proposal',resolve(here,'script-producer-request.ts')]]){
 const args=['coverage',path,'--explain-dynamic'];const p=spawnSync(resolve(root,'node_modules/scriptc/bin/scriptc.exe'),args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8e6});
 coverage.push({name,args,status:p.status,signal:p.signal,error:p.error?.message??null,stdout:p.stdout,stderr:p.stderr});
}
writeFileSync(resolve(here,'contracts.json'),JSON.stringify({decimal:rows.length,positive:positive.length,negative:negative.length,shapes:shapes.length,compound,contracts,coverage},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({decimal:rows.length,positive:positive.length,negative:negative.length,shapes:shapes.length,compound:compound.length,contracts:contracts.length,coverage}));
