// Public adapter has no source/path/parser injection. Importing it reads no files.
import {resolve,join} from 'node:path';
import {collect,checkBindings,error,ArchiveFault} from './_internal/archive-core.mjs';
import {readPinned,readOrdinary} from './_internal/files.mjs';
import {PINS} from './pins.mjs';
import {BINDINGS} from './bindings.mjs';
const repo=resolve(import.meta.dirname,'../../../..');
const load=p=>JSON.parse(readPinned(join(repo,p.path),p));
export function validateBindings(candidate){return checkBindings(candidate,BINDINGS);}
export function inventoryBoundArchive(){
 try{
  const expected=load(PINS.bindings);
  return collect(expected,expected,{
   inventory:()=>load(PINS.inventory).files,
   seal:()=>new Map(load(PINS.manifest).filter(r=>r.path.startsWith(PINS.blobs+'/')&&r.path.endsWith('.gz')).map(r=>[r.path.slice(PINS.blobs.length+1,-3),r])),
   readChunk:(digest,max)=>readOrdinary(join(repo,PINS.blobs,digest+'.gz'),max)
  });
 }catch(e){if(e instanceof ArchiveFault)return error(null,e.code);throw e;}
}
