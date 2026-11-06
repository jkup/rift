import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,cpSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,{base,sandbox,retained,binary}=JSON.parse(readFileSync(join(here,'setup.json')));
const hash=b=>createHash('sha256').update(b).digest('hex'),out=mkdtempSync(join(base,'build/ts035e3c-observation-')),rows=[];
for(const p of ['src','tools','fixtures','package.json','package-lock.json','tsconfig.json','node_modules/yaml'])cpSync(join(base,p),join(out,p),{recursive:true});
cpSync(join(retained,'build/node'),join(out,'build/node'),{recursive:true});
cpSync(join(retained,'build/native/observation-driver.exe'),join(out,'build/native/observation-driver.exe'),{recursive:true});
assert(!existsSync(join(out,'build/node/src/script-producer-request.js')));
function walk(root,relative=''){for(const e of readdirSync(join(root,relative),{withFileTypes:true})){const p=join(relative,e.name);if(e.isDirectory())walk(root,p);else rows.push({root,path:p,sha256:hash(readFileSync(join(root,p)))});}}
for(const p of ['src','tools','fixtures','node_modules/yaml','build/node'])walk(join(out,p));
for(const r of rows){const p=join(r.root,r.path).slice(out.length+1);assert.equal(hash(readFileSync(join(p.startsWith('build')?retained:base,p))),r.sha256,p);}
assert.equal(hash(readFileSync(join(out,'build/native',binary.binary))),binary.sha256);
writeFileSync(join(here,'observation-setup.json'),JSON.stringify({sandbox:out,retained,binary,rows,excludedSharedStaleOutput:'build/node/src/script-producer-request.js',claim:'Fresh copied accepted generated closure, no build; original shared generated outputs unchanged'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({sandbox:out,verified:rows.length,withdrawnHelperAbsent:true}));
