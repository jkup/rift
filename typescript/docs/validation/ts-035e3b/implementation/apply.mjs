import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const here=import.meta.dirname,boundary=resolve(here,'../request-boundary'),repo=resolve(here,'../../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex'),rows=JSON.parse(readFileSync(join(boundary,'proposal-manifest.json')));
// Validate the complete authorized set before any mutation.
for(const row of rows){assert.equal(hash(readFileSync(join(repo,row.path))),row.before,row.path);if(row.operation==='replace')assert.equal(hash(readFileSync(join(boundary,row.proposal))),row.after,row.proposal);}
for(const row of rows){const target=resolve(repo,row.path);assert(target.startsWith(resolve(repo,'typescript')+'\\'));if(row.operation==='replace')copyFileSync(join(boundary,row.proposal),target);else {assert.equal(row.operation,'remove-unshipped-file');assert.equal(row.path,'typescript/src/script-producer-request.ts');unlinkSync(target);}}
writeFileSync(join(here,'application.json'),JSON.stringify({approved:'Coordinator actual/full second review and independent root validation; request-boundary contract amendment',rows},null,2)+'\n',{flag:'wx'});
console.log('Applied three exact files; removed only the hash-checked unshipped request module.');
