import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {inputs} from '../../ts-033a/baseline.mjs';
const root=resolve(import.meta.dirname,'../../../..'),here=import.meta.dirname;
const scratch=join(root,'build/ts033d1-base');mkdirSync(scratch,{recursive:true});
const neighbors=JSON.parse(readFileSync(join(root,'fixtures/script-declarations/literal.json'))).map(r=>[r.id,r.text]);
for(const name of ['parser','lexer','syntax','outcomes','script-metadata'])writeFileSync(join(scratch,name+'.ts'),execFileSync('git',['show','c755a6a:typescript/src/'+name+'.ts']));
execFileSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig','--types','node','--target','ES2024','--module','NodeNext','--strict','--skipLibCheck','--outDir',join(scratch,'js'),join(scratch,'parser.ts'),join(scratch,'script-metadata.ts')],{cwd:root});
const {parse,auditScriptReturns}=await import(pathToFileURL(join(scratch,'js/parser.js')));
const {inspectScript}=await import(pathToFileURL(join(scratch,'js/script-metadata.js')));
const records=[...inputs,...neighbors].map(([id,text])=>({id,metadata:inspectScript({id,text}),parse:parse(text),audit:auditScriptReturns(text)}));
writeFileSync(join(here,'base-records.json'),JSON.stringify(records,null,2)+'\n');
const results=[];
try{for(const lane of process.argv.slice(2)){
 for(let i=0;i<records.length;i++){
  const [id,text]=[...inputs,...neighbors][i];const file=join(scratch,'source.js');writeFileSync(file,text);
  const args=[file,id];if(lane==='node')args.unshift('build/node/test/script-metadata.js');
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/script-metadata.exe'),args,{cwd:root,encoding:'utf8',timeout:15000,maxBuffer:8*1024*1024});
  results.push({lane,id,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
  assert.equal(r.status,0,id);assert.equal(r.signal,null);assert.equal(r.error,undefined);assert.equal(r.stderr,'');
  const {id:ignored,...expected}=records[i];assert.deepEqual(JSON.parse(r.stdout),expected,lane+' '+id+' full baseline record');
 }
 console.log(lane+': 136 inherited plus '+neighbors.length+' new exact legacy parse/audit/metadata records match c755a6a');
}}finally{writeFileSync(join(here,'base-comparison.json'),JSON.stringify(results,null,2)+'\n');}
