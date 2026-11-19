// Fixture-authoring aid only: reads authored source, never imports Rift or runs a
// guest program. validate.mjs consumes the frozen JSON, not this generator.
import {cases} from './cases.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=[];
for(const row of cases){
 if(!row.scopes){out.push(row);continue;}
 const text=row.text;
 const loc=start=>({line:1,column:start+1});
 const site=(name,start)=>({name,start,end:start+name.length,loc:loc(start)});
 const scopes=[{id:0,kind:'script',parent:null,start:0,end:text.length,strict:text.startsWith('"use strict";'),formals:[],lexicalDeclarations:[],varDeclarations:[],lexicalNames:[],varNames:[]}];
 const functions=[];const stack=[0];const words=Array.from(text.matchAll(/function(?:\s+(\w+))?\(([^)]*)\)\{|[{}]/g));
 for(const match of words){
  if(match[0]==='}'){scopes[stack.pop()].end=match.index+1;continue;}
  const isFn=match[0].startsWith('function');const parent=stack.at(-1),id=scopes.length,start=isFn?match.index+match[0].length-1:match.index;
  const own=isFn&&text.slice(start+1).startsWith('"use strict";');
  const strict=scopes[parent].strict||own;
  const formals=[];
  if(isFn&&match[2]){let p=match.index+match[0].indexOf('(')+1;for(const name of match[2].split(',')){formals.push(site(name,p));p+=name.length+1;}}
  scopes.push({id,kind:isFn?'function':'block',parent,start,end:0,strict,formals,lexicalDeclarations:[],varDeclarations:[],lexicalNames:[],varNames:[]});stack.push(id);
  if(isFn)functions.push({scope:id,declaration:null,start:match.index,end:0,strictness:{ownStrict:own,inheritedStrict:scopes[parent].strict,strict,directives:own?[{start:start+1,end:start+13,statementEnd:start+14,loc:loc(start+1),raw:'"use strict"',useStrict:true}]:[]}});
 }
 const enclosing=start=>{for(let i=scopes.length-1;i>=1;i--)if(scopes[i].start<start&&scopes[i].end>start)return i;return 0;};
 const decl=[];
 for(const match of text.matchAll(/\b(let|var|function)\s+(\w+)/g)){
  const kind=match[1];let start=match.index+match[0].length-match[2].length;
  while(true){
   const name=/^\w+/.exec(text.slice(start))[0];let pos=start+name.length;while(text[pos]===' ')pos++;
   let initializer=null;
   if(text[pos]==='='){
    pos++;while(text[pos]===' ')pos++;const begin=pos;let depth=0;
    while(pos<text.length){const ch=text[pos];if(depth===0&&(ch===','||ch===';'))break;if('({['.includes(ch))depth++;if(')}]'.includes(ch))depth--;pos++;}
    let end=pos;while(text[end-1]===' ')end--;initializer={start:begin,end};
   }
   const scope=enclosing(start);let variableScope=scope;while(scopes[variableScope].kind==='block')variableScope=scopes[variableScope].parent;
   const f=kind==='function'?functions.find(f=>f.start===match.index):null;
   decl.push({kind,site:site(name,start),scope,variableScope,functionScope:f?.scope??null,initializer});
   if(kind!=='var'||text[pos]!==',')break;
   start=pos+1;while(text[start]===' ')start++;
  }
 }
 decl.sort((a,b)=>a.site.start-b.site.start);decl.forEach((d,id)=>{d.id=id;const scope=scopes[d.scope];if(d.kind==='let'||(d.kind==='function'&&scope.kind==='block')){scope.lexicalDeclarations.push(id);scope.lexicalNames.push(d.site.name);}else{let i=d.scope;while(true){scopes[i].varDeclarations.push(id);scopes[i].varNames.push(d.site.name);if(i===d.variableScope)break;i=scopes[i].parent;}}if(d.functionScope!==null)functions.find(f=>f.scope===d.functionScope).declaration=id;});
 for(const f of functions)f.end=scopes[f.scope].end;
 assert.deepEqual(scopes.map(s=>({kind:s.kind,parent:s.parent,lex:s.lexicalNames,vars:s.varNames,formals:s.formals.map(x=>x.name)})),row.scopes,row.id+' authored names vs independent fixture spans');
 const strict=text.startsWith('"use strict";');const strictness={ownStrict:strict,inheritedStrict:false,strict,directives:strict?[{start:0,end:12,statementEnd:13,loc:{line:1,column:1},raw:'"use strict"',useStrict:true}]:[]};
 out.push({...row,expected:{kind:'complete',goal:'Script',consumedUnits:text.length,strictness,scopes,declarations:decl,functions}});
}
mkdirSync(new URL('../../../fixtures/script-declarations/',import.meta.url),{recursive:true});
writeFileSync(new URL('../../../fixtures/script-declarations/literal.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
console.log('Froze '+out.length+' source-authored rows; no Rift imports or execution.');
