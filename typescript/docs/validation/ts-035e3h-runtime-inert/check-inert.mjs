import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {hash} from './files.mjs';
import {verifyBound,RUN_ENABLED} from './runner.mjs';
import {RUN_ENABLED as controllerEnabled} from './controller.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=n=>JSON.parse(fs.readFileSync(join(here,n)));
assert.equal(RUN_ENABLED,false);assert.equal(controllerEnabled,false);
const bindingBytes=fs.readFileSync(join(here,'runtime-bindings.json'));assert(fs.readFileSync(join(here,'runner.mjs'),'utf8').includes(hash(bindingBytes)));assert.equal(verifyBound(bindingBytes,hash(bindingBytes),repo),20);
for(const r of json('reused-identities.json')){const b=fs.readFileSync(join(repo,r.source));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);assert.deepEqual(b,fs.readFileSync(join(here,r.target)));}
for(const r of json('source-identities.json')){const b=fs.readFileSync(join(here,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
const fragment=fs.readFileSync(join(here,'parent-supervise.extracted.mjs.txt')),extraction=json('parent-extraction.json');assert.equal(hash(fragment),extraction.fragmentSha256);assert.deepEqual(fs.readFileSync(join(here,'parent.mjs')),Buffer.concat([Buffer.from(extraction.prefix),fragment,Buffer.from(extraction.suffix)]));
const plan=json('proposal.json'),invocation=json('invocation.proposed.json');assert.equal(invocation.authorized,false);assert.deepEqual(invocation.environment,plan.supervisorCommand.environment);assert.equal(invocation.executable,json('build-plan.json').node.path);assert.deepEqual(invocation.argv,[join(here,'runner.mjs')]);assert.equal(invocation.cwd,repo);assert.equal(invocation.recorderLaunchesMaximum,1);assert.equal(invocation.supervisorAddTypeMaximum,1);assert.equal(invocation.retries,0);
assert(fs.readFileSync(join(here,'supervisor.cs.proposed.txt'),'utf8').includes('const bool CaptureRuntimeEnabled = false;'));assert(fs.readFileSync(join(here,'supervise.ps1.proposed.txt'),'utf8').includes("throw 'DESIGN_ONLY_RECORDER_RUNTIME_GATE'"));
let controls=0;for(const name of ['test-results.json','additional-results.json']){const r=json(name);assert.equal(r.status,'passed');assert.equal(r.childExecutions,0);assert(r.results.every(x=>x.passed));controls+=r.results.length;for(const row of r.inventory){const s=fs.lstatSync(row.path,{bigint:true});for(const k of ['dev','ino','nlink'])assert.equal(String(s[k]),row[k]);if(row.kind==='alias'){assert(s.isSymbolicLink());assert.equal(fs.readlinkSync(row.path),row.target);}else if(row.kind==='file'){assert(s.isFile());const b=fs.readFileSync(row.path);assert.equal(b.length,row.bytes);assert.equal(hash(b),row.sha256);}else assert(s.isDirectory());}}
assert.equal(controls,75);let error;try{fs.lstatSync(plan.root);}catch(e){error=e;}assert.equal(error?.code,'ENOENT');assert.equal(json('fixed-root-state.json').reserved,false);
console.log(JSON.stringify({inertController:true,syntheticControls:controls,boundFiles:20,exactParentReuse:true,allGatesClosed:true,fixedRootAbsent:true,childExecutions:0,recorderLaunches:0,addTypeCalls:0,passed:true}));
