// One authorized fixed-adapter observation; exclusive outputs make retry impossible here.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {inventoryBoundArchive} from '../ts-035e3g/adapter.mjs';
import {PINS} from '../ts-035e3g/pins.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(name,value)=>fs.writeFileSync(join(here,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const sources=JSON.parse(fs.readFileSync(join(here,'../ts-035e3g/source-identities.json')));
const pins=[PINS.bindings,PINS.inventory,PINS.manifest];
const snapshot=()=>[...sources,...pins].map(r=>{const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);return {path:r.path,bytes:b.length,sha256:hash(b)};});
save('started.json',{base:'ca7c74ed9e321c5c6567e1115bcbcf8dd38987f6',maxInvocations:1});
const status={invocations:0,failures:[],outcome:null};let before;
try{
 before=snapshot();save('before.json',before);
 status.invocations++;
 const result=inventoryBoundArchive();
 const raw=Buffer.from(JSON.stringify(result));
 fs.writeFileSync(join(here,'result.json'),raw,{flag:'wx'});
 status.raw={bytes:raw.length,sha256:hash(raw)};
 status.kind=result.kind;
 status.entries=result.kind==='batch'?result.entries.length:null;
 status.rejections=result.kind==='batch'?result.entries.filter(r=>r.result.kind==='rejected').map(r=>({binding:r.binding,error:r.result.error})):[];
 status.outcome=result.kind!=='batch'||status.rejections.length?'stop-review':'collected-review';
}catch(e){status.outcome='stop-review';status.failures.push({name:e.name,code:e.code??null,message:e.message,stack:e.stack});}
finally{
 try{const after=snapshot();save('after.json',after);assert.deepEqual(after,before);}catch(e){status.outcome='stop-review';status.failures.push({stage:'after',name:e.name,code:e.code??null,message:e.message,stack:e.stack});}
 save('status.json',status);
}
console.log(JSON.stringify(status));
if(status.outcome==='stop-review')process.exitCode=1;
