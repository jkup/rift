import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {rows} from '../ts-031c-a/cases.mjs';
import {cases as controls} from '../ts-031c-p/cases.mjs';
import {cases} from './cases.mjs';
export const root=resolve(import.meta.dirname,'../../..');
const historical=JSON.parse(readFileSync(join(root,'docs/validation/ts-031c-b/results.json')));
const corpus=JSON.parse(readFileSync(join(root,'docs/validation/ts-033p/corpus.json')));
export const inputs=historical.map(row=>{
 let source=rows.find(x=>x[0]===row.id)?.[1];
 if(source===undefined && row.id.startsWith('C-')) source=controls.find(x=>x[0]===row.id.slice(2))?.[1];
 if(source===undefined){
  const match=/^F2[34]-(S\d+)\/(.+)$/.exec(row.id); assert.ok(match,row.id);
  source=(match[2]==='strict'?'"use strict";\n':'')+corpus.find(x=>x.id===match[1]).text;
 }
 return [row.id,source];
});
assert.equal(inputs.length,94);
inputs.push(...cases.map(x=>[x[0],x[1]]));
if(process.argv[1]===import.meta.filename){
 const scratch=join(root,'build/ts033a-baseline'); mkdirSync(scratch,{recursive:true});
 for(const name of ['parser','lexer','syntax','outcomes']) writeFileSync(join(scratch,name+'.ts'),execFileSync('git',['show','1f81bb2:typescript/src/'+name+'.ts']));
 execFileSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig','--types','node','--target','ES2024','--module','NodeNext','--strict','--skipLibCheck','--outDir',join(scratch,'js'),join(scratch,'parser.ts')],{cwd:root});
 const baseline=await import(pathToFileURL(join(scratch,'js/parser.js')));
 const records=inputs.map(([id,source])=>({id,parse:baseline.parse(source),audit:baseline.auditScriptReturns(source)}));
 writeFileSync(join(import.meta.dirname,'baseline.json'),JSON.stringify(records,null,2)+'\n');
 console.log('Captured exact baseline '+records.length+' rows (94 historical + '+cases.length+' frozen metadata neighbors).');
}
