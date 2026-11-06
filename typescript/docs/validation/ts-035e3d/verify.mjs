import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const here=import.meta.dirname,base=resolve(here,'../../..'),repo=resolve(base,'..'),hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(readFileSync(p));
const {sandbox}=json(join(here,'run-location.json')),completion=json(join(here,'completion.json'));
assert.equal(completion.stages.length,48);assert(completion.stages.every(r=>r.status===0&&r.signal===null&&r.error===null));
const bytes=readFileSync(join(here,'complete-artifacts.json.gz'));assert.equal(hash(bytes),completion.archiveSha256);
const records=JSON.parse(gunzipSync(bytes)),index=json(join(here,'complete-artifact-index.json'));assert.equal(records.length,1911);assert.deepEqual(records.map(({base64,...r})=>r),index);
const seen=new Set();for(const r of records){assert(!seen.has(r.path));seen.add(r.path);const b=Buffer.from(r.base64,'base64');assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);assert.equal(hash(readFileSync(join(sandbox,r.path))),r.sha256);}
for(const lane of ['node','native'])for(const input of ['alpha','beta'])assert(seen.has('docs/validation/ts-035a/'+lane+'-'+input+'.jsonl'));
for(const r of json(join(here,'copied-inputs.json')))assert.equal(hash(readFileSync(r.path)),r.sha256,r.path);
const generated=json(join(here,'generated-closure.json'));for(const r of generated.generated)assert.equal(hash(readFileSync(r.path)),r.sha256,r.path);
for(const r of [generated.node,generated.zig])assert.equal(hash(readFileSync(r.path)),r.sha256,r.path);
const binaries=json(join(here,'fresh-native-outputs.json'));assert.equal(binaries.length,71);for(const r of binaries)assert.equal(hash(readFileSync(join(sandbox,'build/native',r.binary))),r.sha256,r.binary);
assert(!existsSync(join(sandbox,'build/node/src/script-producer-request.js')));
const policy=json(join(here,'policy-results.json'));for(const r of policy){assert.equal(r.final.completed,60);assert.equal(r.final.executedVariants,0);assert.equal(r.final.testBodyEvaluatedVariants,0);assert.equal(r.final.counts['unsupported-feature'],19);assert.equal(r.final.counts['unsupported-profile'],41);}
const original=execFileSync('git',['show','7813fdd:typescript/TASKS.md'],{cwd:repo,encoding:'utf8'}),current=readFileSync(join(base,'TASKS.md'),'utf8'),heading='### TS-035E3d - Closed conformance preflight control producer';assert.equal(current.split(heading)[0].replaceAll('\r\n','\n'),original.split(heading)[0].replaceAll('\r\n','\n'));
console.log(JSON.stringify({stages:48,archive:records.length,nativeIdentities:binaries.length,nodeIdentities:generated.generated.length,policy:'60 blocked 19/41 both lanes',otherTasksUnchanged:true,passed:true}));
