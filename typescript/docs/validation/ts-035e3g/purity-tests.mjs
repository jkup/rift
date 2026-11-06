import assert from 'node:assert/strict';
import fs from 'node:fs';
import promises from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import {join} from 'node:path';
import {validateBindings} from './adapter.mjs';
import {BINDINGS,BINDING_LITERAL_TEXT} from './bindings.mjs';
const design=join(import.meta.dirname,'../ts-035e3g-p');
const bytes=fs.readFileSync(join(design,'ordered-inputs.json'));
const cases=JSON.parse(fs.readFileSync(join(design,'binding-cases.json')));
assert(Buffer.from(BINDING_LITERAL_TEXT,'utf8').equals(bytes));
assert.deepEqual(BINDINGS,JSON.parse(bytes));
assert(Object.isFrozen(BINDINGS)&&BINDINGS.every(Object.isFrozen));
assert.throws(()=>BINDINGS.push(BINDINGS[0]),TypeError);
assert.throws(()=>{BINDINGS[0].sha256='0'.repeat(64)},TypeError);
const controls=[{id:'null-before-any-io',candidate:null,expected:{kind:'binding-error',index:null,code:'ORDER'}},{id:'positive',candidate:cases.positive,expected:null},...cases.cases];
const calls=[],saved=[],results=[];
function replaceAll(target,label){for(const [name,descriptor]of Object.entries(Object.getOwnPropertyDescriptors(target))){if(typeof descriptor.value!=='function'||!descriptor.writable)continue;saved.push({target,name,descriptor});const stub=()=>{calls.push(label+'.'+name);throw Error('filesystem forbidden by pure validator contract');};if(typeof descriptor.value.native==='function')stub.native=()=>{calls.push(label+'.'+name+'.native');throw Error('native filesystem sentinel');};Object.defineProperty(target,name,{...descriptor,value:stub});}}
let failure;
try{
 replaceAll(fs,'fs');replaceAll(promises,'fs/promises');syncBuiltinESMExports();
 for(const c of controls){const before=calls.length,actual=validateBindings(c.candidate);assert.deepEqual(actual,c.expected,c.id);assert.equal(calls.length,before,c.id);results.push({id:c.id,actual,filesystemCalls:0});}
}catch(e){failure={name:e.name,message:e.message,stack:e.stack};}
finally{for(const {target,name,descriptor}of saved.reverse())Object.defineProperty(target,name,descriptor);syncBuiltinESMExports();}
const report={status:failure?'failed':'passed',embeddedExactBytes:true,frozenArrayAndRows:true,stubbedFilesystemFunctions:saved.length,controls:results,filesystemCalls:calls,realArchiveAdapterInvocations:0,...(failure?{failure}:{})};
fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(failure)throw Error(failure.message);
assert.equal(results.length,96);assert.deepEqual(calls,[]);console.log(JSON.stringify({publicControls:96,filesystemCalls:0,embeddedExactBytes:true,status:'passed'}));
