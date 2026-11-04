// Retrieval only. Never evaluates guest JavaScript.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const prior=JSON.parse(readFileSync(new URL('../ts-034p/upstream.json',import.meta.url)));
const ids=['sec-evaluatenew','sec-construct','sec-isconstructor','sec-getprototypefromconstructor','sec-getfunctionrealm','sec-function.prototype-%symbol.hasinstance%','sec-makeconstructor'];
const response=await fetch('https://262.ecma-international.org/16.0/');
if(!response.ok)throw Error(String(response.status));
const bytes=Buffer.from(await response.arrayBuffer()),html=bytes.toString();
const sha256=createHash('sha256').update(bytes).digest('hex');
if(sha256!==prior[0].sha256)throw Error('edition bytes changed');
const excerpts=ids.map(id=>{
 const at=html.indexOf(`id="${id}"`),start=html.lastIndexOf('<emu-clause',at);if(at<0||start<0)throw Error(id);
 const tags=/<emu-clause\b|<\/emu-clause>/g;tags.lastIndex=start;let depth=0,end=start;
 for(let m;(m=tags.exec(html));){depth+=m[0][1]==='/'?-1:1;if(!depth){end=tags.lastIndex;break;}}
 return {id,text:html.slice(start,end).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()};
});
writeFileSync(new URL('upstream.json',import.meta.url),JSON.stringify({edition:{url:prior[0].url,sha256,bytes:bytes.length,excerpts},retained:prior.filter((r,i)=>i===0||r.url.includes('function-operations')||r.url.includes('RelationalExpression')||r.url.endsWith('/LICENSE'))},null,2)+'\n');
console.log('PASS pinned edition retrieval; retained engine262 d553e7b');
