import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
const here=import.meta.dirname,root=resolve(here,'../../../..'),{sandbox}=JSON.parse(readFileSync(join(here,'run-location.json'))),rel='node_modules/@scriptc/runtime-win32-x64-msvc/runtime-pack.verified.json',hash=b=>createHash('sha256').update(b).digest('hex');
const beforeBytes=readFileSync(join(root,rel)),afterBytes=readFileSync(join(sandbox,rel)),before=JSON.parse(beforeBytes),after=JSON.parse(afterBytes);
mkdirSync(join(here,'cache-inspection'));writeFileSync(join(here,'cache-inspection/before.json'),beforeBytes,{flag:'wx'});writeFileSync(join(here,'cache-inspection/after.json'),afterBytes,{flag:'wx'});
assert.deepEqual(Object.keys(after),Object.keys(before));assert.equal(after.schema,before.schema);assert.equal(after.artifacts.length,98);assert.equal(before.artifacts.length,98);
const changed=[];
for(let n=0;n<before.artifacts.length;n++){
 const a=before.artifacts[n],b=after.artifacts[n];assert.deepEqual(Object.keys(b),Object.keys(a));
 const fields=Object.keys(a).filter(k=>a[k]!==b[k]);if(fields.length){assert.deepEqual(fields,['ino']);changed.push({path:a.path,oldIno:a.ino,newIno:b.ino});assert.equal(lstatSync(join(dirname(join(sandbox,rel)),b.path)).ino,b.ino);}
 assert.equal(hash(readFileSync(join(dirname(join(root,rel)),a.path))),a.sha256,a.path+' original');
 assert.equal(hash(readFileSync(join(dirname(join(sandbox,rel)),b.path))),a.sha256,a.path+' copied object');
}
assert.equal(changed.length,54);
writeFileSync(join(here,'cache-inspection/result.json'),JSON.stringify({path:rel,beforeSha256:hash(beforeBytes),afterSha256:hash(afterBytes),artifacts:98,changed,onlyFieldChanged:'ino',allOriginalAndCopiedObjectBytesMatchRecordedSha256:true,explanation:'scriptc refreshed cached inode identities for 54 artifacts in the ordinary-file copy; no code, content hash, size, timestamp, schema, or pin changed'},null,2)+'\n',{flag:'wx'});
writeFileSync(join(here,'collection-failure.json'),JSON.stringify({stage:'post-suite collection',error:'AssertionError: sandbox input '+rel,expected:hash(beforeBytes),actual:hash(afterBytes),completedSuitesStillPass:true,resolution:'bounded cache inspection validates only inode changes; all runtime object bytes checked independently'},null,2)+'\n',{flag:'wx'});
console.log('PASS 98 runtime object hashes; only 54 copied inode cache fields changed.');
