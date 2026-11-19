// Read-only semantic source inventory and preservation; no guest/native execution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const repo=resolve(import.meta.dirname,'../../../..'),here=import.meta.dirname,base='677aa31802e498e2430066505415dc7b27c1c221';
const git=(...a)=>execFileSync('git',a,{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024}).trimEnd();
const read=p=>readFileSync(join(repo,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/docs/harness-nonstrict.md'||p.startsWith('typescript/docs/validation/ts-034h4-p/');
assert.equal(git('branch','--show-current'),'codex/test262-classification');
const tree=git('ls-tree','-r',base).split('\n').map(l=>{const [head,path]=l.split('\t');return {path,blob:head.split(' ')[2]};});
const changes=git('diff','--name-only',base).split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changes.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changes.join('\n'));
assert.ok(untracked.every(owned),untracked.join('\n'));
const protectedTree=tree.filter(r=>!owned(r.path)&&r.path!=='typescript/COORDINATION.md');
assert.ok(protectedTree.every(r=>!changes.includes(r.path)));
const marker='### TS-034H4-P — Audit and freeze bounded non-strict Script semantics';
const original=git('show',base+':typescript/TASKS.md'),current=read('typescript/TASKS.md').toString().replaceAll('\r\n','\n').trimEnd();
assert.equal(current.split(marker).length,2);assert.equal(original.split(marker).length,2);
assert.equal(current.split(marker)[0],original.split(marker)[0]);assert.equal(current.split(marker)[1].includes('\n### '),false);
const pattern=/strict|Strict|thisMode|ThisMode|resolveScriptBinding|putScriptBinding|getScriptBinding|deleteReference|putValue|getValue|createGuestFunction|createScriptFunction|materializeFunction|instantiateFunction|instantiateGlobals|instantiateGlobalDeclarations|createFunctionEnvironment|createBlockEnvironment|profile|permit|Permit|pendingBuiltin|guardBuiltin|toObject|create\w+Object|caller|arguments|RESERVED|purpose ===|purpose !==|scriptPrologue/;
const inventory=paths=>paths.map(path=>({path,sha256:sha(read(path)),hits:read(path).toString().split(/\r?\n/).flatMap((text,i)=>pattern.test(text)?[{line:i+1,text}]:[])}));
const sourceInventory=inventory(tree.filter(r=>r.path.startsWith('typescript/src/')&&r.path.endsWith('.ts')).map(r=>r.path));
const testInventory=inventory(tree.filter(r=>/^typescript\/(test|fixtures|tools|docs\/validation)\//.test(r.path)&&/\.(ts|js|mjs)$/.test(r.path)).map(r=>r.path)).filter(r=>r.hits.length);
const required={
 'script-execution-internal.ts':['get strict(): true','get thisMode(): "strict"','readonly strict: true','strict: true, thisValue: realm.globalThisValue','if (!scope.strict ||','resolveScriptBinding(this.#active().lexical, declaration.name, stmt.loc)','const written = environment.setMutableBinding','this.#abrupt = null;'],
 'script-environment.ts':['readonly strict: true','reference: { base: current, name, strict: true'],
 'global-environment.ts':['return this.setObjectBinding(name, value, true','private setObjectProperty','export function putStrictGlobalBinding'],
 'runtime.ts':['if (!result.value) return failure("TypeError", "property is not writable:','ref.key = typeof key.value'],
 'delete-reference.ts':['if (!deleted.value) return failure','const base = toObject'],
 'script-global-declarations.ts':['if (!plan.strictness.strict) throw new Error("strict declaration plan required")'],
 'script-declarations.ts':['if (!scope.strict || handler.lexicalNames','non-strict block function planning is unsupported'],
 'parser.ts':['delete of an identifier is not allowed','private readonly purpose',' eval arguments '],
 'realm.ts':['!consumeScriptBuiltinPermit','invalid Script factory Realm'],
 'builtins/restricted-function.ts':['realm.functionPrototype.bootstrapDefine','thrower.preventExtensions()']
};
for(const [file,needles] of Object.entries(required))for(const n of needles)assert.ok(read('typescript/src/'+file).toString().includes(n),file+': '+n);
const prefixes=JSON.parse(readFileSync(join(here,'prefixes.json')));
assert.deepEqual(prefixes.map(p=>p.ticks.length),[13,14,9,3,5,4,2,4,6,5,2,16]);
for(const p of prefixes){
 assert.ok(p.rootInstantiationTicks<=p.ticks.length);
 for(const [unit,line,col] of p.ticks)assert.ok(p.sources[unit].split('\n')[line-1]?.[col-1]?.match(/\S/),p.id+' coordinate');
 for(const n of Object.keys(p.effects))assert.ok(+n>=1&&+n<=p.ticks.length);
 for(const n of p.calleeSetupTicks)assert.ok(n>p.rootInstantiationTicks&&n<=p.ticks.length);
}
const prefixRuns=prefixes.reduce((n,p)=>n+2*(p.ticks.length+1),0);
const prior='typescript/docs/validation/ts-034h3/';
for(const lane of ['node','native'])assert.equal(JSON.parse(read(prior+`guest-${lane}-results.json`)).length,212);
const gates=JSON.parse(read(prior+'native-build-results.json'));assert.equal(gates.length,52);
for(const g of gates){assert.equal(g.verdict,'PASS');assert.equal(g.build.status,0);assert.equal(g.coverage.status,0);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(g.coverage.stdout));}
const manifest=JSON.parse(read('typescript/fixtures/assistance/test262-starter-corpus/manifest.json'));
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
const upstream=JSON.parse(readFileSync(join(here,'upstream.json')));
assert.equal(upstream[0].sha256,'6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713');
for(const u of upstream.slice(1))assert.equal(sha(u.lines.map(l=>l.text).join('\n')),u.sha256);
const inherited=[['ts-034p/h1-correction.md',null],['ts-034h2-p/prefixes.json',208],['ts-034h3-p/prefixes.json',190]].map(([p,count])=>({path:p,sha256:sha(read('typescript/docs/validation/'+p)),retainedPrefixes:count}));
const frozen=['typescript/docs/harness-nonstrict.md',...['prefixes.json','input-seven.js','input-eleven.js','upstream.json'].map(p=>'typescript/docs/validation/ts-034h4-p/'+p)].map(path=>({path,sha256:sha(read(path))}));
writeFileSync(join(here,'audit.json'),JSON.stringify({base,mode:'source/preservation only; all future semantic rows and prefixes UNEXECUTED',protectedFiles:protectedTree.length,protectedTree,sourceInventory,testInventory,frozen,prefixRuns,retained:{recordsPerLane:212,staticGates:52,H1prefixes:104,H2prefixes:208,H3prefixes:190},inherited,proposedOldTestEdits:[],variants},null,2)+'\n');
console.log(`PASS ${protectedTree.length} protected files; ${sourceInventory.length} source files; ${testInventory.length} old-test/evidence mention files; ${prefixRuns} frozen future prefixes; retained212/52;60blocked`);
