import * as fs from 'node:fs';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
export const INVENTORY_LIMITS=Object.freeze({entries:10,directories:6,files:4,depth:3,perFileBytes:8192,aggregateBytes:32768});
// Inspection precedes status/inventory publication, avoiding self-reference.
// Startup caches have no exemptions: an unexpected entry stops before opening it.
export function boundedInventory(contract,io=fs,limits=INVENTORY_LIMITS){
  const rows=[],errors=[],counts={entries:0,directories:0,files:0,bytes:0};let stopped=false;
  const dirs=new Set(['','tmp','home','home/AppData','home/AppData/Roaming','home/AppData/Local']);
  const files=new Set([...contract.inputs.map(r=>relative(contract.root,r.destination).replaceAll('\\','/')),contract.outputs.stdout,contract.outputs.stderr]),seen=new Set();
  const fail=(operation,path,error)=>{errors.push({operation,path,error:String(error)});stopped=true;};
  function file(path,name,s){
    if(++counts.files>limits.files){fail('file-count',name,'limit');return;}
    if(!files.has(name)){rows.push({path:name,kind:'unexpected-file',bytes:s.size,read:false});fail('unexpected-file',name,'retained without read');return;}
    if(!Number.isSafeInteger(s.size)||s.size<0||s.size>limits.perFileBytes||counts.bytes+s.size>limits.aggregateBytes){rows.push({path:name,kind:'file',bytes:s.size,read:false});fail('byte-limit',name,'pre-read limit');return;}
    let fd;
    try{
      fd=io.openSync(path,'r');const a=io.fstatSync(fd);
      if(!a.isFile()||a.nlink!==1||a.dev!==s.dev||a.ino!==s.ino||a.size!==s.size||a.mtimeMs!==s.mtimeMs||a.ctimeMs!==s.ctimeMs)throw Error('changed before read');
      const b=Buffer.alloc(s.size+1);let n=0;
      while(n<b.length){const got=io.readSync(fd,b,n,b.length-n,n);if(got===0)break;if(!Number.isInteger(got)||got<0||got>b.length-n)throw Error('invalid read count');n+=got;}
      const z=io.fstatSync(fd);
      if(n!==s.size||z.size!==a.size||z.mtimeMs!==a.mtimeMs||z.ctimeMs!==a.ctimeMs||z.nlink!==1)throw Error('changed during bounded read');
      counts.bytes+=n;seen.add(name);rows.push({path:name,kind:'file',bytes:n,sha256:createHash('sha256').update(b.subarray(0,n)).digest('hex'),read:true});
    }catch(error){fail('file-read',name,error);}finally{if(fd!==undefined)try{io.closeSync(fd);}catch(error){fail('file-close',name,error);}}
  }
  function walk(path,name,depth){
    if(stopped)return;
    if(depth>limits.depth){fail('depth',name,'limit before traversal');return;}
    let s;try{s=io.lstatSync(path);}catch(error){fail('lstat',name,error);return;}
    if(s.isSymbolicLink()){fail('alias',name,'retained without traversal/read');return;}
    if(s.isFile()){if(s.nlink!==1){fail('hardlink',name,'retained without read');return;}file(path,name,s);return;}
    if(!s.isDirectory()){fail('kind',name,'unsupported');return;}
    if(++counts.directories>limits.directories){fail('directory-count',name,'limit');return;}
    if(!dirs.has(name)){rows.push({path:name,kind:'unexpected-directory',read:false});fail('unexpected-directory',name,'retained without traversal');return;}
    seen.add(name);rows.push({path:name,kind:'directory'});let dir;
    try{dir=io.opendirSync(path);while(!stopped){const child=dir.readSync();if(child===null)break;if(++counts.entries>limits.entries){fail('entry-count',name,'limit before child stat/read');break;}if(!child.name||child.name==='.'||child.name==='..'||/[\\/]/.test(child.name)){fail('entry-name',name,'invalid');break;}walk(join(path,child.name),name?name+'/'+child.name:child.name,depth+1);}}
    catch(error){fail('directory-read',name,error);}finally{if(dir)try{dir.closeSync();}catch(error){fail('directory-close',name,error);}}
  }
  walk(contract.root,'',0);
  if(!stopped)for(const name of [...dirs,...files])if(!seen.has(name))fail('missing',name,'expected entry absent');
  return {complete:!stopped,rows,errors,counts,limits:{...limits},unvisitedEntries:stopped?'unknown':0,startupCachePolicy:'unexpected entry stops; no exemptions',publicationFilesExcluded:['status.json','inventory.json']};
}
