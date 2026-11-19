// Authorized metadata-only fsutil audit of exactly six previously measured files.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,parse,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const here=import.meta.dirname,hash=b=>createHash('sha256').update(b).digest('hex');
const save=(n,v)=>fs.writeFileSync(join(here,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const expected=JSON.parse(fs.readFileSync(join(here,'../ts-035e3h-build-p/installed-identities.json'))).records.slice(0,6);
const tool='C:\\WINDOWS\\system32\\fsutil.exe',calls=[],report={status:'incomplete',calls,files:[],errors:[],compilerInvocations:0,addTypeInvocations:0};
save('audit-started.json',{namedPaths:expected.map(r=>r.path),maxUtilityInvocations:12,compilerInvocations:0});
let library;
try{
 const {DynamicLibrary}=createRequire(import.meta.url)('node:ffi');library=new DynamicLibrary('C:\\WINDOWS\\system32\\kernel32.dll');
 const attributes=library.getFunction('GetFileAttributesW',{return:'uint32',arguments:['buffer']});
 const identity=path=>{
  const chain=[];let part=parse(path).root;
  for(const name of [part,...relative(part,path).split(sep).filter(Boolean)]){
   if(name!==parse(path).root)part=join(part,name);const s=fs.lstatSync(part,{bigint:true}),flags=attributes(Buffer.from(part+'\0','utf16le'));
   assert.notEqual(flags,0xffffffff);assert.equal(flags&0x400,0,'reparse '+part);assert(!s.isSymbolicLink());
   chain.push({path:part,canonical:fs.realpathSync(part),dev:String(s.dev),ino:String(s.ino),kind:s.isDirectory()?'directory':s.isFile()?'file':'other',attributes:flags});
  }
  assert(chain.slice(0,-1).every(r=>r.kind==='directory'));assert.equal(chain.at(-1).kind,'file');
  const before=fs.lstatSync(path,{bigint:true});assert(before.size<=33554432n);const b=fs.readFileSync(path),after=fs.lstatSync(path,{bigint:true});
  for(const k of ['dev','ino','nlink','size'])assert.equal(before[k],after[k]);
  return {path,canonical:fs.realpathSync(path),dev:String(after.dev),ino:String(after.ino),nlink:String(after.nlink),bytes:b.length,sha256:hash(b),chain};
 };
 report.utilityBefore=identity(tool);
 function list(path,phase,index){
  const r={executable:tool,argv:['hardlink','list',path],cwd:resolve(here),phase,index,exit:null,error:null};calls.push(r);
  let raw;try{raw=execFileSync(tool,r.argv,{cwd:here,windowsHide:true,timeout:5000,maxBuffer:65536,stdio:['ignore','pipe','pipe']});r.exit=0;}catch(e){r.exit=e.status??null;r.error={name:e.name,code:e.code??null,message:e.message};if(e.stdout)fs.writeFileSync(join(here,`aliases-${index}-${phase}.stdout.bin`),e.stdout,{flag:'wx'});if(e.stderr)fs.writeFileSync(join(here,`aliases-${index}-${phase}.stderr.bin`),e.stderr,{flag:'wx'});throw e;}
  fs.writeFileSync(join(here,`aliases-${index}-${phase}.stdout.bin`),raw,{flag:'wx'});r.bytes=raw.length;r.sha256=hash(raw);
  const lines=new TextDecoder('utf-8',{fatal:true}).decode(raw).split(/\r?\n/).filter(Boolean);assert(lines.length>0&&lines.length<=8);assert(lines.every(s=>s.startsWith('\\')&&!s.startsWith('\\\\')&&!s.includes('..')));return lines.map(s=>parse(path).root.slice(0,2)+s).sort();
 }
 for(let i=0;i<expected.length;i++){
  const e=expected[i],before=identity(e.path);for(const k of ['dev','ino','nlink','bytes','sha256'])assert.equal(before[k],e[k]);
  const names=list(e.path,'before',i);assert.equal(new Set(names.map(s=>s.toLowerCase())).size,names.length);assert.equal(names.length,Number(e.nlink));assert(names.some(s=>s.toLowerCase()===e.path.toLowerCase()));
  const aliases=names.map(identity);for(const a of aliases)for(const k of ['dev','ino','nlink','bytes','sha256'])assert.equal(a[k],before[k]);
  const afterNames=list(e.path,'after',i);assert.deepEqual(afterNames,names);const after=names.map(identity);assert.deepEqual(after,aliases);assert.deepEqual(identity(e.path),before);
  report.files.push({named:e.path,before,names,aliases,afterNames,after});
 }
 report.utilityAfter=identity(tool);assert.deepEqual(report.utilityAfter,report.utilityBefore);report.status='passed';
}catch(e){report.errors.push({name:e.name,code:e.code??null,message:e.message,stack:e.stack});process.exitCode=1;}
finally{if(library)library.close();save('alias-audit.json',report);}
console.log(JSON.stringify({status:report.status,files:report.files.length,utilityInvocations:calls.length,errors:report.errors}));
