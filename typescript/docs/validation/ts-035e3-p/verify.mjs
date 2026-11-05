import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(resolve(here,p)));
for(const r of read('artifacts.json'))assert.equal(hash(readFileSync(resolve(here,r.path))),r.sha256,r.path);
for(const r of read('preservation.json'))assert.equal(hash(readFileSync(resolve(root,r.path))),r.sha256,r.path);
for(const r of read('proposal-manifest.json')){assert.equal(hash(readFileSync(resolve(root,r.path))),r.before);assert.equal(hash(readFileSync(resolve(here,r.proposal))),r.after);}
const original=readFileSync(resolve(root,'typescript/tools/test262/script-result.mjs'));
const proposed=readFileSync(resolve(here,'proposals/script-result.mjs'));
assert(proposed.subarray(0,original.length).equals(original));
assert(proposed.subarray(original.length).equals(readFileSync(resolve(here,'classifier-addition.txt'))));
console.log(JSON.stringify({preserved:read('preservation.json').length,exactOldFileProposals:2,originalClassifierUnchanged:true}));
