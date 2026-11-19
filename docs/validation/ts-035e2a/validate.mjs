import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync, mkdtempSync } from 'node:fs';
import { resolve, dirname, join, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const own=resolve('docs/validation/ts-035e2a'), historical=resolve('docs/validation');
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(readFileSync(p));
const save=(name,value)=>writeFileSync(join(own,name),JSON.stringify(value,null,2)+'\n');
const preservation=json('docs/validation/ts-035e2-p/preservation.json');
function preserve(){assert.equal(preservation.length,5277);for(const row of preservation)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);}
function files(directory,prefix='') {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const path=join(directory,entry.name),rel=join(prefix,entry.name);
    if(path===own)return [];
    return entry.isDirectory()?files(path,rel):[rel];
  });
}
preserve();
const original=new Map();
for(const path of files(historical)) {
  original.set(path,hash(readFileSync(join(historical,path))));
}
// Run byte-identical E1 modules/tests from new evidence: the old suite writes
// fixtures relative to import.meta.url. Historical files are never writable
// targets of this runner, and no restoration/deletion operation exists here.
const replay=mkdtempSync(join(own,'e1-replay-'));
const copied=[];
for(const path of ['tools/test262/script-capabilities.test.mjs','tools/test262/script-capabilities.mjs',
  'tools/test262/script-capabilities.json','tools/test262/input.mjs',
  'fixtures/assistance/test262-starter-corpus/manifest.json','docs/validation/ts-035e-p/e1-literals.json']) {
  const dest=join(replay,path);mkdirSync(dirname(dest),{recursive:true});cpSync(path,dest);
  assert.equal(hash(readFileSync(dest)),hash(readFileSync(path)));
  copied.push({path,sha256:hash(readFileSync(path))});
}
save('E1-replay-source-identities.json',{replay,copied});
const suites=[
  ['E1',['--test',join(replay,'tools/test262/script-capabilities.test.mjs')]],
  ['host73',['--test',...readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')&&!f.startsWith('script-')).map(f=>'tools/test262/'+f)]],
  ['script-decoders',['--test','tools/test262/script-result.test.mjs','tools/test262/script-driver-result.test.mjs']],
  ['observations22',['tools/test262/observation.integration.mjs']],
  ['runner20',['--test','tools/probe-verdict.test.mjs']],
  ['typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']],
];
const results=[json(join(own,'E2a-result.json'))];
assert.equal(results[0].status,0);assert.equal(results[0].signal,null);
try {
  for(const [name,args] of suites) {
    console.log('RUN '+name);
    const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:32e6,timeout:300000});
    writeFileSync(join(own,name+'.txt'),result.stdout+result.stderr);
    results.push({name,args,status:result.status,signal:result.signal,error:result.error?.message??null});
    save('suite-results.json',results);console.log(name+': '+result.status);
    assert.equal(result.status,0,result.stderr);assert.equal(result.signal,null);
  }
} finally {
  const changed=[];
  for(const path of files(historical)) {
    const current=join(historical,path);
    if(hash(readFileSync(current))!==original.get(path)) {
      const snapshot=join(own,'replay-outputs',path);mkdirSync(dirname(snapshot),{recursive:true});cpSync(current,snapshot);changed.push(path);
    }
  }
  for(const [path,digest] of original) assert.equal(hash(readFileSync(join(historical,path))),digest,path);
  assert.deepEqual(changed,[]);
  save('historical-identity-results.json',{historicalFiles:original.size,changed,allBytesUnchanged:true,
    E1:'byte-identical isolated replay; no historical writes; prior backup/restoration records retained'});
}
preserve();
for(const lane of ['node','native']) {
  const records=json('docs/validation/ts-035d8/guest-'+lane+'-results.json');
  assert.equal(records.length,212);assert(records.every(r=>r.verdict==='PASS'));
}
assert.equal(json('docs/validation/ts-035d8/native-build-results.json').length,71);
for(const row of json(join(own,'selection-literals.json')).filter(r=>r.revision.length===40)) {
  const slots=row.selection.files.flatMap(f=>f.slots);
  assert.equal(slots.length,60);assert(slots.every(s=>s.admission==='blocked'));
  assert.equal(slots.filter(s=>s.debts[0].status==='unsupported-feature').length,19);
  assert.equal(slots.filter(s=>s.debts[0].status==='unsupported-profile').length,41);
}
save('preservation-results.json',{identities:5277,retainedGuestRecordsPerLane:212,retainedNativeGates:71,
  selectedFiles:33,blockedPerLane:60,feature:19,profile:41,freshNativeBuild:false});
console.log('PASS preservation5277 / retained212both71gates / blocked60');
