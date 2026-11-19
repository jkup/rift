// One authorized fixed-adapter observation; exclusive outputs make retry impossible here.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';

import {PINS} from '../ts-035e3g-empty/pins.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(name,value)=>fs.writeFileSync(join(here,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const sources=JSON.parse(fs.readFileSync(join(here,'source-identities.json')));
const pins=[PINS.bindings,PINS.inventory,PINS.manifest];
const snapshot=()=>[...sources,...pins].map(r=>{const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);return {path:r.path,bytes:b.length,sha256:hash(b)};});
save('started.json',{base:'558613a4d4aeed6a279598e5483da16a063340b5',maxInvocations:1});
const status={invocations:0,failures:[],outcome:null};let before;
try{
 before=snapshot();save('before.json',before);
 const {inventoryBoundArchive}=await import('../ts-035e3g-empty/adapter.mjs');
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
