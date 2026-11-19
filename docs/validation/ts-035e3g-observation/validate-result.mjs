// Validate retained JSON and supporting byte windows only. Never invoke the adapter/reader.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PINS} from '../ts-035e3g/pins.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=p=>JSON.parse(fs.readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const schema=json(join(here,'../ts-035e3g-p/correction-1/output-schema.json'));
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
const bytes=fs.readFileSync(join(here,'result.json')),result=JSON.parse(bytes),status=json(join(here,'status.json'));
assert(valid(result,schema));assert.equal(result.kind,'batch');assert.equal(result.entries.length,42);assert.equal(bytes.length,25049);assert(bytes.equals(Buffer.from(JSON.stringify(result))));assert(bytes.length<=134217728);assert.deepEqual(status.raw,{bytes:bytes.length,sha256:hash(bytes)});assert.equal(status.invocations,1);assert.equal(status.outcome,'stop-review');assert.deepEqual(status.failures,[]);
const expected=json(join(repo,PINS.bindings.path));assert.deepEqual(result.entries.map(e=>e.binding),expected);
assert.deepEqual(status.rejections,result.entries.map(e=>({binding:e.binding,error:e.result.error})));
for(const e of result.entries){assert.equal(e.result.kind,'rejected');assert.deepEqual(e.result.input,{bytes:e.binding.bytes,sha256:e.binding.sha256});assert.deepEqual(e.result.error,{code:'RAW_POINTER',offset:e.binding.index===41?80:40});}
assert.deepEqual(json(join(here,'before.json')),json(join(here,'after.json')));
for(const r of json(join(here,'before.json'))){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
const inventory=json(join(repo,PINS.inventory.path)),manifest=json(join(repo,PINS.manifest.path)),map=new Map(inventory.files.map(r=>[r.path,r])),seals=new Map(manifest.map(r=>[r.path,r]));
const windows=json(join(here,'rejection-bytes.json'));assert.equal(windows.length,42);
for(let i=0;i<42;i++){
 const entry=result.entries[i],window=windows[i];assert.deepEqual(window.binding,entry.binding);assert.deepEqual(window.error,entry.result.error);
 const row=map.get(entry.binding.path),b=Buffer.concat(row.chunks.map(sha=>{const p=PINS.blobs+'/'+sha+'.gz',compressed=fs.readFileSync(join(repo,p)),seal=seals.get(p);assert.equal(compressed.length,seal.bytes);assert.equal(hash(compressed),seal.sha256);const chunk=gunzipSync(compressed,{maxOutputLength:8388608});assert.equal(hash(chunk),sha);return chunk;}));
 assert.equal(b.length,entry.binding.bytes);assert.equal(hash(b),entry.binding.sha256);assert.deepEqual(window.window,{offset:entry.result.error.offset-4,bytes:8,hex:b.subarray(entry.result.error.offset-4,entry.result.error.offset+4).toString('hex')});
}
console.log(JSON.stringify({retainedBatchBytes:bytes.length,orderedIdentities:42,closedSchema:true,rejected:42,runtimeRawPointerOffset:40,programRawPointerOffset:80,sourcePinDrift:false,additionalAdapterInvocations:0,passed:true}));
