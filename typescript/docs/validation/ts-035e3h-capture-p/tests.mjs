import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join} from 'node:path';
import {decode,review,LIMITS} from './format.mjs';
const here=import.meta.dirname,bytes=[...JSON.parse(fs.readFileSync(join(here,'byte-literals.json'))),...JSON.parse(fs.readFileSync(join(here,'additional-byte-literals.json')))],models=JSON.parse(fs.readFileSync(join(here,'model-literals.json'))),observations=[];
const test=(name,fn)=>{fn();observations.push({name,status:'passed'});};
try{
 for(const f of bytes)test('bytes/'+f.id,()=>assert.deepEqual(decode(Buffer.from(f.hex,'hex')),f.expected));
 for(const f of models)test('model/'+f.id,()=>assert.deepEqual(review(f.input),f.expected));
 test('non-buffer',()=>assert.deepEqual(decode(null),{kind:'rejected',code:'TYPE',offset:0}));
 test('literal-record-exact-cap',()=>assert.equal(bytes.find(f=>f.id==='exact-record-byte-cap').hex.length/2,LIMITS.recordBytes));
 const source=fs.readFileSync(join(here,'format.mjs'),'utf8');
 const mutants=[
  ['duplicates-hidden','duplicate-after-completion','if(entries.length>1)','if(false)'],
  ['single-entry-claimed-total','one-visible-is-not-one-total','totalAttempts:null','totalAttempts:1'],
  ['filename-unchecked','wrong-pid-in-filename',"if(name!==want+'-'+suffix)",'if(false)'],
  ['marker-length-unchecked','marker-length-mismatch','if(m.tail!==String(bytes))','if(false)'],
  ['cleanup-ignored','reported-but-active',"if(!state.cleanup.reported||state.cleanup.active!==0||!state.cleanup.pipesClosed)",'if(false)']
 ];
 for(const [name,id,old,next] of mutants){assert.equal(source.split(old).length-1,1);const mutated=await import('data:text/javascript;base64,'+Buffer.from(source.replace(old,next)).toString('base64'));const f=models.find(f=>f.id===id),actual=mutated.review(f.input);test('mutant/'+name,()=>{let caught;try{assert.deepEqual(actual,f.expected);}catch(e){caught=e;}assert.equal(caught?.code,'ERR_ASSERTION');});}
 const recorder=fs.readFileSync(join(here,'recorder.cs.txt'),'utf8');
 test('source-registration-before-arbitration',()=>assert(recorder.indexOf('stage=3;Publish(')<recorder.indexOf('stage=4;')));
 test('source-record-before-completion',()=>assert(recorder.indexOf('stage=6;Publish(')<recorder.indexOf('stage=7;Publish(')));
 test('source-no-normal-failure-return',()=>assert(recorder.includes('Failure(3);Hold();return;')&&recorder.includes('catch(Exception){Failure(255);}\n    Hold();')));
 test('source-code-unit-writes',()=>assert(recorder.includes('foreach(char u in s)w.Write((ushort)u)')));
 test('source-exclusive-flush-close',()=>assert(recorder.includes('FileMode.CreateNew,FileAccess.Write,FileShare.None')&&recorder.includes('f.Flush(true);')));
 fs.writeFileSync(process.argv[2],JSON.stringify({status:'passed',byteLiterals:bytes.length,modelLiterals:models.length,mutants:mutants.length,observations,recorderCompilations:0,recorderExecutions:0,limitations:'Synthetic JS checks and source-text checks do not validate C# compilation, Windows APIs, flush durability or process race behavior.'},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:'passed',controls:observations.length,byteLiterals:bytes.length,modelLiterals:models.length,mutants:mutants.length}));
}catch(e){fs.writeFileSync(process.argv[2],JSON.stringify({status:'failed',observations,error:{name:e.name,message:e.message,actual:e.actual,expected:e.expected}},null,2)+'\n',{flag:'wx'});throw e;}
