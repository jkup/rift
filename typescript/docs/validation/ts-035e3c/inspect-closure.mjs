import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,{base,sandbox,retained,binary}=JSON.parse(readFileSync(join(here,'setup.json')));
const hash=b=>createHash('sha256').update(b).digest('hex'),rows=[];
function walk(root,relative=''){for(const e of readdirSync(join(root,relative),{withFileTypes:true})){const p=join(relative,e.name);if(e.isDirectory())walk(root,p);else{const b=readFileSync(join(root,p));rows.push({root,path:p,bytes:b.length,sha256:hash(b)});}}}
for(const path of ['src','tools/test262','test','probes','node_modules/yaml','node_modules/typescript','node_modules/@types/node','node_modules/undici-types','node_modules/@typescript/typescript-win32-x64','build/node'])walk(join(sandbox,path));
for(const row of rows){const relative=resolve(row.root,row.path).slice(sandbox.length+1);assert.equal(hash(readFileSync(join(base,relative))),row.sha256,relative);}
for(const row of rows.filter(r=>r.root===join(sandbox,'build/node'))){assert.equal(hash(readFileSync(join(retained,'build/node',row.path))),row.sha256,'accepted retained Node '+row.path);}
assert.equal(hash(readFileSync(join(sandbox,'build/native',binary.binary))),binary.sha256);
writeFileSync(join(here,'dependency-closure.json'),JSON.stringify({node:process.execPath,nodeSha256:hash(readFileSync(process.execPath)),binary,rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({checked:rows.length,retainedNodeMatchesAcceptedE3b:true,binary}));
