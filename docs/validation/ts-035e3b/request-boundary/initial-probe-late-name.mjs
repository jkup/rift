import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,prior=resolve(here,'../../ts-035e3b-p'),out=mkdtempSync(join(here,'probe-'));
const read=n=>JSON.parse(readFileSync(join(prior,n))),save=(n,v)=>writeFileSync(join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const source=readFileSync(join(here,'proposals/script-observation.ts'),'utf8').replaceAll('\r\n','\n');
const begin='// BEGIN private positional conformance request construction.\n',end='// END private positional conformance request construction.\n';
const fragment=source.slice(source.indexOf(begin)+begin.length,source.indexOf(end));
assert.equal(fragment,readFileSync(join(here,'private-parser-fragment.ts'),'utf8'));
// Only the isolated pure extraction exposes private internals for literal checks.
// These exports are never added to a proposed production file.
const extracted=stripTypeScriptTypes(fragment+'\nexport {parseProducerArguments,prepareProducerRequest};\n');
writeFileSync(join(out,'private-extraction.mjs'),extracted,{flag:'wx'});
const api=await import(pathToFileURL(join(out,'private-extraction.mjs'))),positive=[],negative=[],shapeMapping=[],spoofs=[];
const rows=read('future-producer-literals.json').filter(r=>r.request.mode==='conformance');
for(const row of rows){
 assert.deepEqual(api.parseProducerArguments(row.argv),{...row.request,units:row.request.units.map(u=>({...u,text:''}))},row.id);
 assert.deepEqual(api.prepareProducerRequest(row.argv,row.request.units.map(u=>u.text)),row.request,row.id);
 assert.equal(api.validateConformanceScriptArguments(row.argv),undefined);
 positive.push({id:row.id,argv:row.argv,expected:row.request});
}
for(const row of read('argv-negatives.json')){assert.throws(()=>api.validateConformanceScriptArguments(row.argv),{message:row.error});negative.push(row);}
for(const row of read('run-URuHAc/request-shapes.json')){
 assert.throws(()=>api.validateConformanceScriptArguments(row.candidate),{message:'script-producer/arguments'});
 assert.throws(()=>api.prepareProducerRequest(row.candidate,[]),{message:'script-producer/arguments'});
 shapeMapping.push({section:row.section,operation:row.operation,key:row.key,oldError:row.error,newError:'script-producer/arguments',classification:'old object input API removed; record rejected as non-array, not validated field-by-field',candidate:row.candidate});
}
const raw=rows.find(r=>r.request.variant==='raw'),strict=rows.find(r=>r.request.variant==='strict');
const fake=Object.assign(Object.create(Array.prototype),{...raw.argv,length:raw.argv.length});
for(const [id,value] of [['record',raw.request],['empty-object',{}],['null',null],['array-prototype-spoof',fake],['array-of-record',[raw.request]],['sparse-array',new Array(raw.argv.length)]]){
 assert.throws(()=>api.validateConformanceScriptArguments(value),{message:'script-producer/arguments'});
 assert.throws(()=>api.prepareProducerRequest(value,[]),{message:'script-producer/arguments'});spoofs.push({id,expected:'script-producer/arguments'});
}
for(const [id,value] of [['source-record',raw.request],['source-object',{}],['source-null',null],['source-count',[]],['source-element',[{}]],['source-hole',[undefined]]]){
 assert.throws(()=>api.prepareProducerRequest(raw.argv,value),{message:'script-producer/source-texts'});spoofs.push({id,expected:'script-producer/source-texts'});
}
assert.throws(()=>api.prepareProducerRequest(strict.argv,strict.request.units.map(()=> '0;')),{message:'script-producer/strict-transform'});
spoofs.push({id:'strict-transform',expected:'script-producer/strict-transform'});
const decorated=[...raw.argv];decorated.request=raw.request;decorated.units=raw.request.units;decorated[Symbol('ignored')]=raw.request;
Object.defineProperty(decorated,'hidden',{value:raw.request});
assert.deepEqual(api.prepareProducerRequest(decorated,raw.request.units.map(u=>u.text)),raw.request);
// Explicit indexed-access contract: inherited array values are not own-key claims.
const inherited=[...raw.argv];delete inherited[0];const proto=Object.create(Array.prototype);proto[0]='conformance';Object.setPrototypeOf(inherited,proto);
assert.deepEqual(api.prepareProducerRequest(inherited,raw.request.units.map(u=>u.text)),raw.request);
const wires=read('future-wire-literals.json'),late=read('future-late-failures.json');
const wireMetadata=[];
for(const row of wires.filter(r=>r.request.mode==='conformance')){
 assert.deepEqual(api.prepareProducerRequest(row.argv,row.request.units.map(u=>u.text)),row.request,row.id);wireMetadata.push(row.id);
}
const lateMetadata=[];
for(const row of late){
 api.validateConformanceScriptArguments(row.argv);
 if(row.scenario==='strict-prefix-mismatch')assert.throws(()=>api.prepareProducerRequest(row.argv,row.request.units.map(u=>u.text)),{message:'script-producer/strict-transform'});
 lateMetadata.push({id:row.id,scenario:row.scenario,claim:'metadata validation only, no file reads or guest execution'});
}
save('results.json',{positive,negative,shapeMapping,spoofs,decoratedArrays:'extra own/symbol/nonenumerable properties ignored; indexed controls unchanged',inheritedArrayIndex:'accepted by indexed string-array contract, no own-index promise',wireMetadata,lateMetadata});
save('summary.json',{parserPositives:positive.length,argvNegatives:negative.length,removedObjectShapeMappings:shapeMapping.length,spoofAndSourceControls:spoofs.length,fullWireMetadata:wireMetadata.length,lateMetadata:lateMetadata.length,guestExecutions:0,childLaunches:0,nativeBuilds:0,fragmentSha256:createHash('sha256').update(fragment).digest('hex')});
console.log(JSON.stringify({out,parserPositives:positive.length,argvNegatives:negative.length,shapeMappings:shapeMapping.length,spoofs:spoofs.length,wireMetadata:wireMetadata.length,lateMetadata:lateMetadata.length}));
