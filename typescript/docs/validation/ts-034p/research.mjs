import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const pin='d553e7b52501fbc47eae981c8d0fa7a5c26d0171';
const records=[];
const clauses=['sec-ordinarycallbindthis','sec-ecmascript-function-objects-construct-argumentslist-newtarget','sec-ordinaryhasinstance','sec-instanceofoperator','sec-try-statement-runtime-semantics-evaluation','sec-runtime-semantics-catchclauseevaluation','sec-error-constructor','sec-nativeerror-object-structure','sec-runtime-semantics-caseblockevaluation','sec-postfix-increment-operator'];
for(const url of ['https://262.ecma-international.org/16.0/',...['src/abstract-ops/function-operations.mts','src/runtime-semantics/TryStatement.mts','src/runtime-semantics/RelationalExpression.mts','src/intrinsics/Error.mts','LICENSE'].map(p=>`https://raw.githubusercontent.com/engine262/engine262/${pin}/${p}`)]){
 const response=await fetch(url); if(!response.ok)throw Error(`${response.status} ${url}`);
 const bytes=Buffer.from(await response.arrayBuffer()),text=bytes.toString('utf8');
 const record={url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 if(url.includes('ecma-international')){
  record.excerpts=clauses.map(id=>{const start=text.indexOf(`<emu-clause id="${id}"`);if(start<0)throw Error(`missing ${id}`);const tags=/<emu-clause\b|<\/emu-clause>/g;tags.lastIndex=start;let depth=0,end=start;for(let m;(m=tags.exec(text));){depth+=m[0][1]==='/'?-1:1;if(!depth){end=tags.lastIndex;break;}}return{id,text:text.slice(start,end).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()};});
 }else record.lines=text.split('\n').map((text,i)=>({line:i+1,text}));
 records.push(record);
}
writeFileSync(new URL('upstream.json',import.meta.url),JSON.stringify(records,null,2)+'\n');
console.log(records.map(r=>`${r.sha256} ${r.url}`).join('\n'));
