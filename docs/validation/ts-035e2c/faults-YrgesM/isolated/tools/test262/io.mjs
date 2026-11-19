
import * as fs from 'node:fs/promises';import {c} from './fault.mjs';
async function operation(name,fn,destination=false) {
 const item=c.queue?.[0]; if(item?.name===name && (!item.destination || destination)){c.queue.shift();c.trace.push(name);throw Object.assign(Error(name),{code:item.code});}
 c.trace.push(name);
 const fail=c.fail===name;
 if(fail && !c.after) {c.fail=null;throw Object.assign(Error('injected '+name),{code:c.errno??'EIO'});}
 const result=await fn();
 if(fail && c.after) {c.fail=null;throw Object.assign(Error('after '+name),{code:'EIO'});}
 return result;
}
export const mkdir=(...a)=>operation('mkdir',()=>fs.mkdir(...a));
export const lstat=(...a)=>operation('lstat',()=>fs.lstat(...a),String(a[0]).endsWith('checkpoint-0.json'));
export const realpath=(...a)=>operation('realpath',()=>fs.realpath(...a));
export const link=(...a)=>operation('link',()=>fs.link(...a));
export const unlink=(...a)=>operation('unlink',()=>fs.unlink(...a));
export const readFile=(...a)=>operation('read',()=>fs.readFile(...a));
export async function open(...a){const h=await operation('open',()=>fs.open(...a));return {
 writeFile:async b=>operation('write',async()=>{if(c.partial){await h.writeFile(b.subarray(0,17));throw Error('partial write');}return h.writeFile(b);}),
 sync:()=>operation('sync',()=>h.sync()),close:()=>operation('close',()=>h.close())};}
