// Source/preservation audit only. No guest/native execution or historical writes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const repo=resolve(import.meta.dirname,'../../../..'),here=import.meta.dirname,base='a0f3332';
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024}).trimEnd();
const read=p=>readFileSync(join(repo,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/docs/harness-construct.md'||p.startsWith('typescript/docs/validation/ts-034h5-p/');
assert.equal(git('branch','--show-current'),'codex/test262-classification');
const tree=git('ls-tree','-r',base).split('\n').map(l=>{const [h,path]=l.split('\t');return {path,blob:h.split(' ')[2]};});
const changed=git('diff','--name-only',base).split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changed.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changed.join('\n'));
assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedTree=tree.filter(r=>!owned(r.path)&&r.path!=='typescript/COORDINATION.md');
assert.ok(protectedTree.every(r=>!changed.includes(r.path)));
const marker='### TS-034H5-P — Ordinary construction and instanceof interface checkpoint';
const original=git('show',base+':typescript/TASKS.md'),current=read('typescript/TASKS.md').toString().replaceAll('\r\n','\n').trimEnd();
assert.equal(current.split(marker).length,2);assert.equal(original.split(marker).length,2);
assert.equal(current.split(marker)[0],original.split(marker)[0]);assert.ok(!current.split(marker)[1].includes('\n### '));
const pattern=/constructorSlot|new GuestObject|super\(|callable|Callable|OperationContext|context\.call|\.call\(|call:|case "call"|case "binary"|instanceof|new [fC]\(|hasInstance|prototype|Prototype|permit|Permit|pendingBuiltin|#active|#capture|materializeFunction|readFunction|createFunctionEnvironment|instantiateFunction|functionBodyEnvironment|purpose|structuralPlan/;
const inventory=paths=>paths.map(path=>({path,sha256:sha(read(path)),hits:read(path).toString().split(/\r?\n/).flatMap((text,i)=>pattern.test(text)?[{line:i+1,text}]:[])}));
const sourceInventory=inventory(tree.filter(r=>r.path.startsWith('typescript/src/')&&r.path.endsWith('.ts')).map(r=>r.path));
const mentions=inventory(tree.filter(r=>/^typescript\/(test|fixtures|tools|docs\/validation)\//.test(r.path)&&/\.(ts|js|mjs)$/.test(r.path)).map(r=>r.path)).filter(r=>r.hits.length);
for(const [p,needles] of Object.entries({
 'runtime.ts':['readonly callable: Callable | null = null','call: (callee: Value, receiver: Value, args: Value[], loc: Location)','getPrototypeOf(): GuestObject | null'],
 'script-execution-internal.ts':['const object = new GuestObject(state.realm.functionPrototype, false, callable);','#callScript(callee: Value','pendingBuiltin = previous','this.#frame = saved','this.#abrupt = null;'],
 'script-declarations.ts':['case "call":','this.expression(node.callee, scope, variableScope)'],
 'script-metadata.ts':['const parsed = parse(source.text);'],
 'realm.ts':['!consumeScriptBuiltinPermit','invalid Script factory Realm'],
 'parser.ts':['private readonly purpose','op === "in"','case'],
 'symbols.ts':['wellKnownToPrimitive','wellKnownToStringTag']
}))for(const n of needles)assert.ok(read('typescript/src/'+p).toString().includes(n),p+': '+n);
const prefixes=JSON.parse(readFileSync(join(here,'prefixes.json')));
assert.deepEqual(prefixes.map(p=>p.ticks.length),[5,7,10,8,9,4,5,7,5,6,4,4]);
for(const p of prefixes){
 for(const [unit,line,col] of p.ticks)assert.ok(p.sources[unit].split('\n')[line-1]?.[col-1]?.match(/\S/),p.id+' coordinate');
 for(const n of Object.keys(p.effects))assert.ok(+n>=1&&+n<=p.ticks.length);
}
const prefixRuns=prefixes.reduce((n,p)=>n+2*(p.ticks.length+1),0);
const prior='typescript/docs/validation/ts-034h4/';
for(const lane of ['node','native'])assert.equal(JSON.parse(read(prior+`guest-${lane}-results.json`)).length,212);
const gates=JSON.parse(read(prior+'native-build-results.json'));assert.equal(gates.length,53);
for(const g of gates){assert.equal(g.verdict,'PASS');assert.equal(g.build.status,0);assert.equal(g.coverage.status,0);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(g.coverage.stdout));}
const manifest=JSON.parse(read('typescript/fixtures/assistance/test262-starter-corpus/manifest.json'));
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
const upstream=JSON.parse(readFileSync(join(here,'upstream.json')));
assert.equal(upstream.edition.sha256,'6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713');
assert.equal(upstream.edition.excerpts.length,7);
for(const u of upstream.retained.slice(1))assert.equal(sha(u.lines.map(l=>l.text).join('\n')),u.sha256);
const inherited=['ts-034p/h1-correction.md','ts-034h2-p/prefixes.json','ts-034h3-p/prefixes.json','ts-034h4-p/prefixes.json'].map(p=>({path:p,sha256:sha(read('typescript/docs/validation/'+p))}));
const frozen=['typescript/docs/harness-construct.md',...['prefixes.json','input-seven.js','input-eleven.js','upstream.json'].map(p=>'typescript/docs/validation/ts-034h5-p/'+p)].map(path=>({path,sha256:sha(read(path))}));
const migrations=[{path:'typescript/test/script-execution.ts',before:'\'"use strict";new f();\'',after:'\'"use strict";new f(...xs);\''},{path:'typescript/test/harness-nonstrict.ts',before:'"function f(){return 7;}new C();"',after:'"function f(){return 7;}new C(...xs);"'}];
for(const m of migrations)assert.equal(read(m.path).toString().split(m.before).length,2);
writeFileSync(join(here,'audit.json'),JSON.stringify({base:git('rev-parse',base),mode:'source/preservation only; all future semantics and prefixes UNEXECUTED',protectedFiles:protectedTree.length,protectedTree,sourceInventory,mentions,frozen,prefixRuns,retained:{recordsPerLane:212,staticGates:53,H1prefixes:104,H2prefixes:208,H3prefixes:190,H4prefixes:190},inherited,proposedOldTestEdits:migrations,variants},null,2)+'\n');
console.log(`PASS ${protectedTree.length} protected; ${sourceInventory.length} source; ${mentions.length} mention files; ${prefixRuns} future prefixes; retained212/53;60blocked`);
