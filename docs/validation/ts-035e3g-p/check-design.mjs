// Design-data checker only. Does not decode COFF bytes or implement inspectCoff.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,json=n=>JSON.parse(readFileSync(join(here,n)));
const schema=json('output-schema.json');
function valid(value,s){
 if(s.$ref)return valid(value,schema.$defs[s.$ref.split('/').at(-1)]);
 if(s.oneOf)return s.oneOf.filter(x=>valid(value,x)).length===1;
 if(s.anyOf)return s.anyOf.some(x=>valid(value,x));
 if('const' in s&&value!==s.const)return false;
 if(s.enum&&!s.enum.includes(value))return false;
 if(s.type==='null')return value===null;
 if(s.type==='boolean')return typeof value==='boolean';
 if(s.type==='integer')return Number.isInteger(value)&&value>=s.minimum&&value<=s.maximum;
 if(s.type==='string')return typeof value==='string'&&(!s.pattern||new RegExp(s.pattern).test(value))&&(s.minLength===undefined||value.length>=s.minLength)&&(s.maxLength===undefined||value.length<=s.maxLength);
 if(s.type==='array')return Array.isArray(value)&&value.every(x=>valid(x,s.items));
 if(s.type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===s.required.length&&s.required.every(k=>Object.hasOwn(value,k)&&valid(value[k],s.properties[k]));
 return true;
}
const fixtures=json('fixtures.json');assert.equal(fixtures.status,'future-literals-no-reader-executed');assert.equal(fixtures.cases.length,80);
const names=new Set();for(const f of fixtures.cases){assert(!names.has(f.id));names.add(f.id);assert(/^(?:[0-9a-f]{2})*$/.test(f.bytesHex));const b=Buffer.from(f.bytesHex,'hex');assert.deepEqual(f.expected.input,{bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});assert(valid(f.expected,schema),f.id);
 if(f.expected.kind==='inventory'){const v=f.expected;assert.equal(v.header.sectionCount,v.sections.length);assert.equal(v.header.symbolSlotCount,v.symbols.reduce((n,s)=>n+1+s.auxiliary.length,0));for(const s of v.symbols){assert.equal(s.auxiliaryCount,s.auxiliary.length);assert.deepEqual(s.auxiliary.map(x=>x.slot),Array.from({length:s.auxiliary.length},(_,i)=>s.slot+i+1));}for(const s of v.sections)assert.equal(s.relocationCount,s.relocations.length);for(const s of v.directives)assert.equal(s.hex.length,s.bytes*2);}
}
const positive=fixtures.cases.filter(x=>x.expected.kind==='inventory');assert.equal(positive.length,13);
const domains=json('input-domain-cases.json');assert.equal(domains.cases.length,8);for(const c of domains.cases){assert(valid(c.expected,schema));assert.equal(c.expected.input,null);}
// Check the closed-shape checker itself, not a future parser.
for(const f of positive){const changed=structuredClone(f.expected);changed.extra=true;assert(!valid(changed,schema));}
const binding=json('binding-cases.json'),ordered=json('ordered-inputs.json');assert.deepEqual(binding.positive,ordered);assert.equal(ordered.length,42);assert.equal(binding.cases.length,94);assert.equal(binding.archiveCases.length,13);assert.equal(new Set(ordered.map(r=>r.path)).size,42);assert(ordered.every((r,i)=>r.index===i&&r.role===(i===41?'program':'runtime')));
console.log(JSON.stringify({futureFixtures:80,fullPositiveLiterals:13,fullRejectedLiterals:67,fullBindingNegatives:94,adapterFaultPlans:13,closedShapeMutants:13,readerImplemented:false,archivedObjectsInterpreted:0,passed:true}));
