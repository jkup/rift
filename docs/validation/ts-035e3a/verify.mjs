import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),repo=resolve(here,'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p));
const proposal=resolve(here,'../ts-035e3-p');
const manifest=read(join(proposal,'proposal-manifest.json'));
const rows=read(join(proposal,'preservation.json'));assert.equal(rows.length,6703);
for(const row of rows)assert.equal(hash(readFileSync(join(repo,row.path))),manifest.find(m=>m.path===row.path)?.after??row.sha256,row.path);
for(const row of read(join(proposal,'artifacts.json')))assert.equal(hash(readFileSync(join(proposal,row.path))),row.sha256,row.path);
for(const row of manifest){assert.equal(hash(readFileSync(join(repo,row.path))),row.after);assert.equal(hash(readFileSync(join(proposal,row.proposal))),row.after);}
assert(readFileSync(join(repo,'typescript/tools/test262/script-compose.test.mjs')).equals(readFileSync(join(proposal,'proposals/script-compose.test.mjs'))));
for(const row of [...read(join(here,'copied-inputs.json')),...read(join(here,'additional-inputs.json'))])assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
for(const row of read(join(here,'suite-results.json'))){assert.equal(row.status,row.name==='host73'?1:0,row.name);assert.equal(row.signal,null);assert.equal(row.error,null);}
for(const row of read(join(here,'completion-suite-results.json'))){assert.equal(row.status,row.name==='observations22'?1:0,row.name);assert.equal(row.signal,null);assert.equal(row.error,null);}
for(const row of read(join(here,'final-suite-results.json'))){assert.equal(row.status,0,row.name);assert.equal(row.signal,null);assert.equal(row.error,null);}
const controls=read(join(here,'constructor-controls.json'));assert.equal(controls.literalRows,154);assert.equal(controls.negativeControls,6160);assert.equal(controls.nullBindingPositive,1);assert.equal(controls.nullBindingLaunchedNegative,1);
for(const row of read(join(here,'serializer-results.json'))){assert.equal(row.records,77);assert.equal(row.status,0);assert.equal(hash(readFileSync(join(here,'serializer-'+row.lane+'-'+row.input+'.stdout.txt'))),row.stdoutSha256);}
const retained=read(join(here,'preservation-results.json'));assert.equal(retained.blocked,60);assert.equal(retained.retainedNativeGates,71);
console.log(JSON.stringify({protected:rows.length,approvedReplacements:manifest.length,exactNewTest:true,proposalHistoryUnchanged:true,copiedOriginalsUnchanged:true}));
