import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const here=import.meta.dirname,root=resolve(here,'../../../..'),{sandbox}=JSON.parse(readFileSync(join(here,'run-location.json'))),hash=b=>createHash('sha256').update(b).digest('hex');
const stages=JSON.parse(readFileSync(join(here,'final-stages.json')));assert.equal(stages.length,40);assert(stages.every(r=>r.status===0&&r.signal===null&&r.error===null));
const cache=JSON.parse(readFileSync(join(here,'cache-inspection/result.json')));assert.equal(cache.onlyFieldChanged,'ino');assert.equal(cache.changed.length,54);assert.equal(cache.artifacts,98);assert(cache.allOriginalAndCopiedObjectBytesMatchRecordedSha256);
const copied=JSON.parse(readFileSync(join(here,'copied-inputs.json'))),prior=new Map(copied.map(r=>[r.path,r.sha256]));
for(const row of copied){
 assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
 const relative=row.path.slice(root.length+1).replaceAll('\\','/');
 if(relative===cache.path){assert.equal(row.sha256,cache.beforeSha256);assert.equal(hash(readFileSync(join(sandbox,relative))),cache.afterSha256);}
 else if(!relative.startsWith('docs/validation/'))assert.equal(hash(readFileSync(join(sandbox,relative))),row.sha256,'sandbox input '+relative);
}
for(const row of JSON.parse(readFileSync(join(here,'fresh-native-outputs.json'))))assert.equal(hash(readFileSync(join(sandbox,'build/native',row.binary))),row.sha256,row.binary);
const repair=JSON.parse(readFileSync(join(here,'sandbox-input-repair.json')));assert.equal(hash(readFileSync(repair.source)),repair.sha256);assert.equal(hash(readFileSync(repair.target)),repair.sha256);
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const inherited=files(join(here,'inherited')).map(path=>{const relative=path.slice(join(here,'inherited').length+1),bytes=readFileSync(path);assert(bytes.equals(readFileSync(join(sandbox,relative))));return {path:relative,sha256:hash(bytes),originalSha256:prior.get(join(root,relative))??null};});
for(const path of files(join(here,'producer-artifacts'))){const relative=path.slice(join(here,'producer-artifacts').length+1);assert(readFileSync(path).equals(readFileSync(join(sandbox,'build',relative))),relative);}
const producers=JSON.parse(readFileSync(join(here,'producer-artifacts.json')));assert.equal(producers.children.length,66);assert.equal(producers.negativeDirectories.length,114);assert.equal(producers.spoofDirectories.length,8);
assert(!existsSync(join(sandbox,'src/script-producer-request.ts')));assert(!existsSync(join(sandbox,'build/node/src/script-producer-request.js')));
writeFileSync(join(here,'completion.json'),JSON.stringify({stages:40,originalInputsUnchanged:copied.length,additionalProtectedFixture:repair.sha256,producerLiterals:66,driverNegatives:114,lateFailures:8,recordSpoofs:8,sourceModuleAbsent:true,generatedModuleAbsent:true,cacheInodeRefresh:cache,all71FreshNativeBinaryHashesUnchanged:true,inherited},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({stages:40,originalInputsUnchanged:copied.length,children:66,negatives:114,spoofs:8,inherited:inherited.length,cacheInodeOnlyChanges:54}));
