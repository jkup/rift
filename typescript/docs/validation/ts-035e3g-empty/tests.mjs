import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {inspectCoff,sha256,LIMITS} from './reader.mjs';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {validateBindings} from './adapter.mjs'; // Never invoke inventoryBoundArchive.
import {collect,checkBindings,nextBudget,EMPTY_BYTES,BATCH_LIMIT,ArchiveFault} from './_internal/archive-core.mjs';
import {readOrdinary} from './_internal/files.mjs';
const here=import.meta.dirname,design=resolve(here,'../ts-035e3g-p'),correction=join(design,'correction-1');
const json=p=>JSON.parse(fs.readFileSync(p)),emptyDesign=resolve(here,'../ts-035e3g-empty-p'),fixtures=[...json(join(emptyDesign,'fixtures.v2.json')).cases,...json(join(emptyDesign,'empty-fixtures.json')).cases];
const schema=json(join(correction,'output-schema.json'));
function valid(v,s){
 if(s.$ref)return valid(v,schema.$defs[s.$ref.split('/').at(-1)]);
 if(s.oneOf)return s.oneOf.filter(x=>valid(v,x)).length===1;
 if(s.anyOf)return s.anyOf.some(x=>valid(v,x));
 if('const'in s&&v!==s.const)return false;if(s.enum&&!s.enum.includes(v))return false;
 if(s.type==='null')return v===null;if(s.type==='boolean')return typeof v==='boolean';
 if(s.type==='integer')return Number.isInteger(v)&&v>=s.minimum&&v<=s.maximum;
 if(s.type==='string')return typeof v==='string'&&(!s.pattern||new RegExp(s.pattern).test(v))&&(s.minLength===undefined||v.length>=s.minLength)&&(s.maxLength===undefined||v.length<=s.maxLength);
 if(s.type==='array')return Array.isArray(v)&&(s.minItems===undefined||v.length>=s.minItems)&&(s.maxItems===undefined||v.length<=s.maxItems)&&v.every(x=>valid(x,s.items));
 if(s.type==='object')return v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===s.required.length&&s.required.every(k=>Object.hasOwn(v,k)&&valid(v[k],s.properties[k]));return true;
}
const observations=[];const test=(name,fn)=>{try{fn();observations.push({name,status:'passed'});}catch(e){observations.push({name,status:'failed',error:{name:e.name,message:e.message,stack:e.stack,actual:e.actual,expected:e.expected}});throw e;}};
function run(){
 for(const f of fixtures)test('literal/'+f.id,()=>{const b=Buffer.from(f.bytesHex,'hex'),copy=Buffer.from(b),r=inspectCoff(b);assert.deepEqual(r,f.expected);assert(b.equals(copy));assert(valid(r,schema));});
 const detached=new ArrayBuffer(1);structuredClone(detached,{transfer:[detached]});
 // Create the view before detaching, otherwise the constructor itself throws.
 const detachedBacking=new ArrayBuffer(1),detachedView=new Uint8Array(detachedBacking);structuredClone(detachedBacking,{transfer:[detachedBacking]});
 const domainValues=[null,[],new DataView(new ArrayBuffer(1)),new Uint16Array(1),new Uint8Array(new SharedArrayBuffer(1)),new Uint8Array(new ArrayBuffer(1,{maxByteLength:2})),detachedView,new Uint8Array(LIMITS.inputBytes+1)];
 json(join(design,'input-domain-cases.json')).cases.forEach((c,i)=>test('domain/'+i,()=>assert.deepEqual(inspectCoff(domainValues[i]),c.expected)));
 const bindings=json(join(design,'binding-cases.json'));
 test('binding/positive',()=>assert.equal(validateBindings(bindings.positive),null));
 for(const c of bindings.cases)test('binding/'+c.id,()=>assert.deepEqual(validateBindings(c.candidate),c.expected));
 // A real schema checker must reject malformed output beyond equality to a fixture.
 const full=fixtures.find(f=>f.id==='symbols-aux-directive-relocation'),fullBytes=Buffer.from(full.bytesHex,'hex');
 for(const mutation of [r=>r.extra=1,r=>r.header.machine='34404',r=>r.symbols[0].auxiliary[0].hex='00',r=>r.sections[0].name.bytesHex='zz',r=>delete r.fltused])test('schema/'+observations.length,()=>{const r=structuredClone(full.expected);mutation(r);assert(!valid(r,schema));});
 const minimal=Buffer.from(fixtures[0].bytesHex,'hex');
 const make=()=>{
  const digest=sha256(minimal),compressed=gzipSync(minimal);
  const expected=Array.from({length:42},(_,index)=>({index,role:index===41?'program':'runtime',path:'synthetic/'+index,absolute:'C:\\synthetic\\'+index,bytes:minimal.length,sha256:digest}));
  const rows=expected.map(r=>({path:r.path,bytes:r.bytes,sha256:r.sha256,chunks:[digest]}));
  const pins=new Map([[digest,{bytes:compressed.length,sha256:sha256(compressed)}]]),chunks=new Map([[digest,compressed]]);let reads=0,parses=0;
  const source={inventory:()=>rows,seal:()=>pins,readChunk:key=>{reads++;if(!chunks.has(key))throw new ArchiveFault('ARCHIVE');return chunks.get(key);}};
  return {expected,rows,pins,chunks,source,digest,parse:b=>{parses++;return inspectCoff(b)},counts:()=>({reads,parses})};
 };
 test('adapter/synthetic-positive',()=>{const f=make(),result=collect(f.expected,f.expected,f.source,f.parse);assert.equal(result.entries.length,42);assert.equal(result.entries[0].result.kind,'inventory');assert(valid(result,schema));assert.deepEqual(f.counts(),{reads:42,parses:42});});
 const plans=bindings.archiveCases;
 for(const plan of plans)test('adapter/'+plan.fault,()=>{
  const f=make();switch(plan.fault){
   case 'missing-row':f.rows.shift();break;
   case 'duplicate-row':f.rows.push(f.rows[0]);break;
   case 'row-size-mismatch':f.rows[0].bytes++;break;
   case 'row-hash-mismatch':f.rows[0].sha256='0'.repeat(64);break;
   case 'missing-chunk':f.chunks.clear();break;
   case 'noncanonical-chunk-path':f.rows[0].chunks=['../escape'];break;
   case 'symlink-or-hardlink':f.source.readChunk=()=>{throw new ArchiveFault('ARCHIVE')};break;
   case 'compressed-seal-mismatch':f.pins.get(f.digest).sha256='0'.repeat(64);break;
   case 'gzip-malformed':{const b=Buffer.from('not gzip');f.chunks.set(f.digest,b);f.pins.set(f.digest,{bytes:b.length,sha256:sha256(b)});break;}
   case 'gzip-expansion-over-8388608':{const b=gzipSync(Buffer.alloc(8388609));f.chunks.set(f.digest,b);f.pins.set(f.digest,{bytes:b.length,sha256:sha256(b)});break;}
   case 'chunk-uncompressed-hash':{const b=gzipSync(Buffer.from('wrong'));f.chunks.set(f.digest,b);f.pins.set(f.digest,{bytes:b.length,sha256:sha256(b)});break;}
   case 'assembled-size':f.rows[0].chunks=[];break;
   case 'assembled-hash':{const a=Buffer.from('abcdefghijklmnopqrst'),key=sha256(a),b=gzipSync(a);f.rows[0].chunks=[key];f.pins.set(key,{bytes:b.length,sha256:sha256(b)});f.chunks.set(key,b);break;}
   default:throw Error('unhandled plan');
  }
  assert.deepEqual(collect(f.expected,f.expected,f.source,f.parse),plan.expected);assert.equal(f.counts().parses,0);
 });
 const budget=json(join(correction,'batch-literals.json'));
 for(const c of budget.vectors)test('budget/'+c.id,()=>{const previous=EMPTY_BYTES+c.priorEntryBytes.reduce((n,x)=>n+x,0)+Math.max(0,c.priorEntryBytes.length-1);assert.deepEqual(nextBudget(previous,c.priorEntryBytes.length,c.nextEntryBytes),c.expected);});
 test('budget/full-literal',()=>{assert.equal(Buffer.byteLength(JSON.stringify(budget.synthetic)),budget.fullUtf8Bytes);assert.equal(sha256(Buffer.from(JSON.stringify(budget.synthetic))),budget.fullSha256);assert(valid(budget.synthetic,schema));});
 test('precedence/binding-before-budget',()=>{const f=make(),candidate=structuredClone(f.expected);candidate[0].index=9;f.source.inventory=()=>{throw Error('must not read')};assert.deepEqual(collect(candidate,f.expected,f.source,()=>{throw Error('must not parse')}),budget.precedence[0].expected);});
 test('precedence/archive-before-budget',()=>{const f=make();f.rows.shift();assert.deepEqual(collect(f.expected,f.expected,f.source,()=>{throw Error('must not parse')}),budget.precedence[1].expected);});
 test('precedence/rejected-result-still-charged',()=>{
  const f=make();let calls=0;
  // Internal synthetic source only: two ~64MiB entries exceed the fixed budget.
  const huge='x'.repeat(33554432);for(const row of f.expected){row.path=huge+row.index;row.absolute=huge+row.index;}for(let i=0;i<42;i++)f.rows[i].path=f.expected[i].path;
  const result=collect(f.expected,f.expected,f.source,bytes=>{calls++;return {kind:'rejected',input:{bytes:bytes.length,sha256:sha256(bytes)},error:{code:'UNSUPPORTED_MACHINE',offset:0}};});
  assert.deepEqual(result,budget.precedence[2].expected);assert.equal(calls,2);assert.equal(f.counts().reads,2);
 });
 // Real ordinary-file boundary, only in a new synthetic directory under ignored build.
 const temp=fs.mkdtempSync(resolve(here,'../../../build/ts035e3g-files-'));const file=join(temp,'chunk.gz');fs.writeFileSync(file,'abc');
 test('files/ordinary',()=>assert.equal(readOrdinary(file,3).toString(),'abc'));
 test('files/limit',()=>assert.throws(()=>readOrdinary(file,2),e=>e instanceof ArchiveFault&&e.code==='ARCHIVE_LIMIT'));
 test('files/noncanonical',()=>assert.throws(()=>readOrdinary(temp+'\\.\\chunk.gz',3),ArchiveFault));
 fs.linkSync(file,join(temp,'alias.gz'));test('files/hardlink',()=>assert.throws(()=>readOrdinary(file,3),e=>e instanceof ArchiveFault&&e.code==='ARCHIVE'));
 // Mutate every byte of a small fixture. Never accept an exception or open shape.
 test('mutation/every-byte',()=>{for(let i=0;i<fullBytes.length;i++){const b=Buffer.from(fullBytes);b[i]^=255;const r=inspectCoff(b);assert(valid(r,schema));assert.deepEqual(r.input,{bytes:b.length,sha256:sha256(b)});}});
 test('mutation/all-prefixes',()=>{for(let n=0;n<fullBytes.length;n++)assert(valid(inspectCoff(fullBytes.subarray(0,n)),schema));});
 test('input/offset-view',()=>{const larger=Buffer.concat([Buffer.alloc(7,255),minimal,Buffer.alloc(9,255)]);assert.deepEqual(inspectCoff(larger.subarray(7,27)),fixtures[0].expected);});
 test('input/spoofed-getters',()=>{const view=new Uint8Array(minimal);Object.defineProperty(view,'buffer',{get(){throw Error('caller getter')}});assert.deepEqual(inspectCoff(view),fixtures[0].expected);});
 test('input/max-exact',()=>{const b=Buffer.alloc(LIMITS.inputBytes);minimal.copy(b);const r=inspectCoff(b);assert.equal(r.kind,'inventory');assert.equal(r.input.bytes,LIMITS.inputBytes);});
 // Extended relocations are rejected without reading a plausible sentinel.
 test('boundary/relocation-count-product',()=>{const b=Buffer.from(fullBytes);b.writeUInt16LE(65535,52);assert.equal(inspectCoff(b).error.code,'TRUNCATED_RELOCATIONS');});
 test('boundary/unsigned-pointer',()=>{const b=Buffer.from(fullBytes);b.writeUInt32LE(4294967295,8);assert.deepEqual(inspectCoff(b).error,{code:'TRUNCATED_SYMBOLS',offset:8});});

 for(const id of ['empty-pointer-60','empty-directive-512-60'])test('empty/no-payload-touch/'+id,()=>{
  const f=fixtures.find(x=>x.id===id),bytes=Buffer.from(f.bytesHex,'hex');
  const savedSubarray=Buffer.prototype.subarray,savedHash=crypto.createHash;let emptySlices=0,hashCalls=0;const updates=[];
  try{
   Buffer.prototype.subarray=function(start,end){if(this.length===60&&start===60&&end===60)emptySlices++;return savedSubarray.call(this,start,end)};
   crypto.createHash=(...args)=>{hashCalls++;const h=savedHash(...args),update=h.update;h.update=function(data,...rest){updates.push(data.length);return update.call(this,data,...rest)};return h};syncBuiltinESMExports();
   assert.deepEqual(inspectCoff(bytes),f.expected);
  }finally{Buffer.prototype.subarray=savedSubarray;crypto.createHash=savedHash;syncBuiltinESMExports();}
  assert.equal(emptySlices,0);assert.equal(hashCalls,1);assert.deepEqual(updates,[60]);
 });
 return {observations,actualFixtureComparisons:115,domainCases:8,bindingNegativeComparisons:94,adapterFaultComparisons:13,budgetComparisons:6,precedenceComparisons:3,realArchiveAdapterInvocations:0,realObjectsInterpreted:0};
}
const destination=process.argv[2];if(!destination)throw Error('explicit new results path required');
try{const report=run();fs.writeFileSync(destination,JSON.stringify({...report,status:'passed'},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'passed',tests:observations.length,realObjectsInterpreted:0}));}catch(e){fs.writeFileSync(destination,JSON.stringify({status:'failed',observations,error:{name:e.name,message:e.message,stack:e.stack,actual:e.actual,expected:e.expected},realObjectsInterpreted:0},null,2)+'\n',{flag:'wx'});throw e;}
