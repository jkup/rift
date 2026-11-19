// Source/fixture inventory, not a source-to-binary certification or guest test.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../..');
const base='bf02056238bce71d46505a6f92640305d640a5eb';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=git('ls-tree','-r','--name-only',base).split('\n');
const except=new Set(['typescript/TASKS.md','typescript/COORDINATION.md','COORDINATION.md']);
const baseline=files.filter(p=>!except.has(p)).map(path=>{const b=readFileSync(resolve(root,path));return {path,bytes:b.length,sha256:sha(b)};});
const source=files.filter(p=>/^typescript\/(src|tools|test)\//.test(p)&&/\.(?:ts|mjs|cjs|js)$/.test(p));
const pattern=/Attempt|Realm|preflight|observeScript|produceConformance|ScriptSelection|ScriptExecutionInputs|ScriptEnvelope|ScriptDriverResult|createScriptSession|prepareBoundedScript|registerBuiltin|createBuiltin|defineScriptGlobal|bootstrapDefine/;
const inventory=source.map(path=>{const b=readFileSync(resolve(root,path)),lines=b.toString('utf8').split(/\r?\n/);return {path,sha256:sha(b),imports:lines.flatMap((text,i)=>/\b(?:import|export)\b.*(?:from\s*|import\s*)['"]/.test(text)?[{line:i+1,text}]:[]),references:lines.flatMap((text,i)=>pattern.test(text)?[{line:i+1,text}]:[])};});
const edges=[];
for(const row of inventory){const text=readFileSync(resolve(root,row.path),'utf8');for(const m of text.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g)){
 const spec=m[1];let target=spec;
 if(spec.startsWith('.')){target=resolve(root,dirname(row.path),spec);if(!existsSync(target)&&target.endsWith('.js')&&existsSync(target.slice(0,-3)+'.ts'))target=target.slice(0,-3)+'.ts';target=relative(root,target).replaceAll('\\','/');}
 edges.push({from:row.path,specifier:spec,to:target,kind:spec.startsWith('.')?'project':'external'});
}}
const entries=['typescript/src/script-observation-driver.ts','typescript/test/script-observation.ts','typescript/tools/test262/script-execution-inputs.mjs','typescript/tools/test262/script-observe.mjs','typescript/tools/test262/script-ledger.mjs','typescript/tools/test262/script-result.mjs','typescript/tools/test262/script-driver-result.mjs'];
const closures=entries.map(entry=>{const seen=new Set(),external=new Set();function visit(p){if(seen.has(p))return;seen.add(p);for(const e of edges.filter(e=>e.from===p))e.kind==='project'?visit(e.to):external.add(e.to);}visit(entry);return {entry,project:[...seen].sort(),external:[...external].sort()};});
const historical=files.filter(p=>/^typescript\/docs\/validation\//.test(p)&&/\.(?:ts|mjs|cjs|js|ps1|py|sh)$/.test(p)).map(path=>{const text=readFileSync(resolve(root,path),'utf8');return {path,sha256:sha(text),references:text.split(/\r?\n/).flatMap((text,i)=>pattern.test(text)?[{line:i+1,text}]:[])};});
const fixtures=['test/fixtures/harness-bundle/assert.js','test/fixtures/harness-bundle/sta.js','test/fixtures/harness-bundle/LICENSE','test/fixtures/script-observation/frozen.json','test/fixtures/script-observation/controls.json','docs/validation/ts-034h7/frozen-rows.json','docs/validation/ts-034h7/correction/timeout-contract.json'];
const originalInputs=fixtures.map(path=>{const b=readFileSync(resolve(root,'typescript',path));return {path,bytes:b.length,sha256:sha(b),originalBase64:b.toString('base64')};});
const result={base,note:'Complete lexical source inventory and conservative relative-import graph, including type imports; external package/runtime contents and build provenance are not certified.',inventory,edges,closures,historical,originalInputs};
writeFileSync(resolve(here,'baseline.json'),JSON.stringify({base,files:baseline},null,2)+'\n',{flag:'wx'});
writeFileSync(resolve(here,'closure-audit.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({protectedFiles:baseline.length,liveSources:inventory.length,historicalSources:historical.length,edges:edges.length,fixtures:originalInputs.length,closures:closures.map(x=>({entry:x.entry,members:x.project.length,external:x.external}))}));
