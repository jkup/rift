import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const RUN_ENABLED=false;
const hash=b=>createHash('sha256').update(b).digest('hex');
export function verifyBound(raw,expectedHash,repo){
 assert.equal(hash(raw),expectedHash,'binding document hash');const rows=JSON.parse(raw);assert(Array.isArray(rows));const seen=new Set();
 for(const r of rows){assert.deepEqual(Object.keys(r).sort(),['bytes','path','sha256']);assert(!seen.has(r.path));seen.add(r.path);assert(r.path&&!r.path.includes('..')&&!r.path.includes('\\')&&!r.path.includes(':')&&!r.path.startsWith('/'));const p=resolve(repo,r.path);assert(p.startsWith(resolve(repo)+'\\'));let part=p;for(;;){const s=fs.lstatSync(part);assert(!s.isSymbolicLink());assert.equal(fs.realpathSync(part),part);if(part===p)assert(s.isFile()&&s.nlink===1);else assert(s.isDirectory());const parent=dirname(part);if(parent===part)break;part=parent;}
  const a=fs.lstatSync(p,{bigint:true});assert.equal(a.size,BigInt(r.bytes));assert(a.size<=134217728n);const b=fs.readFileSync(p),z=fs.lstatSync(p,{bigint:true});for(const k of ['dev','ino','nlink','size'])assert.equal(a[k],z[k]);assert.equal(hash(b),r.sha256,r.path);
 }
 return rows.length;
}
export async function run(){
 assert(RUN_ENABLED,'INERT_RECORDER_ENTRY_GATE');
 const here=import.meta.dirname,repo=resolve(here,'../../../..');verifyBound(fs.readFileSync(join(here,'runtime-bindings.json')),'a47a70d8f5693a90450f85761d163655538cd2440d7c1c123486c65732564965',repo);
 const controller=await import('./controller.mjs');return controller.run();
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await run();
