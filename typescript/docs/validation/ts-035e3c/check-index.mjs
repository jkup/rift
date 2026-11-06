import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../../../..');
const manifest=JSON.parse(readFileSync(join(root,'typescript/docs/validation/ts-035e3c-p/correction/proposal-manifest.json')));
for(const r of manifest.additions){const bytes=execFileSync('git',['show',':typescript/'+r.path],{cwd:root});assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);}
const files=execFileSync('git',['diff','--cached','--name-only'],{cwd:root,encoding:'utf8'}).trim().split('\n');
for(const p of files)assert(p==='typescript/TASKS.md'||p.startsWith('typescript/docs/validation/ts-035e3c/')||manifest.additions.some(r=>'typescript/'+r.path===p),p);
console.log(JSON.stringify({stagedFiles:files.length,exactAcceptedIndexBytes:true,onlyOwnedPaths:true}));
