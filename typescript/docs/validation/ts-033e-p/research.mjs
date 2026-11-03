// Retrieval only. No guest or reference-engine execution; writes only here.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const pin='d553e7b52501fbc47eae981c8d0fa7a5c26d0171';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function get(url) { const r=await fetch(url); if(!r.ok)throw Error(`${r.status}: ${url}`);return Buffer.from(await r.arrayBuffer()); }
const url='https://262.ecma-international.org/16.0/';
const bytes=await get(url),html=bytes.toString('utf8');
if(hash(bytes)!=='6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713')throw Error('fixed edition bytes changed');
const ids=['sec-updateempty','sec-getidentifierreference','sec-putvalue','sec-functiondeclarationinstantiation','sec-blockdeclarationinstantiation','sec-runtime-semantics-scriptevaluation','sec-ordinarycallbindthis','sec-ordinaryfunctioncreate','sec-setfunctionname','sec-makeconstructor','sec-variable-statement','sec-block-runtime-semantics-evaluation','sec-if-statement-runtime-semantics-evaluation','sec-while-statement'];
const excerpts=ids.map(id=>{
 const at=html.indexOf(`id="${id}"`);if(at<0)throw Error(`missing ${id}`);
 const start=html.lastIndexOf('<emu-clause',at),tags=/<emu-clause\b|<\/emu-clause>/g;tags.lastIndex=start;
 let depth=0,end=start;for(let m;(m=tags.exec(html));){depth+=m[0][1]==='/'?-1:1;if(depth===0){end=tags.lastIndex;break;}}
 return {id,text:html.slice(start,end).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()};
});
writeFileSync(new URL('spec.json',import.meta.url),JSON.stringify({url,sha256:hash(bytes),bytes:bytes.length,excerpts},null,2)+'\n');
const tree=JSON.parse((await get(`https://api.github.com/repos/engine262/engine262/git/trees/${pin}?recursive=1`)).toString('utf8'));
const paths=tree.tree.map(e=>e.path).filter(p=>p.startsWith('src/')&&/(Block|StatementList|WhileStatement|IfStatement|FunctionExpression|FunctionDeclaration|VariableStatement|completion\.mts$)/.test(p));
const files=[];
for(const path of [...paths,'LICENSE']) {const url=`https://raw.githubusercontent.com/engine262/engine262/${pin}/${path}`,b=await get(url);files.push({path,url,sha256:hash(b),bytes:b.length,text:b.toString('utf8')});}
writeFileSync(new URL('engine.json',import.meta.url),JSON.stringify({pin,files},null,2)+'\n');
console.log(JSON.stringify({specClauses:excerpts.length,enginePaths:paths}));
