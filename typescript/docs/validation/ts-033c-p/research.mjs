import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const url='https://262.ecma-international.org/16.0/';
const response=await fetch(url);if(!response.ok)throw Error(String(response.status));
const bytes=Buffer.from(await response.arrayBuffer()),text=bytes.toString('utf8');
const sha256=createHash('sha256').update(bytes).digest('hex');
if(sha256!=='6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713')throw Error('fixed edition hash changed');
const excerpts=[];
for(const id of ['sec-setrealmglobalobject','sec-setdefaultglobalbindings','sec-globalthis','sec-value-properties-of-the-global-object','sec-function-properties-of-the-global-object','sec-constructor-properties-of-the-global-object']){
const at=text.indexOf(`id="${id}"`);if(at<0)throw Error(id); const start=text.lastIndexOf("<emu-clause",at);
const tags=/<emu-clause\b|<\/emu-clause>/g;tags.lastIndex=start;let depth=0,end=start;
for(let m;(m=tags.exec(text));){depth+=m[0][1]==='/'?-1:1;if(depth===0){end=tags.lastIndex;break;}}
excerpts.push({id,text:text.slice(start,end).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()});
}
writeFileSync(new URL('supplemental-spec.json',import.meta.url),JSON.stringify({url,sha256,bytes:bytes.length,excerpts},null,2)+'\n');
console.log('Verified fixed edition hash; retained six bootstrap/global clauses');
