// No top-level native load or process invocation. The gated proposal is the sole live caller.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {parse,join,relative,sep} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {hash} from './files.mjs';
import {validateAliases} from './policy.mjs';
export function openAttributes(){const {DynamicLibrary}=createRequire(import.meta.url)('node:ffi');const library=new DynamicLibrary('C:\\WINDOWS\\system32\\kernel32.dll');const call=library.getFunction('GetFileAttributesW',{return:'uint32',arguments:['buffer']});return {get:path=>call(Buffer.from(path+'\0','utf16le')),close:()=>library.close()};}
export function parseAliasList(raw,named){const lines=new TextDecoder('utf-8',{fatal:true}).decode(raw).split(/\r?\n/).filter(Boolean);assert(lines.length>0&&lines.length<=8);assert(lines.every(s=>s.startsWith('\\')&&!s.startsWith('\\\\')&&!s.includes('..')));const names=lines.map(s=>parse(named).root.slice(0,2)+s).sort();assert.equal(new Set(names.map(s=>s.toLowerCase())).size,names.length);return names;}
export function observeNamed(path,attributes){
 let part=parse(path).root;const chain=[];for(const name of [part,...relative(part,path).split(sep).filter(Boolean)]){if(name!==parse(path).root)part=join(part,name);const s=fs.lstatSync(part,{bigint:true}),flags=attributes(part);assert.notEqual(flags,0xffffffff);assert.equal(flags&0x400,0);assert(!s.isSymbolicLink());chain.push({path:part,canonical:fs.realpathSync(part),dev:String(s.dev),ino:String(s.ino),kind:s.isDirectory()?'directory':s.isFile()?'file':'other',attributes:flags});}
 const before=fs.lstatSync(path,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink());assert(before.size<=33554432n);const b=fs.readFileSync(path),after=fs.lstatSync(path,{bigint:true});for(const k of ['dev','ino','nlink','size'])assert.equal(before[k],after[k]);
 return {path,canonical:fs.realpathSync(path),dev:String(after.dev),ino:String(after.ino),nlink:String(after.nlink),bytes:b.length,sha256:hash(b),chain};
}
export function observeAliases(policy,attributes,cwd,environment){
 assert(environment&&typeof environment==='object');
 const result={snapshot:{groups:[],utility:observeNamed(policy.utility.path,attributes)},calls:[],error:null};
 try{
  assert.deepEqual(result.snapshot.utility,policy.utility);
  for(const expected of policy.groups){
   const argv=['hardlink','list',expected.named];const r=spawnSync(policy.utility.path,argv,{cwd,env:environment,windowsHide:true,timeout:5000,maxBuffer:65536,stdio:['ignore','pipe','pipe']});
   const record={executable:policy.utility.path,argv,exit:r.status,signal:r.signal,error:r.error?{name:r.error.name,code:r.error.code??null,message:r.error.message}:null,stdoutHex:(r.stdout??Buffer.alloc(0)).toString('hex'),stderrHex:(r.stderr??Buffer.alloc(0)).toString('hex')};result.calls.push(record);
   assert.equal(record.error,null);assert.equal(record.exit,0);assert.equal(record.signal,null);assert.equal(record.stderrHex,'');
   const names=parseAliasList(r.stdout,expected.named);assert.deepEqual(names,expected.names);result.snapshot.groups.push({named:expected.named,names,records:names.map(p=>observeNamed(p,attributes))});
  }
  validateAliases(result.snapshot,policy);assert.deepEqual(observeNamed(policy.utility.path,attributes),policy.utility);
 }catch(e){result.error={name:e.name,message:e.message};}
 return result;
}
