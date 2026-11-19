// Retrieval only; no engine execution. Existing evidence is never rewritten.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function get(url){const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${url}`);return Buffer.from(await r.arrayBuffer());}
const url='https://262.ecma-international.org/16.0/';
const b=await get(url),html=b.toString();
if(sha(b)!=='6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713')throw Error('edition changed');
const ids=['sec-property-descriptor-specification-type','sec-validateandapplypropertydescriptor','sec-ordinaryget','sec-ordinaryset','sec-ordinarysetwithowndescriptor','sec-arraysetlength','sec-string-exotic-objects-defineownproperty-p-desc','sec-addrestrictedfunctionproperties','sec-%throwtypeerror%','sec-createintrinsics','sec-forbidden-extensions','sec-candeclareglobalfunction','sec-createglobalfunctionbinding'];
const excerpts=ids.map(id=>{const at=html.indexOf(`id="${id}"`);if(at<0)throw Error(id);const start=html.lastIndexOf('<emu-clause',at),re=/<emu-clause\b|<\/emu-clause>/g;re.lastIndex=start;let depth=0,end=start;for(let m;(m=re.exec(html));){depth+=m[0][1]==='/'?-1:1;if(depth===0){end=re.lastIndex;break;}}return {id,text:html.slice(start,end).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()};});
writeFileSync(new URL('spec.json',import.meta.url),JSON.stringify({url,sha256:sha(b),bytes:b.length,excerpts},null,2)+'\n');
const pin='d553e7b52501fbc47eae981c8d0fa7a5c26d0171';
const tree=JSON.parse((await get(`https://api.github.com/repos/engine262/engine262/git/trees/${pin}?recursive=1`)).toString());
const paths=tree.tree.map(e=>e.path).filter(p=>p.startsWith('src/')&&(/ordinary-objects|property-descriptor|FunctionPrototype|ThrowTypeError/.test(p)));
paths.push('src/abstract-ops/function-operations.mts','src/abstract-ops/objects.mts','src/abstract-ops/spec-types.mts','src/abstract-ops/realms.mts','LICENSE');
const files=[];for(const path of paths){const url=`https://raw.githubusercontent.com/engine262/engine262/${pin}/${path}`,b=await get(url);files.push({path,url,sha256:sha(b),bytes:b.length,text:b.toString()});}
writeFileSync(new URL('engine.json',import.meta.url),JSON.stringify({pin,files},null,2)+'\n');
console.log(JSON.stringify({clauses:ids.length,paths}));
