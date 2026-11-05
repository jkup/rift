import {readdir,lstat,readlink,unlink,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const own=resolve('docs/validation/ts-035e2c'),rows=[];
for(const entry of await readdir(own,{withFileTypes:true}))if(entry.isDirectory()&&entry.name.startsWith('run-')){
 const directory=join(own,entry.name,'filesystem');
 for(const name of ['alias-junction','alias-dir']){
  const path=join(directory,name);let info;try{info=await lstat(path);}catch(e){if(e.code==='ENOENT')continue;throw e;}
  assert(info.isSymbolicLink());const target=await readlink(path);assert.equal(resolve(target),directory);
  rows.push({path,target,verifiedOwnedAlias:true});await unlink(path);
 }
}
await writeFile(join(own,'owned-alias-cleanup.json'),JSON.stringify(rows,null,2)+'\n');console.log(rows.length);
