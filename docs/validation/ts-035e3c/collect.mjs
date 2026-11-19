import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,readlinkSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const here=import.meta.dirname,setup=JSON.parse(readFileSync(join(here,'setup.json'))),{base,sandbox}=setup;
const hash=b=>createHash('sha256').update(b).digest('hex'),baseline=new Map(setup.copied.map(r=>[r.path.replaceAll('\\','/'),r.sha256])),records=[],links=[];
function walk(relative){for(const e of readdirSync(join(sandbox,relative),{withFileTypes:true})){
 const p=relative+'/'+e.name;if(e.isSymbolicLink()){links.push({path:p,target:readlinkSync(join(sandbox,p))});continue;}if(e.isDirectory()){if(e.name!=='node_modules')walk(p);continue;}
 const b=readFileSync(join(sandbox,p)),sha256=hash(b);if(baseline.get(p)===sha256)continue;
 records.push({path:p,sha256,bytes:b.length,base64:b.toString('base64')});
}}
for(const p of ['docs/validation/ts-035e1','docs/validation/ts-035e2a','docs/validation/ts-035e2b','docs/validation/ts-035e2c'])walk(p);
writeFileSync(join(here,'inherited-artifacts.json.gz'),gzipSync(Buffer.from(JSON.stringify(records))),{flag:'wx'});
writeFileSync(join(here,'inherited-artifact-index.json'),JSON.stringify(records.map(({base64,...r})=>r),null,2)+'\n',{flag:'wx'});
writeFileSync(join(here,'inherited-links.json'),JSON.stringify(links,null,2)+'\n',{flag:'wx'});
const implementation=JSON.parse(readFileSync(join(base,'docs/validation/ts-035e3c-p/correction/proposal-manifest.json')));
for(const r of implementation.additions){assert.equal(hash(readFileSync(join(base,r.path))),r.sha256);assert.equal(hash(readFileSync(join(sandbox,r.path))),r.sha256);}
for(const r of setup.copied.filter(r=>/^(src|test|tools|probes)\//.test(r.path)))assert.equal(hash(readFileSync(join(sandbox,r.path))),r.sha256,r.path);
const zip=n=>JSON.parse(gunzipSync(readFileSync(join(here,'installed-retry-results',n+'.gz'))));
assert.equal(zip('capture-checks.json').checks.length,17);assert.equal(zip('errors.json').length,94);
const actual=zip('actual.json');assert.equal(actual.length,6);assert.equal(zip('input-faults.json').length,4);
const summary={inheritedArtifacts:records.length,captureComparisons:17,controls:94,actualRecords:6,inputFaults:4,allInstalledBytesExact:true,unchangedIsolatedSource:true};
writeFileSync(join(here,'completion.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary));
