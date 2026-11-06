import assert from 'node:assert/strict';
import {readFileSync as read,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
const here=fileURLToPath(new URL('./',import.meta.url)),root=resolve(here,'../../..'),repo=resolve(root,'..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const load=p=>JSON.parse(read(join(here,p)));
const mode=process.argv.slice(2);assert.ok(mode.length===0||(mode.length===1&&mode[0]==='--implemented'),'verify arguments');
for(const row of load('preservation.json'))assert.equal(sha(read(join(repo,row.path))),row.sha256,'protected '+row.path);
const manifest=load('proposal-manifest.json');assert.deepEqual(manifest.replacements,[]);assert.equal(manifest.additions.length,2);
for(const row of manifest.additions){assert.equal(sha(read(join(here,row.proposal))),row.sha256,'proposal '+row.path);if(mode.length)assert.equal(sha(read(join(repo,row.path))),row.sha256,'installed '+row.path);else assert.ok(!existsSync(join(repo,row.path)),'not installed '+row.path);}
const evidence=load('evidence-manifest.json');assert.equal(sha(read(join(root,evidence.design.path))),evidence.design.sha256,'design');
for(const row of evidence.files)assert.equal(sha(read(join(here,row.path))),row.sha256,'evidence '+row.path);
for(const row of load('accepted-build-details.json'))assert.equal(sha(read(join(root,row.path))),row.sha256,'accepted '+row.path);
for(const row of load('main-request-literals.json')){const b=read(join(root,row.path));assert.equal(sha(b),row.sha256);assert.deepEqual(JSON.parse(b),row.records);}
const r=load('request-literal-reference.json');assert.equal(sha(read(join(root,r.path))),r.sha256);
console.log(JSON.stringify({protected:load('preservation.json').length,evidence:evidence.files.length,additions:2,replacements:0,mode:mode.length?'implemented':'design',guestLaunches:0,builds:0}));
