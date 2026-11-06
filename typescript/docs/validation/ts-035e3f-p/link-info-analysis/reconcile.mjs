// Offline finite observation checker; no generalized producer schema or authority.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {win32} from 'node:path';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const root='C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3fp-link-info-observation';
const pack=root+'\\node_modules\\@scriptc\\runtime-win32-x64-msvc';
export function reconcile(metadata,literal,ordered,read){
 // Exact full literal freezes all keys, types, values and array order, including
 // observed empty arrays/null. Those values do not mean dependency closure.
 assert.deepEqual(metadata,literal,'observed full literal changed');
 assert.equal(ordered.length,42);assert.equal(metadata.runtime_pack.root,pack);
 assert.equal(metadata.program.object,root+'\\probe.obj');
 assert.equal(metadata.runtime_pack.objects.length,41);
 assert.equal(metadata.link.input_order.length,42);
 const seen=new Set(),result=[];
 for(let i=0;i<42;i++){
  const row=ordered[i],absolute=metadata.link.input_order[i];
  assert.equal(row.index,i);assert.equal(row.role,i===41?'program':'runtime');
  assert(!seen.has(absolute),'duplicate ordered input');seen.add(absolute);
  assert.equal(absolute,row.absolute,'exact input order');
  assert.equal(absolute,root+'\\'+row.path.replaceAll('/','\\'));
  assert(!row.path.includes('\\')&&!row.path.includes(':'));
  assert(row.path.split('/').every(x=>x!==''&&x!=='.'&&x!=='..'));
  assert.equal(win32.normalize(absolute),absolute,'noncanonical path');
  assert.equal(win32.relative(root,absolute).replaceAll('\\','/'),row.path);
  if(i<41){const o=metadata.runtime_pack.objects[i];
   assert.equal(row.path,'node_modules/@scriptc/runtime-win32-x64-msvc/'+o.path);
   assert.equal(absolute,pack+'\\'+o.path.replaceAll('/','\\'));
   assert.equal(o.sha256,row.sha256);assert.equal(o.size,row.bytes);
  }else assert.equal(row.path,'probe.obj');
  const bytes=read(row.path);assert(Buffer.isBuffer(bytes));
  assert.equal(bytes.length,row.bytes,'archive size');assert.equal(hash(bytes),row.sha256,'archive hash');
  result.push({...row,archiveBytesMatched:true});
 }
 return result;
}
