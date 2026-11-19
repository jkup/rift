// Exact isolated host decimal helpers only. No engine/compiler/guest execution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const here=import.meta.dirname,root=resolve(here,'../../../..');
const current=readFileSync(join(here,'proposals/script-observation.ts'),'utf8');
const prior=readFileSync(join(here,'../correction/proposals/script-observation.ts'),'utf8');
const oldLine='    preflightNeed(text.length > 0, "limit");';
const newLine='    if (text.length === 0) throw new Error("script-preflight/limit");';
assert.equal(current.split(newLine).length,2);
assert.equal(current.replace(newLine,oldLine),prior,'only empty guard changes');
const rows=JSON.parse(readFileSync(join(here,'decimal-literals.json')));
const directory=mkdtempSync(join(here,'decimal-'));
const sources=[['prior',prior,'preflight'],['corrected',current,'preflight'],['accepted-E3b',readFileSync(join(root,'src/script-observation.ts'),'utf8'),'producer']];
const checks=[];
for(const [name,text,prefix] of sources){
 const functionName=prefix+'Decimal';
 const start=text.indexOf('function '+functionName+'('),end=text.indexOf('\n}',start)+2;
 assert(start>=0&&end>start);
 const helper=prefix==='preflight'?'function preflightNeed(ok:boolean,code:string):void {if(!ok)throw new Error("script-preflight/"+code);}\n':'function producerNeed(ok:boolean,code:string):void {if(!ok)throw new Error("script-producer/"+code);}\n';
 const path=join(directory,name+'.mts');writeFileSync(path,helper+text.slice(start,end)+'\nexport {'+functionName+'};\n',{flag:'wx'});
 const api=await import(pathToFileURL(path));
 for(const row of rows){
  if(Object.hasOwn(row,'value')){const value=api[functionName](row.text);assert.equal(value,row.value);assert(!Object.is(value,-0));checks.push({helper:name,text:row.text,value});}
  else{const message='script-'+prefix+'/'+row.error;assert.throws(()=>api[functionName](row.text),{message});checks.push({helper:name,text:row.text,error:message});}
 }
}
writeFileSync(join(directory,'result.json'),JSON.stringify({kind:'offline-decimal-equivalence',literalCases:rows.length,checks,engineExecutions:0,compilerExecutions:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({directory,literalCases:rows.length,checks:checks.length,engineExecutions:0,compilerExecutions:0,passed:true}));
