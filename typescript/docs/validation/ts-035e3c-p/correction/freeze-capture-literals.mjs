// One-shot independent oracle authoring. NO imports from input.mjs, E2, the
// proposed capture module, or any returned selection/capture fixture.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const here=fileURLToPath(new URL('./',import.meta.url)),base=resolve(here,'../../../..');
const corpus='C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075';
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=readFileSync(resolve(base,'fixtures/assistance/test262-starter-corpus/manifest.json'));
const manifest=JSON.parse(manifestBytes),revision='91c70759363c46557b694792bf34a2551a7af5ba';
assert.equal(manifest.upstream.revision,revision);
assert.equal(sha(JSON.stringify(manifest)),'eefae56c3fda22bdd1a504744c56f296eb76b5200c3b614d2041af205f1b773f');
const vault={};
for(const [path,blob] of [...manifest.entries.map(e=>[e.path,e.blob]),...Object.entries(manifest.upstream.harnessBlobs)]){
 const bytes=readFileSync(resolve(corpus,path));
 const actualBlob=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 assert.equal(actualBlob,blob,path);assert.deepEqual(Buffer.from(bytes.toString('utf8'),'utf8'),bytes,path);
 vault[path]={blob,sha256:sha(bytes),byteLength:bytes.length,base64:bytes.toString('base64')};
}
// The manifest supplies explicit variant and defaultIncludes lists. This oracle
// does not call or reimplement the planner's flags-to-variant/harness functions.
const tables={};
for(const lane of ['node','native']){
 tables[lane]=manifest.entries.map((entry,fileOrdinal)=>({ordinal:fileOrdinal,path:entry.path,slots:entry.variants.map(variant=>({
  slotId:[revision,entry.path,variant,lane].join(':'),variant,goal:variant==='module'?'Module':'Script',
  occurrences:[...entry.defaultIncludes,...entry.includes].map(name=>'harness/'+name).concat(entry.path).map((path,ordinal)=>({
   id:'u'+ordinal,ordinal,role:path===entry.path?'test':'harness',path,blob:vault[path].blob,
   prefixHex:path===entry.path&&variant==='strict'?'2275736520737472696374223b0a':''
  }))
 }))}));
 assert.equal(tables[lane].reduce((n,f)=>n+f.slots.length,0),60);
}
function project(table,failed=()=>false){
 return table.map(file=>failed(file)?{ordinal:file.ordinal,path:file.path,state:'input-error',slots:null}:{
  ordinal:file.ordinal,path:file.path,state:'captured',slots:file.slots.map(slot=>({
   slotId:slot.slotId,variant:slot.variant,goal:slot.goal,units:slot.occurrences.map(u=>{
    const original=Buffer.from(vault[u.path].base64,'base64');
    const transformed=Buffer.concat([Buffer.from(u.prefixHex,'hex'),original]);
    const transformedText=transformed.toString('utf8');
    return {id:u.id,ordinal:u.ordinal,role:u.role,path:u.path,blob:u.blob,
     sourceSha256:sha(original),transformedSha256:sha(transformed),byteLength:original.length,
     transformedByteLength:transformed.length,sourceUnits:transformedText.length,
     originalBase64:original.toString('base64'),transformedBase64:transformed.toString('base64'),transformedText};
   })
  }))
 });
}
const expected={};
for(const lane of ['node','native']){
 expected[lane+'/success']=project(tables[lane]);
 expected[lane+'/wrong-revision']=project(tables[lane],()=>true);
 expected[lane+'/include-failure']=project(tables[lane],file=>file.slots.some(s=>s.occurrences.some(u=>u.path==='harness/sta.js')));
 expected[lane+'/first-file-unavailable']=project(tables[lane],file=>file.ordinal===0);
}
// These occurrence lists are explicit, distinct synthetic inputs to the PRIVATE
// capture function in an isolated test copy. They cannot create a public token.
const synthetic=[];
for(const [id,variant,paths] of [
 ['duplicate-sta','non-strict',['harness/assert.js','harness/sta.js','harness/sta.js']],
 ['reordered-harness','non-strict',['harness/sta.js','harness/assert.js','harness/sta.js']],
 ['raw-same-source','raw',[]],['nonstrict-same-source','non-strict',[]],['strict-same-source','strict',[]]
]){
 const entry=manifest.entries[0],all=[...paths,entry.path];
 const table=[{ordinal:0,path:entry.path,slots:[{slotId:'synthetic:'+id,variant,goal:'Script',occurrences:all.map((path,ordinal)=>({
  id:'u'+ordinal,ordinal,role:ordinal===all.length-1?'test':'harness',path,blob:vault[path].blob,
  prefixHex:ordinal===all.length-1&&variant==='strict'?'2275736520737472696374223b0a':''
 }))}]}];
 const expectedFiles=project(table),test=expectedFiles[0].slots[0].units.at(-1);
 const anchor={files:[{ordinal:0,path:entry.path,inputError:null,slots:[{id:'synthetic:'+id,path:entry.path,variant,goal:'Script',
  blob:entry.blob,sourceSha256:vault[entry.path].sha256,transformedSourceSha256:test.transformedSha256,
  harness:paths.map(path=>({path,blob:vault[path].blob,sha256:vault[path].sha256}))}]}]};
 synthetic.push({id,claim:'Synthetic private capture input only; no selection token/admission/receipt',table,anchor,expectedFiles});
}
const save=(name,value)=>writeFileSync(resolve(here,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
save('capture-occurrence-tables.json',{revision,manifestSha256:sha(manifestBytes),tables});
save('pinned-byte-identities.json',{revision,files:vault});
writeFileSync(resolve(here,'expected-captures.json.gz'),gzipSync(Buffer.from(JSON.stringify({expected,synthetic},null,2)+'\n')),{flag:'wx'});
console.log(JSON.stringify({pinnedFiles:Object.keys(vault).length,laneSlots:60,completeExpectedCases:Object.keys(expected).length,syntheticPrivateCases:synthetic.length}));
