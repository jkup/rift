import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
const here=import.meta.dirname,base=resolve(here,'../../..'),read=p=>JSON.parse(readFileSync(join(here,p))),zip=p=>JSON.parse(gunzipSync(readFileSync(join(here,p))));
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(join(base,'docs/validation/ts-035e3c-p/correction/proposal-manifest.json')));
for(const row of manifest.additions)assert.equal(hash(readFileSync(join(base,row.path))),row.sha256);
const retry=read('retry-stages.json'),remaining=read('remaining-stages.json'),final=read('final-stages.json'),completion=read('completion-stages.json');
assert.equal(retry.at(-1).name,'E2b-extended');assert.equal(retry.at(-1).status,1);
assert(retry.slice(0,-1).every(r=>r.status===0&&r.signal===null&&r.error===null));
assert.equal(remaining.length,11);assert.equal(remaining.at(-1).name,'decoders21');assert.equal(remaining.at(-1).status,1);
assert(remaining.slice(0,-1).every(r=>r.status===0&&r.signal===null&&r.error===null));
assert.equal(final.length,2);assert.equal(final[0].status,0);assert.equal(final[1].name,'observations22');assert.equal(final[1].status,1);
assert.equal(completion.length,3);assert(completion.every(r=>r.status===0&&r.signal===null&&r.error===null));
assert.match(readFileSync(join(here,'E2b-extended.txt'),'utf8'),/checkpointScriptLedger/);
const literal=JSON.parse(gunzipSync(readFileSync(join(base,'docs/validation/ts-035e3c-p/correction/expected-captures.json.gz'))));
assert.equal(zip('installed-retry-results/capture-checks.json.gz').checks.length,17);
assert.equal(zip('installed-retry-results/errors.json.gz').length,94);
const actual=zip('installed-retry-results/actual.json.gz');assert.equal(actual.length,6);
for(const lane of ['node','native']){
 const row=actual.find(r=>r.lane===lane&&!r.id);assert.deepEqual(row.snapshot.stable.files,literal.expected[lane+'/success']);
 assert.equal(row.snapshot.executionBinding,null);assert.equal(row.snapshot.admission,'blocked');
}
const stageOutput=name=>JSON.parse(readFileSync(join(here,name+'.txt'),'utf8').trim().split('\n').at(-1));
const mutationDirectory=stageOutput('mutations').out.split(/[\\/]/).at(-1),mutations=read(mutationDirectory+'/results.json');
assert.equal(mutations.baseline.length,13);assert.equal(mutations.mutants,55);assert.equal(mutations.rejections,110);
for(const r of mutations.results){const capture=zip(mutationDirectory+'/'+r.output),expected=literal.expected[capture.expectedLiteral];assert.equal(capture.expectedSha256,hash(JSON.stringify(expected)));assert(!isDeepStrictEqual(capture.actual,expected));}
const contextDirectory=stageOutput('context').out.split(/[\\/]/).at(-1);assert.equal(read(contextDirectory+'/results.json').length,10);
const rootDirectory=stageOutput('root-mutant').out.split(/[\\/]/).at(-1),root=read(rootDirectory+'/process.json');assert.equal(root.status,1);assert.match(root.stderr,/capture-literal\/node\/success/);
const inherited=zip('inherited-artifacts.json.gz');for(const r of inherited){const b=Buffer.from(r.base64,'base64');assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
console.log(JSON.stringify({exactAdditions:2,captures:17,controls:94,contexts:10,baselines:13,mutants:55,rejections:110,successfulStages:retry.length-1+remaining.length-1+1+completion.length,inheritedArtifacts:inherited.length,admission:'blocked'}));
