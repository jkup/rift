import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,json=n=>JSON.parse(fs.readFileSync(join(here,n))),hash=b=>createHash('sha256').update(b).digest('hex');
const schema=JSON.parse(fs.readFileSync(join(here,'../ts-035e3g-p/correction-1/output-schema.json')));
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
const original=json('fixtures.original.json'),version=json('fixtures.v2.json'),extra=json('empty-fixtures.json');assert.equal(original.cases.length,83);assert.equal(extra.cases.length,32);assert(fs.readFileSync(join(here,'fixtures.original.json')).equals(fs.readFileSync(join(here,'../ts-035e3g-p/correction-1/fixtures.json'))));
const changes=json('expected-corrections.json');assert.equal(changes.length,1);const reproduced=structuredClone(original);for(const c of changes){assert.equal(reproduced.cases[c.originalIndex].id,c.id);assert.deepEqual(reproduced.cases[c.originalIndex].expected,c.originalExpected);reproduced.cases[c.originalIndex].expected=c.proposedExpected;}assert.deepEqual(reproduced,version);
for(const f of [...version.cases,...extra.cases]){const bytes=Buffer.from(f.bytesHex,'hex');assert.deepEqual(f.expected.input,{bytes:bytes.length,sha256:hash(bytes)});assert(valid(f.expected,schema),f.id);}
for(const n of ['reader-transformation.json','tests-transformation.json']){const t=json(n),before=fs.readFileSync(join(here,'../../../..',t.source));assert.equal(before.length,t.sourceBytes);assert.equal(hash(before),t.sourceSha256);let expected=before.toString();for(const r of t.replacements){assert.equal(expected.split(r.old).length,2);expected=expected.replace(r.old,r.next);}const actual=fs.readFileSync(join(here,t.output));assert.equal(actual.toString(),expected);assert.equal(actual.length,t.bytes);assert.equal(hash(actual),t.sha256);}
const review=json('support-review.json'),raw=fs.readFileSync(join(here,'../../../..',review.source));assert.equal(raw.length,review.sourceBytes);assert.equal(hash(raw),review.sourceSha256);const windows=JSON.parse(raw);assert.equal(windows.length,42);review.rows.forEach((r,i)=>{assert.deepEqual(r.sourceWindow,windows[i].window);const bytes=Buffer.from(r.sourceWindow.hex,'hex');assert.equal(r.rawSize,bytes.readUInt32LE(0));assert.equal(r.rawOffset,bytes.readUInt32LE(4));assert.equal(r.emptyPointerWithinInput,r.rawSize===0&&r.rawOffset<=r.inputBytes);});
console.log(JSON.stringify({originalLiterals:83,versionedExpectedChanges:1,newIndependentLiterals:32,fullSourceProposals:2,retainedWindows:42,proposedReaderInvocations:0,realInventoryRetries:0,passed:true}));
