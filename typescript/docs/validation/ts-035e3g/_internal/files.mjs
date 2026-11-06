import {lstatSync,realpathSync,readFileSync} from 'node:fs';
import {resolve,parse,relative,sep,join} from 'node:path';
import {sha256} from '../reader.mjs';
import {ArchiveFault} from './archive-core.mjs';
export function readOrdinary(path,maxBytes){
 try{
  if(resolve(path)!==path||realpathSync(path)!==path)throw new ArchiveFault('ARCHIVE');
  let part=parse(path).root;
  const root=lstatSync(part);if(!root.isDirectory()||root.isSymbolicLink())throw new ArchiveFault('ARCHIVE');
  const components=relative(part,path).split(sep);
  for(let i=0;i<components.length;i++){part=join(part,components[i]);const s=lstatSync(part);if(s.isSymbolicLink()||(i<components.length-1?!s.isDirectory():!s.isFile()||s.nlink!==1))throw new ArchiveFault('ARCHIVE');}
  const before=lstatSync(path,{bigint:true});if(before.size>BigInt(maxBytes))throw new ArchiveFault('ARCHIVE_LIMIT');
  const bytes=readFileSync(path),after=lstatSync(path,{bigint:true});
  for(const k of ['dev','ino','nlink','size'])if(before[k]!==after[k])throw new ArchiveFault('ARCHIVE');
  if(bytes.length>maxBytes||BigInt(bytes.length)!==after.size)throw new ArchiveFault('ARCHIVE_LIMIT');
  return bytes;
 }catch(e){if(e instanceof ArchiveFault)throw e;throw new ArchiveFault('ARCHIVE');}
}
export function readPinned(path,pin){
 const b=readOrdinary(path,pin.bytes);if(b.length!==pin.bytes||sha256(b)!==pin.sha256)throw new ArchiveFault('ARCHIVE');return b;
}
