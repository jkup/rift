import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),json=f=>JSON.parse(readFileSync(new URL(f,here))),results=[];
function run(args){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024}),record={args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr};results.push(record);if(r.status!==0||r.signal||r.error){let i=1;while(existsSync(new URL('failed-check-'+i+'.json',here)))i++;writeFileSync(new URL('failed-check-'+i+'.json',here),JSON.stringify(record,null,2)+'\n');}assert.equal(r.status,0,JSON.stringify(record));assert.equal(r.signal,null);assert.equal(r.error,undefined);}
run(['typescript/docs/validation/ts-035d8-p/verify.mjs']);
for(const name of readdirSync(here).filter(n=>n.endsWith('.mjs')))run(['--check','typescript/docs/validation/ts-035d8-p/'+name]);
for(const e of json('proposal-manifest.json').entries.filter(e=>e.originalSha256!==e.dispatchSha256))run(['--check','typescript/docs/validation/ts-035d8-p/proposed/'+e.path]);
const m=json('semantic-matrix.json'),p=json('probe-results.json'),w=json('wire-audit.json'),c=json('control-audit.json');assert.equal(p.rows,m.rows.length);assert.equal(p.inherited,564);assert.equal(w.accepted,256);assert.equal(w.unimplemented,64);assert.equal(w.rejections,95840);assert.equal(c.prefixes,24);assert.equal(c.history,36);
for(const id of ['S19-raw','S19-strict'])assert.equal(m.rows.find(r=>r.id===id).expected.kind,'eligible');
for(const id of ['mixed-sloppy-block-false-false','mixed-catch-conflict-true-false','mixed-delete-true-false'])assert.equal(m.rows.find(r=>r.id===id).expected.reason,'scope-restriction');
for(const [file,id] of [['alpha','R0'],['beta','R1']]){const text=readFileSync(new URL('inputs/'+file+'.js',here),'utf8');assert.equal(text,m.rows.find(r=>r.id===id).text);assert(text.includes('\r\n'));}
for(const r of json('future-controls.json').historyRows){assert.deepEqual(r.before,r.after);assert.equal(r.before.lastAbrupt===null,!r.seeded||r.prefixCount>0);}
for(const r of json('future-controls.json').oracleMutations)assert.notDeepEqual(r.wrong,r.expected);
const inheritedManifest=json('inherited-manifest.json'),compressed=readFileSync(new URL('inherited-preparations.json.gz',here)),expanded=gunzipSync(compressed);assert.equal(createHash('sha256').update(compressed).digest('hex'),inheritedManifest.compressedSha256);assert.equal(createHash('sha256').update(expanded).digest('hex'),inheritedManifest.uncompressedSha256);assert.equal(expanded.length,inheritedManifest.uncompressedBytes);assert.equal(JSON.parse(expanded).rows.length,564);
writeFileSync(new URL('checks.json',here),JSON.stringify({claim:'Offline syntax/wholefile/preservation/literal checks only; no build, future emission or native test',results,rows:m.rows.length,probe:{rows:p.rows,inherited:p.inherited,blockedOracleMutations:p.blockedOracleMutations},wire:w,controls:c},null,2)+'\n');console.log('PASS '+results.length+' offline checks');
