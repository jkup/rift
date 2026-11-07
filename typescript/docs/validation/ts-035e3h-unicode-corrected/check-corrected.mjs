import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {readBound,preflight,sha256} from './controller.mjs';
import {INVENTORY_LIMITS} from './inventory.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=n=>JSON.parse(fs.readFileSync(join(here,n))),plan=json('bindings.json'),c=JSON.parse(readBound(plan.contract));
for(const r of plan.rows)readBound(r);assert.equal(plan.rows.length,11);assert.deepEqual(preflight(c,plan.rows),{rootAbsent:true,boundFiles:11,tools:1,knownProcessOnly:true});
const entry=fs.readFileSync(join(here,'entry.mjs'),'utf8');assert(entry.startsWith('const RUN = false;'));assert(entry.includes(sha256(fs.readFileSync(join(here,'bindings.json')))));assert(entry.indexOf('bound source identity')<entry.indexOf("await import('./controller.mjs')"));
const future=json('future-invocation.json');assert.equal(future.authorized,false);assert.equal(future.ready,false);assert.equal(future.amendmentAcceptanceRequired,true);assert.deepEqual(future.environment,c.environment);readBound(future.entry);readBound(future.amendment);
for(const t of json('source-transformations.json')){let expected=readBound(t.source).toString();for(const r of t.replacements){assert.equal(expected.split(r.old).length-1,r.count);expected=expected.replace(r.old,r.next);}assert.equal(readBound(t.output).toString(),expected);}
const final=json('final-test-results.json'),extra=json('more-results.json'),corrections=json('correction-results.json'),boundary=json('boundary-results.json');assert.equal(final.controllerSha256,sha256(fs.readFileSync(join(here,'controller.mjs'))));assert.equal(corrections.controllerSha256,final.controllerSha256);assert.deepEqual([final.controls,extra.controls,corrections.controls,boundary.controls],[90,38,119,24]);
for(const r of json('filesystem-fixtures.json')){const p=join(repo,r.path),s=fs.lstatSync(p,{bigint:true});for(const k of ['dev','ino','nlink'])assert.equal(String(s[k]),r[k]);if(r.kind==='junction'){assert(s.isSymbolicLink());assert.equal(fs.readlinkSync(p),r.target);}else if(r.kind==='directory')assert(s.isDirectory());else{const b=fs.readFileSync(p);assert.equal(b.length,r.bytes);assert.equal(sha256(b),r.sha256);}}
assert.deepEqual(json('amendment.json').inventory.limits,INVENTORY_LIMITS);assert(fs.readFileSync(join(here,'root-rejected-teardown.json')).equals(readBound(json('root-reproduction-identity.json'))));
assert.equal(c.root,'C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3h-unicode-diagnostic-1');assert.equal(c.inputs.length,2);assert.equal(Object.keys(c.environment).length,10);assert.deepEqual(c.limits,{launches:1,retries:0,timeoutMs:5000,cleanupMs:5000,stdoutBytes:8192,stderrBytes:8192,inputBytes:1024});
console.log(JSON.stringify({actualSyntheticControls:271,gate:false,boundRows:11,diagnosticInvocations:0,fixedRootAbsent:true,amendmentAcceptanceRequired:true,sourceTransformations:5}));
