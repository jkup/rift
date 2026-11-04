import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const here=import.meta.dirname,root=resolve(here,'../../..'),repo=resolve(root,'..');
const read=p=>readFileSync(p),json=p=>JSON.parse(read(join(here,p))),hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=json('replacement-manifest.json'),baseline=json('baseline-hashes.json');
function reconstruct(before,entry){
 assert.equal(hash(before),entry.beforeSha256,entry.path+' before hash');
 let parts=[],cursor=0;
 for(const r of entry.replacements){
  assert.ok(Number.isInteger(r.start)&&r.start>=cursor&&r.end>=r.start&&r.end<=before.length);
  assert.deepEqual(before.subarray(r.start,r.end),Buffer.from(r.old));
  parts.push(before.subarray(cursor,r.start),Buffer.from(r.new));cursor=r.end;
 }
 parts.push(before.subarray(cursor));return Buffer.concat(parts);
}
for(const f of baseline.files) assert.equal(hash(read(join(repo,f.path))),f.sha256,f.path+' preserved bytes');
for(const f of manifest.files){
 const before=read(join(repo,f.path)),proposal=read(join(here,'proposed',f.path.slice('typescript/'.length)));
 const expected=reconstruct(before,f);
 assert.deepEqual(proposal,expected,f.path+' complete proposed file');assert.equal(hash(proposal),f.afterSha256);
 // Negative controls: a changed unlisted byte or incomplete replacement cannot pass.
 const changed=Buffer.from(proposal);changed[0]^=1;assert.notDeepEqual(changed,expected);
 const badBefore=Buffer.from(before);badBefore[0]^=1;assert.throws(()=>reconstruct(badBefore,f));
 const shortened={...f,replacements:f.replacements.slice(1)};assert.notDeepEqual(reconstruct(before,shortened),proposal);
}
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p.startsWith('typescript/docs/validation/ts-034h6-bp/');
assert.ok(git('diff','--name-only',manifest.base).split('\n').filter(Boolean).every(owned));
assert.ok(git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean).every(owned));
const marker='### TS-034H6-BP — Exact B migration preparation';
assert.equal(read(join(root,'TASKS.md')).toString().replaceAll('\r\n','\n').split(marker)[0],git('show',manifest.base+':typescript/TASKS.md').replaceAll('\r\n','\n').split(marker)[0]);
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const proposed=walk(join(here,'proposed')).map(p=>'typescript/'+relative(join(here,'proposed'),p).replaceAll('\\','/')).sort();
assert.deepEqual(proposed,manifest.files.map(f=>f.path).sort());
const mask=s=>s.replace(/\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,m=>m.replace(/[^\r\n]/g,' '));
const helpers='toNumber toString toUint32 toIntegerOrInfinity toLength thisNumberValue thisStringValue thisBooleanValue thisSymbolValue'.split(' ');
let helperCalls=0;
for(const p of walk(join(root,'test')).filter(p=>p.endsWith('.ts'))){
 const s=read(p).toString(),m=mask(s),path='typescript/'+relative(root,p).replaceAll('\\','/');
 const f=manifest.files.find(f=>f.path===path);
 for(const hit of m.matchAll(new RegExp('(?<![\\w.])('+helpers.join('|')+')\\s*\\(','g'))){
  let end=hit.index+hit[0].length,depth=1;while(depth){if(m[end]==='(')depth++;if(m[end]===')')depth--;end++;}
  const pos=Buffer.byteLength(s.slice(0,end-1));
  assert.ok(f?.replacements.some(r=>r.start===pos&&r.end===pos&&r.new===', null'),path+':'+(s.slice(0,hit.index).split('\n').length)+' unlisted helper call');helperCalls++;
 }
}
const corpus=JSON.parse(read(join(root,'fixtures/assistance/test262-starter-corpus/manifest.json')));
const variants=corpus.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length));
const freeze=json('frozen-traces.json'),map=json('matrix-map.json');
assert.deepEqual(map.map(r=>r.id).sort(),[...Array.from({length:36},(_,i)=>'E'+String(i+1).padStart(2,'0')),...Array.from({length:12},(_,i)=>'F'+String(i+1).padStart(2,'0')),...Array.from({length:10},(_,i)=>'G'+String(i+1).padStart(2,'0'))].sort());
for(const i of freeze.inputs)assert.equal(hash(read(join(here,i.file))),i.sha256);
for(const t of freeze.traces){assert.equal(t.prefixes.length,2*(t.events.length+2));for(const p of t.prefixes.filter(p=>p.outcome==='resource steps')){const k=p.limit-p.seed;assert.equal(p.steps,p.limit+1);assert.equal(p.column,t.events[k].column);assert.equal(p.effects,t.events.slice(0,k).map(e=>e.effect).join(''));}}
const result={status:'PASS offline preservation; future semantics UNEXECUTED',base:manifest.base,protectedFiles:baseline.files.length,oldTests:baseline.files.filter(f=>f.path.startsWith('typescript/test/')).length,proposedFiles:manifest.files.length,replacements:manifest.files.reduce((n,f)=>n+f.replacements.length,0),directHelperCalls:helperCalls,actualOldTestEdits:0,rows:map.length,tracePrefixesPerInput:freeze.traces.reduce((n,t)=>n+t.prefixes.length,0),inputs:2,blocked:60,mutationChecks:'altered baseline, unlisted proposed byte, omitted replacement rejected for all proposed files'};
writeFileSync(join(here,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
