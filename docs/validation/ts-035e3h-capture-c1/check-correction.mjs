import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {extract} from './extraction.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const t=json(join(here,'source-transformation.json')),old=fs.readFileSync(join(repo,t.source)),next=fs.readFileSync(join(here,t.target));
assert.equal(t.base,'5ef4d7bf50ff773afb03230ee3a7e875aad31f39');assert.equal(old.length,t.sourceBytes);assert.equal(hash(old),t.sourceSha256);assert.equal(t.sourceSha256,'ddaddacf25f9db9263883210db31ee65c9abd0ddab922feb36272cab21f44065');
assert.equal(old.toString().split(t.old).length-1,1);assert.equal(t.count,1);assert.equal(next.toString(),old.toString().replace(t.old,t.next));assert.equal(next.length,t.bytes);assert.equal(hash(next),t.sha256);assert.equal(t.sha256,'9b1c9ee8b1119065962f09d7d7ee268a9951c5e1e3ad4eeec5dbe8ddd949f501');
assert.equal(fs.readFileSync(join(here,'original-extracted.mjs.txt'),'utf8'),extract(old.toString()));assert.equal(fs.readFileSync(join(here,'corrected-extracted.mjs.txt'),'utf8'),extract(next.toString()));
assert(next.toString().includes("throw Error('SOURCE_ONLY_CAPTURE_GATE:"));
const report=json(join(here,'directory-results.json'));assert.equal(report.status,'passed');assert.equal(report.observations.length,5);assert(report.observations.every(r=>r.status==='passed'));assert.equal(report.controllerInvocations,0);assert.equal(report.recorderExecutions,0);assert.equal(report.compilerInvocations,0);
for(const r of report.inventory){const s=fs.lstatSync(r.path,{bigint:true});for(const k of ['dev','ino','nlink'])assert.equal(String(s[k]),r[k]);if(r.kind==='alias'){assert(s.isSymbolicLink());assert.equal(fs.readlinkSync(r.path),r.target);}else if(r.kind==='directory')assert(s.isDirectory());else{assert(s.isFile());const b=fs.readFileSync(r.path);assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}}
for(const name of ['ts035e3h-capture-root-directory.mjs','ts035e3h-capture-root-directory.json'])assert.deepEqual(fs.readFileSync(join(here,'root-witness-'+name)),fs.readFileSync(join(repo,'typescript/build',name)));
const inherited=json(join(here,'inherited-results.json'));assert.equal(inherited.status,'passed');assert.equal(inherited.observations.length,81);assert(inherited.observations.every(r=>r.status==='passed'));
console.log(JSON.stringify({singleSourceReplacement:true,directExtractionControls:5,inheritedControls:81,originalRejectedSourcePreserved:true,runtimeGateClosed:true,controllerInvocations:0,recorderExecutions:0,passed:true}));
