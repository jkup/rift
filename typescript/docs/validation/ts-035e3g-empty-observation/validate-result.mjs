// Validate retained JSON and supporting byte windows only. Never invoke the adapter/reader.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PINS} from '../ts-035e3g-empty/pins.mjs';
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
assert(valid(result,schema));assert.equal(result.kind,'batch');assert.equal(result.entries.length,42);assert.equal(bytes.length,17866336);assert.equal(hash(bytes),'62b5c7483ccd5001bb8274cde751a408612d0b573731f3a96b8b5a2ddac67039');assert(bytes.equals(Buffer.from(JSON.stringify(result))));assert(bytes.length<=134217728);assert.deepEqual(status.raw,{bytes:bytes.length,sha256:hash(bytes)});assert.equal(status.invocations,1);assert.equal(status.outcome,'collected-review');assert.deepEqual(status.failures,[]);assert.deepEqual(status.rejections,[]);
const expected=json(join(repo,PINS.bindings.path));assert.deepEqual(result.entries.map(e=>e.binding),expected);
for(const e of result.entries){assert.equal(e.result.kind,'inventory');assert.deepEqual(e.result.input,{bytes:e.binding.bytes,sha256:e.binding.sha256});}
assert.deepEqual(json(join(here,'before.json')),json(join(here,'after.json')));
for(const r of json(join(here,'before.json'))){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
const sourceRows=json(join(here,'source-identities.json'));assert.equal(sourceRows.length,9);assert.deepEqual(json(join(here,'before.json')),[...sourceRows,PINS.bindings,PINS.inventory,PINS.manifest].map(({path,bytes,sha256})=>({path,bytes,sha256})));
assert.deepEqual(sourceRows,json(join(here,'../ts-035e3g-empty/source-mapping.json')).map(r=>({path:r.target,bytes:r.bytes,sha256:r.sha256})));
assert.deepEqual(json(join(here,'started.json')),{base:'558613a4d4aeed6a279598e5483da16a063340b5',maxInvocations:1});
assert.deepEqual(json(join(here,'invocation.json')),{command:'node typescript/docs/validation/ts-035e3g-empty-observation/observe.mjs',outerExitCode:0,invocations:1,realInputs:42});
const {summarize}=await import('./summarize.mjs');assert.deepEqual(json(join(here,'inventory-summary.json')),summarize(result));
console.log(JSON.stringify({retainedBatchBytes:bytes.length,orderedIdentities:42,closedSchema:true,inventories:42,rejected:0,sourcePinDrift:false,additionalAdapterInvocations:0,passed:true}));
