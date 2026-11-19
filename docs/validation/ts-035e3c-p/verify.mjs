import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const here=fileURLToPath(new URL('./',import.meta.url)),base=resolve(here,'../../..'),root=resolve(base,'..');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=n=>JSON.parse(readFileSync(resolve(here,n)));
assert(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--implemented'));
const implemented=process.argv.includes('--implemented'),manifest=read('proposal-manifest.json'),preserved=read('preservation.json');
assert.equal(manifest.replacements.length,0);assert.equal(manifest.additions.length,2);
assert.equal(hash(readFileSync(resolve(here,'../../script-execution-selection.md'))),manifest.designSha256);
for(const row of preserved.files)assert.equal(hash(readFileSync(resolve(root,row.path))),row.sha256,row.path);
for(const row of manifest.additions){
 assert.equal(hash(readFileSync(resolve(here,row.proposal))),row.sha256,row.proposal);
 if(implemented)assert.equal(hash(readFileSync(resolve(base,row.path))),row.sha256,row.path);
 else assert(!existsSync(resolve(base,row.path)),'Proposal installed without implementation mode: '+row.path);
}
assert(!existsSync(resolve(base,'src/script-producer-request.ts')),'Withdrawn request module');
const artifacts=read('artifact-manifest.json');
for(const row of artifacts.files){const bytes=readFileSync(resolve(here,row.path));assert.equal(bytes.length,row.bytes,row.path);assert.equal(hash(bytes),row.sha256,row.path);if(row.path.endsWith('.json.gz'))JSON.parse(gunzipSync(bytes));}
for(const row of read('compressed-evidence.json')){const bytes=gunzipSync(readFileSync(resolve(here,row.path)));assert.equal(bytes.length,row.originalBytes);assert.equal(hash(bytes),row.originalSha256);}
const final='run-10mCaM';assert.equal(read(final+'/process.json').status,0);
for(const row of manifest.additions)assert.equal(hash(readFileSync(resolve(here,final,'original-'+row.path.split('/').at(-1)))),row.sha256);
const result=n=>JSON.parse(gunzipSync(readFileSync(resolve(here,final,'results',n+'.json.gz'))));
const actual=result('actual');
for(const lane of ['node','native']){
 const row=actual.find(r=>r.lane===lane&&!r.id),s=row.snapshot;
 assert.equal(s.admission,'blocked');assert.equal(s.executionBinding,null);assert.equal(s.policyAnchor.authority.entries.length,0);
 assert.equal(s.policyAnchorSha256,hash(JSON.stringify(s.policyAnchor)));assert.equal(s.stableSha256,hash(JSON.stringify(s.stable)));
 assert.equal(row.final.plannedVariants,60);assert.equal(row.final.completed,60);assert.equal(row.final.executedVariants,0);assert.equal(row.final.testBodyEvaluatedVariants,0);
 assert.equal(row.final.counts['unsupported-feature'],19);assert.equal(row.final.counts['unsupported-profile'],41);
 assert(s.policyAnchor.files.some(f=>f.slots?.some(s=>s.goal==='Module')));
}
assert.equal(result('errors').length,94);assert.equal(result('input-faults').length,2);
assert.equal(read('native-entrypoints.json').length,71);assert.equal(read('retained-report-literals.json').length,13);
const original=new Set(preserved.files.map(r=>r.path)),allowed=new Set(manifest.additions.map(r=>'typescript/'+r.path));
const current=execFileSync('git',['ls-files','-c','-o','--exclude-standard','-z'],{cwd:root,encoding:'utf8',maxBuffer:10000000}).split('\0').filter(Boolean);
for(const path of current)if(/^typescript\/(src|tools|test)\//.test(path)&&!original.has(path))assert(implemented&&allowed.has(path),'Unapproved new source/test/tool '+path);
console.log(JSON.stringify({preserved:preserved.files.length,artifacts:artifacts.files.length,additions:manifest.additions.length,existingReplacements:0,mode:implemented?'implemented':'design',bothLanes:'60 blocked; 19 feature/41 profile; executed0/body0',finalErrors:94,retainedReports:13,guestLaunches:0,builds:0}));
