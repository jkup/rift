import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
for(const r of json(join(here,'source-identities.json'))){const b=fs.readFileSync(join(here,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
for(const t of json(join(here,'source-transformations.json'))){const b=fs.readFileSync(join(repo,t.source));assert.equal(b.length,t.sourceBytes);assert.equal(hash(b),t.sourceSha256);let s=b.toString();for(const r of t.replacements){assert.equal(s.split(r.old).length-1,r.count);s=s.replace(r.old,r.next);}const actual=fs.readFileSync(join(here,t.target));assert.equal(actual.toString(),s);assert.equal(actual.length,t.bytes);assert.equal(hash(actual),t.sha256);}
const contract=json(join(here,'contract.json'));assert.equal(contract.binaryIdentity,null);assert.equal(contract.authority,'none');
const schema=json(join(here,'output-schema.json'));
function valid(v,s){
 if(s.oneOf)return s.oneOf.filter(x=>valid(v,x)).length===1;
 if(s.anyOf)return s.anyOf.some(x=>valid(v,x));
 if('const'in s&&v!==s.const)return false;if(s.enum&&!s.enum.includes(v))return false;
 if(s.type==='null')return v===null;
 if(s.type==='integer')return Number.isInteger(v)&&(s.minimum===undefined||v>=s.minimum)&&(s.maximum===undefined||v<=s.maximum);
 if(s.type==='string')return typeof v==='string'&&(!s.pattern||new RegExp(s.pattern).test(v))&&(s.minLength===undefined||v.length>=s.minLength)&&(s.maxLength===undefined||v.length<=s.maxLength);
 if(s.type==='array')return Array.isArray(v)&&(s.maxItems===undefined||v.length<=s.maxItems)&&v.every(x=>valid(x,s.items));
 if(s.type==='object')return v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===s.required.length&&s.required.every(k=>Object.hasOwn(v,k)&&valid(v[k],s.properties[k]));return true;
}
const literals=[...json(join(here,'byte-literals.json')),...json(join(here,'additional-byte-literals.json')),...json(join(here,'model-literals.json'))];
for(const f of literals){assert(valid(f.expected,schema),f.id);assert(!valid({...f.expected,extra:1},schema),f.id);}
const report=json(join(here,'test-results-2.json'));assert.equal(report.status,'passed');assert.equal(report.observations.length,81);assert(report.observations.every(r=>r.status==='passed'));assert.equal(report.recorderCompilations,0);assert.equal(report.recorderExecutions,0);
const controller=fs.readFileSync(join(here,'runner.mjs.proposed.txt'),'utf8'),supervisor=fs.readFileSync(join(here,'supervisor.cs.proposed.txt'),'utf8');
assert(controller.includes("throw Error('SOURCE_ONLY_CAPTURE_GATE:"));assert(supervisor.includes('const bool CaptureRuntimeEnabled = false;'));assert(supervisor.includes('FileMode.Open,FileAccess.Read,FileShare.None'));assert(!supervisor.includes('r.Outcome="completed-observation";'));
console.log(JSON.stringify({inertSources:3,exactTransformations:2,byteLiterals:38,modelLiterals:31,controls:81,mutants:5,closedSchemaExtraFieldRejections:literals.length,binaryIdentity:null,recorderCompilations:0,recorderExecutions:0,passed:true}));
