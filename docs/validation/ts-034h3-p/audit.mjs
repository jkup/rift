// Source/preservation audit only. No guest execution, parser model or native claim.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers,frozenManifest} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'),repo=resolve(root,'..'),base='a978442';
const git=(...args)=>execFileSync('git',args,{cwd:repo,maxBuffer:64*1024*1024,encoding:'utf8'}).trimEnd();
const read=p=>readFileSync(join(repo,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/docs/harness-for-update.md'||p.startsWith('typescript/docs/validation/ts-034h3-p/');
assert.equal(git('branch','--show-current'),'codex/test262-classification');
const tree=git('ls-tree','-r',base).split('\n').map(l=>{const [head,path]=l.split('\t');return {path,blob:head.split(' ')[2]};});
const changed=git('diff','--name-only',base).split('\n').filter(Boolean);
const untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changed.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changed.join('\n'));
assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedTree=tree.filter(r=>!owned(r.path)&&r.path!=='typescript/COORDINATION.md');
assert.ok(protectedTree.every(r=>!changed.includes(r.path)));
const marker='### TS-034H3-P — Freeze classic for and postfix increment';
const oldTasks=git('show',base+':typescript/TASKS.md');
const nowTasks=read('typescript/TASKS.md').toString().replaceAll('\r\n','\n').trimEnd();
assert.equal(nowTasks.split(marker)[0],oldTasks.split(marker)[0]);
assert.equal(oldTasks.split(marker).length,2);assert.equal(nowTasks.split(marker).length,2);
assert.equal(nowTasks.split(marker)[1].includes('\n### '),false);
const needles={
 'typescript/src/lexer.ts':['export function lex(source: string)', '["++", "--", "=>"'],
 'typescript/src/parser.ts':['const lexical = lex(source.text);','this.bindings.set(start, bindings);','this.loops = 0;','this.switches = 0;','this.expression(9)'],
 'typescript/src/script-declarations.ts':['case "while": this.statement(node.body','this.nodes.declarations.set(id, { node: item.node, initializer: item.binding.init })','case "assign": case "compound":'],
 'typescript/src/script-execution-internal.ts':['#reference(expr: Expr','const oldValue = this.#get(ref.reference, expr.loc);','this.#put(ref.reference, result.value, expr.loc)','const result = this.#statement(stmt.body);','if (++this.steps > this.maxSteps)','this.#abrupt = null;'],
 'typescript/src/runtime.ts':['ref.key = typeof key.value === "string"','object.value.internalGet(key.value, ref.base','object.value.internalSet(key.value, value, ref.base'],
 'typescript/src/conversion.ts':['export function toNumber','case "symbol": return failure','case "object": return unsupportedFailure'],
 'typescript/src/primitive-conversion.ts':['const tick = context.tick(loc);','hint === "default" ? "number" : hint'],
 'typescript/src/script-environment.ts':['export function resolveScriptBinding','export function getScriptBinding','export function putScriptBinding'],
 'typescript/src/script-global-declarations.ts':['for (const id of root.varDeclarations)','for (const d of vars)'],
 'typescript/src/script-completion.ts':['export function updateScriptEmpty','completion.type === "throw" || completion.type === "return"']
};
const sourceEvidence=Object.entries(needles).map(([path,required])=>{
 const text=read(path).toString();for(const n of required)assert.ok(text.includes(n),`${path}: ${n}`);
 return {path,sha256:sha(read(path)),matches:text.split(/\r?\n/).flatMap((text,i)=>required.some(n=>text.includes(n))?[{line:i+1,text}]:[])};
});
// Exhaustive mention inventory over tracked executable source, including old audit scripts.
// Host loops are intentionally retained; this is evidence, not a guest-source classifier.
const inventory=[];
for(const {path} of tree.filter(r=>/^typescript\/(src|test|fixtures|tools|docs\/validation)\//.test(r.path)&&/\.(ts|mjs|js)$/.test(r.path))){
 const hits=read(path).toString().split(/\r?\n/).flatMap((text,i)=>/\bfor\s*\(|\+\+|\bToNumeric\b/.test(text)?[{line:i+1,text}]:[]);
 if(hits.length)inventory.push({path,hits});
}
const anchor='const cases: { id: string; source: string; expected: number | string | undefined }[] = [';
const proposals=[{
 path:'typescript/test/script-execution.ts',edits:[
 {old:anchor,new:anchor+`\n    { id: "H3-empty", source: '"use strict";for(;;)break;', expected: undefined },\n    { id: "H3-postfix", source: '"use strict";let x=7;x++;', expected: 7 },`},
 {old:`'"use strict";for(;;){}'`,new:`'"use strict";for(let i=0;;){}'`},
 {old:`'"use strict";x++;'`,new:`'"use strict";++x;'`}
 ]},{path:'typescript/test/harness-switch.ts',edits:[
 {old:'"source": "switch(1){case 1:x++;}"',new:'"source": "switch(1){case 1:++x;}"'}
 ]}];
for(const p of proposals){
 const original=git('show',base+':'+p.path)+'\n';let proposed=original;
 for(const {old,new:replacement} of p.edits){assert.equal(proposed.split(old).length,2,p.path+' '+old);proposed=proposed.replace(old,replacement);}
 p.baseSha256LF=sha(original);p.proposedSha256LF=sha(proposed);
}
writeFileSync(new URL('proposed-migrations.json',import.meta.url),JSON.stringify({base,status:'PROPOSAL ONLY; exact coordinator review required before old-test edits',proposals},null,2)+'\n');
const prefixPath='typescript/docs/validation/ts-034h3-p/prefixes.json';
const prefixes=JSON.parse(read(prefixPath));
assert.deepEqual(prefixes.map(p=>p.ticks.length),[4,4,13,9,17,4,6,8,5,8,6]);
for(const p of prefixes){const lines=p.source.split('\n');assert.ok(p.source.startsWith('"use strict";\n'));for(const [line,column] of p.ticks)assert.ok(lines[line-1]?.[column-1]&&!/\s/.test(lines[line-1][column-1]),p.id);}
const prefixRuns=prefixes.reduce((sum,p)=>sum+2*(p.ticks.length+1),0);assert.equal(prefixRuns,190);
const prior='typescript/docs/validation/ts-034h2/';
for(const lane of ['node','native'])assert.equal(JSON.parse(read(prior+`guest-${lane}-results.json`)).length,212);
const gates=JSON.parse(read(prior+'native-build-results.json'));assert.equal(gates.length,51);
for(const g of gates){assert.equal(g.verdict,'PASS');assert.equal(g.build.status,0);assert.equal(g.coverage.status,0);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(g.coverage.stdout));}
const {manifest}=await frozenManifest();
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
const corpus=JSON.parse(read('typescript/docs/validation/ts-033p/corpus.json'));
for(const unit of corpus){const b=Buffer.from(unit.text);assert.equal(b.length,unit.bytes);assert.equal(sha(b),unit.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex'),unit.blob);}
const harness=corpus.find(u=>u.id==='harness/assert.js');
const harnessForLines=harness.text.split('\n').flatMap((text,i)=>/\bfor\s*\(/.test(text)?[{line:i+1,text}]:[]);
assert.deepEqual(harnessForLines,[{line:170,text:'  for (var i = 0; i < a.length; i++) {'}]);
const upstream=JSON.parse(read('typescript/docs/validation/ts-034h3-p/upstream.json'));
assert.equal(upstream[0].sha256,'6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713');
for(const entry of upstream.slice(1))assert.equal(sha(entry.lines.map(l=>l.text).join('\n')),entry.sha256);
const frozen=['typescript/docs/harness-for-update.md',prefixPath,...['input-seven.js','input-eleven.js','upstream.json','proposed-migrations.json'].map(p=>'typescript/docs/validation/ts-034h3-p/'+p)].map(path=>({path,sha256:sha(read(path))}));
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify({base,mode:'source/preservation only; no guest execution or native claim',protectedFiles:protectedTree.length,protectedTree,sourceEvidence,mentionInventory:inventory,frozen,prefixRuns,retained:{recordsPerLane:212,staticGates:51,H1prefixes:104,H2prefixes:208},harnessForLines,variants},null,2)+'\n');
console.log(`PASS ${protectedTree.length} protected files; ${inventory.length} mention files; 190 frozen prefixes; retained212/51;60blocked`);
