// Retrieval only; no reference-engine execution. Writes only this directory.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const url='https://262.ecma-international.org/16.0/';
const response=await fetch(url); if(!response.ok)throw Error(String(response.status));
const bytes=Buffer.from(await response.arrayBuffer()), html=bytes.toString('utf8');
const sha256=createHash('sha256').update(bytes).digest('hex');
if(sha256!=='6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713')throw Error('edition changed');
const ids=['sec-globaldeclarationinstantiation','sec-scripts-static-semantics-early-errors','sec-block-static-semantics-early-errors','sec-function-definitions-static-semantics-early-errors','sec-functiondeclarationinstantiation','sec-blockdeclarationinstantiation','sec-variable-statement','sec-static-semantics-vardeclarednames','sec-static-semantics-varscopeddeclarations'];
const excerpts=[];
for(const id of ids){
 const at=html.indexOf(`id="${id}"`); if(at<0)throw Error(`missing ${id}`);
 const start=html.lastIndexOf('<emu-clause',at), tags=/<emu-clause\b|<\/emu-clause>/g;tags.lastIndex=start;
 let depth=0,end=start; for(let m;(m=tags.exec(html));){depth+=m[0][1]==='/'?-1:1;if(depth===0){end=tags.lastIndex;break;}}
 excerpts.push({id,text:html.slice(start,end).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()});
}
writeFileSync(new URL('spec.json',import.meta.url),JSON.stringify({url,sha256,bytes:bytes.length,excerpts},null,2)+'\n');
console.log(`Verified fixed edition; retained ${excerpts.length} declaration clauses`);
const pin='d553e7b52501fbc47eae981c8d0fa7a5c26d0171';
const treeResponse=await fetch(`https://api.github.com/repos/engine262/engine262/git/trees/${pin}?recursive=1`);
if(!treeResponse.ok)throw Error(String(treeResponse.status));
const tree=await treeResponse.json();
const paths=tree.tree.map(e=>e.path).filter(p=>/declaration.*instantiation/i.test(p));
if(paths.length===0)throw Error('no declaration source');
const engine=[];
for(const path of [...paths,'LICENSE']){
 const url=`https://raw.githubusercontent.com/engine262/engine262/${pin}/${path}`;
 const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${url}`);
 const b=Buffer.from(await r.arrayBuffer());
 engine.push({url,path,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length,text:b.toString('utf8')});
}
writeFileSync(new URL('engine.json',import.meta.url),JSON.stringify({pin,files:engine},null,2)+'\n');
console.log(paths);
