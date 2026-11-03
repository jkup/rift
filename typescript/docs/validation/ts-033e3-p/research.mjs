import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const url='https://262.ecma-international.org/16.0/';
const response=await fetch(url);
if(!response.ok)throw Error(String(response.status));
const bytes=Buffer.from(await response.arrayBuffer());
const sha256=createHash('sha256').update(bytes).digest('hex');
if(sha256!=='6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713')throw Error('pin mismatch');
const html=bytes.toString('utf8');
const ids=['sec-static-semantics-isidentifierref','sec-isanonymousfunctiondefinition','sec-runtime-semantics-namedevaluation','sec-assignment-operators-runtime-semantics-evaluation'];
const excerpts=ids.map(id=>{
 const at=html.indexOf(`id="${id}"`);if(at<0)throw Error('missing '+id);
 const start=html.lastIndexOf('<emu-clause',at),tags=/<emu-clause\b|<\/emu-clause>/g;tags.lastIndex=start;
 let depth=0,end=start;for(let m;(m=tags.exec(html));){depth+=m[0][1]==='/'?-1:1;if(depth===0){end=tags.lastIndex;break;}}
 return {id,text:html.slice(start,end).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()};
});
writeFileSync(new URL('naming-spec.json',import.meta.url),JSON.stringify({url,sha256,bytes:bytes.length,excerpts},null,2)+'\n');
console.log(excerpts.map(x=>({id:x.id,text:x.text.slice(0,3000)})));
