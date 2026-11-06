// Evidence-only, cmd-specific read-only OS identity policy. No child process.
import assert from 'node:assert/strict';
import {lstatSync,realpathSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const system='C:\\WINDOWS\\system32\\cmd.exe';
const component='C:\\Windows\\WinSxS\\amd64_microsoft-windows-commandprompt_31bf3856ad364e35_10.0.26100.9549_none_26c71961ca689840\\cmd.exe';
const digest='15cd209c995b7d3009c91ca40892d5b8f1fb162f3e5f10716642ea278e8e0d7b';
const paths=[system,component];
const chains=[['C:\\','C:\\WINDOWS','C:\\WINDOWS\\system32',system],['C:\\','C:\\Windows','C:\\Windows\\WinSxS','C:\\Windows\\WinSxS\\amd64_microsoft-windows-commandprompt_31bf3856ad364e35_10.0.26100.9549_none_26c71961ca689840',component]];
const keys=(o,n)=>{assert(o&&Object.getPrototypeOf(o)===Object.prototype);assert.deepEqual(Object.keys(o).sort(),n.slice().sort());};
function ancestry(rows,index){
 assert.equal(rows.length,chains[index].length);
 for(let i=0;i<rows.length;i++){const r=rows[i];keys(r,['path','canonical','kind','symbolicLink','attributes']);assert.equal(r.path,chains[index][i]);assert.equal(r.canonical,r.path);assert.equal(r.kind,i===rows.length-1?'file':'directory');assert.equal(r.symbolicLink,false);assert(Number.isInteger(r.attributes)&&r.attributes>=0&&r.attributes<0xffffffff);assert.equal(r.attributes&0x400,0,'cmd ancestry reparse point');assert.equal(Boolean(r.attributes&0x10),r.kind==='directory');}
}
export function validateCmdIdentity(snapshot,cmdPath,cmdSha256){
 assert.equal(cmdPath,system);assert.equal(cmdSha256,digest);
 keys(snapshot,['records','errors']);assert.deepEqual(snapshot.errors,[],'cmd identity read errors');assert.equal(snapshot.records.length,2);
 snapshot.records.forEach((r,i)=>{keys(r,['path','canonical','dev','ino','nlink','bytes','sha256','ancestry']);assert.equal(r.path,paths[i]);assert.equal(r.canonical,paths[i]);assert.equal(r.dev,'1045235170');assert.equal(r.ino,'562949954062573');assert.equal(r.nlink,'2');assert.equal(r.bytes,'339968');assert.equal(r.sha256,digest);ancestry(r.ancestry,i);});
}
export function observeCmdIdentity(){
 const snapshot={records:[],errors:[]};let library;
 const retain=(stage,path,e)=>snapshot.errors.push({stage,path,name:e.name,code:e.code??null,message:e.message,stack:e.stack??null});
 try{
  // Lazy built-in FFI load: inert validators never load a DLL. Fixed Win64
  // DWORD GetFileAttributesW(LPCWSTR), with a live null-terminated UTF-16 buffer.
  const {DynamicLibrary}=createRequire(import.meta.url)('node:ffi');
  library=new DynamicLibrary('C:\\WINDOWS\\system32\\kernel32.dll');
  const attributes=library.getFunction('GetFileAttributesW',{return:'uint32',arguments:['buffer']});
  for(let index=0;index<paths.length;index++){
   const path=paths[index],record={path};snapshot.records.push(record);
   try{
    record.ancestry=chains[index].map(name=>{const s=lstatSync(name),buffer=Buffer.from(name+'\0','utf16le');const flags=attributes(buffer);assert.notEqual(flags,0xffffffff,'GetFileAttributesW failed: '+name);return {path:name,canonical:realpathSync(name),kind:s.isDirectory()?'directory':s.isFile()?'file':'other',symbolicLink:s.isSymbolicLink(),attributes:flags};});
    ancestry(record.ancestry,index); // Never hash through rejected ancestry.
    const before=lstatSync(path,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink());
    const bytes=readFileSync(path),after=lstatSync(path,{bigint:true});
    for(const key of ['dev','ino','nlink','size'])assert.equal(after[key],before[key],'cmd changed during identity read');
    Object.assign(record,{canonical:realpathSync(path),dev:String(after.dev),ino:String(after.ino),nlink:String(after.nlink),bytes:String(bytes.length),sha256:createHash('sha256').update(bytes).digest('hex')});
    assert.equal(after.size,BigInt(bytes.length));
   }catch(e){retain('read-cmd-identity',path,e);}
  }
 }catch(e){retain('load-read-only-attributes',null,e);}
 finally{if(library){try{library.close();}catch(e){retain('close-read-only-attributes',null,e);}}}
 return snapshot;
}
