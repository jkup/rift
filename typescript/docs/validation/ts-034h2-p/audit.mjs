// Bounded source/preservation audit. No guest evaluation, native execution,
// parser implementation, generated semantic expectations or mutation of old files.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers,frozenManifest} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'),repo=resolve(root,'..'),base='b8baf44';
const git=(...args)=>execFileSync('git',args,{cwd:repo,maxBuffer:64*1024*1024,encoding:'utf8'}).trimEnd();
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(join(repo,p));
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/docs/harness-switch.md'||p.startsWith('typescript/docs/validation/ts-034h2-p/');
assert.equal(git('branch','--show-current'),'codex/test262-classification');
const tree=git('ls-tree','-r',base).split('\n').map(l=>{const [head,path]=l.split('\t');return {path,blob:head.split(' ')[2]};});
const changes=git('diff','--name-only',base).split('\n').filter(Boolean);
const untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changes.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changes.join('\n'));
assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedFiles=tree.filter(r=>!owned(r.path)&&r.path!=='typescript/COORDINATION.md');
assert.ok(protectedFiles.every(r=>!changes.includes(r.path)));
const marker='### TS-034H2-P — Freeze Script switch integration';
const oldTasks=git('show',base+':typescript/TASKS.md');
const nowTasks=read('typescript/TASKS.md').toString().replaceAll('\r\n','\n').trimEnd();
assert.equal(nowTasks.split(marker)[0],oldTasks.split(marker)[0]);
assert.equal(oldTasks.split(marker).length,2);assert.equal(nowTasks.split(marker).length,2);
assert.equal(nowTasks.split(marker)[1].includes('\n### '),false);
const seams={
 'typescript/src/syntax.ts':['export type Stmt =','| TryCatchStmt'],
 'typescript/src/parser.ts':['loops = 0;','this.loops = 0;','this.loops = loops;','this.purpose === "declaration-plan"'],
 'typescript/src/script-declarations.ts':['kind: "script" | "function" | "block" | "catch"','scopes: Map<number, { node: Stmt | Expr | null; body: Stmt[] }>','if (item.kind === "block-end")'],
 'typescript/src/script-execution-internal.ts':['#block(scopeId: number)','createBlockEnvironment(scopeId: number','instantiateBlock(scopeId: number','this.#abrupt = null;','case "var": throw new Error("Script var AST requires Script execution")','case "try-catch": throw new Error("Script try-catch AST requires Script execution")'],
 'typescript/src/runtime.ts':['export function equal(left: Value, right: Value): boolean'],
 'typescript/src/script-completion.ts':['export function updateScriptEmpty','completion.type === "throw" || completion.type === "return"']
};
const sourceEvidence=[];
for(const [path,needles] of Object.entries(seams)){
 const text=read(path).toString(),lines=text.split(/\r?\n/);
 for(const needle of needles)assert.ok(text.includes(needle),`${path}: ${needle}`);
 sourceEvidence.push({path,sha256:sha(read(path)),matches:lines.flatMap((text,i)=>needles.some(n=>text.includes(n))?[{line:i+1,text}]:[])});
}
const inventory=[];
for(const {path} of tree.filter(r=>/^typescript\/(src|test|fixtures|tools|docs\/validation)\//.test(r.path)&&/\.(ts|mjs|js)$/.test(r.path))){
 const hits=read(path).toString().split(/\r?\n/).flatMap((text,i)=>/\bswitch\b/i.test(text)?[{line:i+1,text}]:[]);
 if(hits.length)inventory.push({path,hits});
}
const oldTest=git('show',base+':typescript/test/script-execution.ts');
const anchor='const cases: { id: string; source: string; expected: number | string | undefined }[] = [';
const negative=`'"use strict";switch(1){}'`;
assert.equal(oldTest.split(negative).length,2);assert.equal(oldTest.split(anchor).length,2);
const proposed=oldTest.replace(anchor,anchor+`\n    { id: "H2-empty", source: '"use strict";switch(1){}', expected: undefined },`)
 .replace(`    ${negative},`,`    '"use strict";switch(1){default:const x=0;}',`);
assert.notEqual(proposed,oldTest);
writeFileSync(new URL('proposed-e4.txt',import.meta.url),JSON.stringify({base,path:'typescript/test/script-execution.ts',status:'proposal only; do not apply before review',edits:[{old:anchor,new:anchor+`\n    { id: "H2-empty", source: '"use strict";switch(1){}', expected: undefined },`},{old:`    ${negative},`,new:`    '"use strict";switch(1){default:const x=0;}',`}],expectedWholeFileSha256LF:sha(proposed+'\n')},null,2)+'\n');
const prefixes=JSON.parse(read('typescript/docs/validation/ts-034h2-p/prefixes.json'));
assert.deepEqual(prefixes.map(p=>p.ticks.length),[5,9,7,10,12,13,12,11,8,7]);
for(const row of prefixes){
 assert.ok(row.source.startsWith('"use strict";\n'));
 const lines=row.source.split('\n');
 for(const [line,column] of row.ticks)assert.ok(lines[line-1]?.[column-1]&&!/\s/.test(lines[line-1][column-1]),row.id);
}
const runs=prefixes.reduce((n,p)=>n+2*(p.ticks.length+1),0);assert.equal(runs,208);
const inherited='typescript/docs/validation/ts-034h1/';
for(const lane of ['node','native'])assert.equal(JSON.parse(read(inherited+`guest-${lane}-results.json`)).length,212);
const gates=JSON.parse(read(inherited+'native-build-results.json'));assert.equal(gates.length,50);
for(const g of gates){assert.equal(g.verdict,'PASS');assert.equal(g.build.status,0);assert.equal(g.coverage.status,0);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(g.coverage.stdout));}
const {manifest}=await frozenManifest();
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
const upstream=JSON.parse(read('typescript/docs/validation/ts-034h2-p/upstream.json'));
assert.equal(upstream[0].sha256,'6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713');
for(const entry of upstream.slice(1))assert.equal(sha(entry.lines.map(l=>l.text).join('\n')),entry.sha256);
const frozen=['typescript/docs/harness-switch.md',...['prefixes.json','input-seven.js','input-eleven.js','upstream.json'].map(p=>'typescript/docs/validation/ts-034h2-p/'+p)].map(path=>({path,sha256:sha(read(path))}));
const result={base,mode:'source/preservation only; no semantic execution or native claim',protectedFiles:protectedFiles.length,protectedTree:protectedFiles,sourceEvidence,switchInventory:inventory,frozen,prefixRuns:runs,retained:{recordsPerLane:212,staticGates:50},variants};
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`PASS ${protectedFiles.length} protected files; ${inventory.length} switch-mention files; 208 frozen prefixes; retained212/50;60blocked`);
