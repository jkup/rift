import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,lstatSync,realpathSync,mkdtempSync} from 'node:fs';
import {resolve,parse,relative,sep,join} from 'node:path';
const source=readFileSync(new URL('../docs/validation/ts-035e3h-capture-p/runner.mjs.proposed.txt',import.meta.url),'utf8');
assert(source.includes("const root=exact(join(c.root,'capture')),files=[];"));
function exact(p,directory=false) {
 const path=resolve(p);let part=parse(path).root;
 for(const item of relative(part,path).split(sep).filter(Boolean)){part=join(part,item);assert(!lstatSync(part).isSymbolicLink(),'alias '+part);}
 assert.equal(realpathSync(path),path,'spelling '+path);const s=lstatSync(path);
 assert(directory?s.isDirectory():s.isFile()&&s.nlink===1,'kind/links '+path);return path;
}
const dir=mkdtempSync(resolve('build/ts035e3h-directory-'));
let rejected;try{exact(dir);}catch(e){rejected={code:e.code,message:e.message};}
assert.equal(rejected?.code,'ERR_ASSERTION');assert.match(rejected.message,/kind\/links/);
assert.equal(exact(dir,true),dir);
const result={path:dir,defaultCall:rejected,explicitDirectoryAccepted:true,compilerInvocations:0};
writeFileSync(new URL('./ts035e3h-capture-root-directory.json',import.meta.url),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify(result));
