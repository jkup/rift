// Extractable filesystem operations. No process launch; all callers supply explicit paths.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,parse,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export function ordinary(path,directory=false,attributes){
 const p=resolve(path);let part=parse(p).root;const paths=[part];for(const n of relative(part,p).split(sep).filter(Boolean)){part=join(part,n);paths.push(part);}
 for(let i=0;i<paths.length;i++){const name=paths[i],s=fs.lstatSync(name);assert(!s.isSymbolicLink(),'alias '+name);assert.equal(fs.realpathSync(name),name,'canonical '+name);if(attributes){const a=attributes(name);assert.notEqual(a,0xffffffff);assert.equal(a&0x400,0,'reparse '+name);}if(i<paths.length-1)assert(s.isDirectory(),'ancestor kind');}
 const s=fs.lstatSync(p);assert(directory?s.isDirectory():s.isFile()&&s.nlink===1,'kind/links '+p);return p;
}
export function readIdentity(path,expected,attributes,maxBytes=33554432){
 ordinary(path,false,attributes);
 const before=fs.lstatSync(path,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink());assert.equal(before.size,BigInt(expected.bytes));assert(before.size<=BigInt(maxBytes));
 const b=fs.readFileSync(path),after=fs.lstatSync(path,{bigint:true});for(const k of ['dev','ino','nlink','size'])assert.equal(before[k],after[k]);
 assert.equal(hash(b),expected.sha256);return {bytes:b,identity:{path,dev:String(after.dev),ino:String(after.ino),nlink:String(after.nlink),bytes:b.length,sha256:hash(b)}};
}
const owners=new WeakSet(),staged=new WeakSet();
export function reserve(root,attributes){root=resolve(root);ordinary(resolve(root,'..'),true,attributes);fs.mkdirSync(root);const owner=Object.freeze({root});owners.add(owner);return owner;}
export function stage(owner,dirs,copies,texts,attributes){
 assert(owners.has(owner),'unknown owner');assert(!staged.has(owner),'already staged');staged.add(owner);const root=owner.root;ordinary(root,true,attributes);
 for(const dir of dirs){assert(!dir.includes('..')&&!dir.startsWith('/'));fs.mkdirSync(join(root,dir));ordinary(join(root,dir),true,attributes);}
 const inputs=[];
 for(const c of copies){assert(resolve(root,c.to).startsWith(root+sep));let b;if(c.data!==undefined){assert.equal(c.from,'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\mscorlib.dll');assert.equal(c.sha256,'11ac114c43ecf6996bef58ba3c99fba3693a4560a84eeadde54d193060dc626c');assert(Buffer.isBuffer(c.data));assert.equal(c.data.length,c.bytes);assert.equal(hash(c.data),c.sha256);b=c.data;}else b=readIdentity(c.from,c,attributes).bytes;fs.writeFileSync(join(root,c.to),b,{flag:'wx'});const own=readIdentity(join(root,c.to),c,attributes);inputs.push(own.identity);}
 for(const t of texts){assert(resolve(root,t.to).startsWith(root+sep));const b=Buffer.from(t.utf8);fs.writeFileSync(join(root,t.to),b,{flag:'wx'});inputs.push(readIdentity(join(root,t.to),{bytes:b.length,sha256:hash(b)},attributes).identity);}
 return inputs;
}
export function snapshot(root,policy,attributes){
 ordinary(root,true,attributes);const rows=[],failures=[];let count=0,bytes=0,halt=false;
 function walk(dir){const handle=fs.opendirSync(dir);try{for(let entry;(entry=handle.readSync())!==null;){if(halt)break;const path=join(dir,entry.name),name=relative(root,path).replaceAll('\\','/'),s=fs.lstatSync(path,{bigint:true});assert(s.size<=BigInt(Number.MAX_SAFE_INTEGER),'metadata size cap');if(++count>policy.maxFiles+128){failures.push('enumeration-cap:'+name);halt=true;break;}
   const a=attributes?attributes(path):s.isSymbolicLink()?0x400:s.isDirectory()?0x10:0;
   if(a===0xffffffff||(a&0x400)||s.isSymbolicLink()){rows.push({path:name,kind:'alias',nlink:Number(s.nlink),bytes:null,sha256:null});continue;}
   if(s.isDirectory()){rows.push({path:name,kind:'directory'});if(name.split('/').length>16){failures.push('directory-depth:'+name);continue;}walk(path);continue;}
   if(!s.isFile()||s.nlink!==1n){rows.push({path:name,kind:'nonordinary',nlink:Number(s.nlink),bytes:Number(s.size),sha256:null});continue;}
   bytes+=Number(s.size);if(bytes>policy.maxBytes||s.size>16777216){rows.push({path:name,kind:'file',nlink:Number(s.nlink),bytes:Number(s.size),sha256:null});failures.push('retention-cap:'+name);continue;}
   ordinary(path,false,attributes);const b=fs.readFileSync(path),after=fs.lstatSync(path,{bigint:true});assert.equal(after.ino,s.ino);assert.equal(after.dev,s.dev);assert.equal(after.nlink,s.nlink);assert.equal(b.length,Number(s.size));assert.equal(after.size,s.size);rows.push({path:name,kind:'file',nlink:Number(s.nlink),bytes:b.length,sha256:hash(b)});
  }}finally{handle.closeSync();}}
 walk(root);return {rows,failures,complete:!halt&&failures.length===0};
}
