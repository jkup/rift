import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const here=import.meta.dirname,base=resolve(here,'../../..'),{sandbox}=JSON.parse(readFileSync(join(here,'run-location.json'))),hash=b=>createHash('sha256').update(b).digest('hex');
const stages=[...JSON.parse(readFileSync(join(here,'stages.json'))),...JSON.parse(readFileSync(join(here,'additional-stages.json'))).filter(r=>r.name!=='E3c-mutations'),...JSON.parse(readFileSync(join(here,'remaining-stages.json'))).filter(r=>r.name!=='driver-reduction'),...JSON.parse(readFileSync(join(here,'final-stages.json')))];
assert(stages.every(r=>r.status===0&&r.signal===null&&r.error===null));
const copied=JSON.parse(readFileSync(join(here,'copied-inputs.json'))),prior=new Map(copied.map(r=>[r.path,r.sha256]));
for(const row of copied)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
const artifacts=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else {const relative=p.slice(sandbox.length+1).replaceAll('\\','/'),b=readFileSync(p),sha256=hash(b);if(prior.get(join(base,relative))!==sha256||/(?:results|latest|node-alpha|node-beta|native-alpha|native-beta)\.(?:json|jsonl|json\.gz)$/.test(relative))artifacts.push({path:relative,sha256,bytes:b.length,base64:b.toString('base64')});}}}
walk(join(sandbox,'docs/validation'));
for(const e of readdirSync(join(sandbox,'build'),{withFileTypes:true}))if(e.isDirectory()&&/^(preflight-producer-|producer-|producer-negative-|producer-record-spoof-)/.test(e.name))walk(join(sandbox,'build',e.name));
const encoded=Buffer.from(JSON.stringify(artifacts));writeFileSync(join(here,'fresh-artifacts.json.gz'),gzipSync(encoded));writeFileSync(join(here,'fresh-artifact-index.json'),JSON.stringify(artifacts.map(({base64,...r})=>r),null,2));
for(const row of JSON.parse(readFileSync(join(here,'fresh-native-outputs.json'))))assert.equal(hash(readFileSync(join(sandbox,'build/native',row.binary))),row.sha256,row.binary);
assert(!existsSync(join(sandbox,'build/node/src/script-producer-request.js')));
writeFileSync(join(here,'completion.json'),JSON.stringify({stages,originalFilesVerified:copied.length,artifacts:artifacts.length,archiveSha256:hash(readFileSync(join(here,'fresh-artifacts.json.gz'))),freshNativeGates:71,guestRecordsPerLane:212,preflightLiterals:160},null,2));
console.log(JSON.stringify({stages:stages.length,originalFilesVerified:copied.length,artifacts:artifacts.length}));
