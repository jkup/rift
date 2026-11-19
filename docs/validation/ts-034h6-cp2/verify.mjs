import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const here=import.meta.dirname,repo=resolve(here,'../../../..');
const read=p=>JSON.parse(readFileSync(join(here,p)));
const hash=b=>createHash('sha256').update(b).digest('hex');
function git(args,input){const r=spawnSync('git',args,{cwd:repo,input,maxBuffer:1024*1024*1024});assert.equal(r.error,undefined,String(r.error));assert.equal(r.status,0,r.stderr.toString());return r.stdout;}
const baseline=read('baseline-hashes.json'),manifest=read('replacement-manifest.json');
assert.equal(manifest.base,baseline.base);assert.equal(manifest.base,git(['rev-parse','89d3796']).toString().trim());
const all=git(['cat-file','--batch'],baseline.files.map(f=>`${baseline.base}:${f.path}\n`).join(''));
let pos=0;const blobs=new Map();
for(const f of baseline.files){const end=all.indexOf(10,pos),header=all.subarray(pos,end).toString(),size=Number(header.split(' ')[2]);assert.ok(Number.isInteger(size));const b=all.subarray(end+1,end+1+size);assert.equal(hash(b),f.sha256,f.path);blobs.set(f.path,b);pos=end+2+size;}
assert.equal(pos,all.length);
const changed=git(['diff',baseline.base,'--name-only']).toString().trim().split(/\r?\n/).filter(Boolean);
for(const p of changed)assert.ok(p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p.startsWith('typescript/docs/validation/ts-034h6-cp2/'),'unauthorized change '+p);
assert.deepEqual(manifest.files.map(f=>f.path).sort(),['typescript/test/harness-errors-a.ts','typescript/test/harness-map-default.ts','typescript/test/script-realm-bootstrap.ts']);
function reconstruct(f){let bytes=blobs.get(f.path);assert.equal(hash(bytes),f.baseSha256);let last=bytes.length;for(const e of [...f.replacements].reverse()){assert.ok(e.end<=last&&e.start<=e.end);assert.equal(bytes.subarray(e.start,e.end).toString(),e.old);bytes=Buffer.concat([bytes.subarray(0,e.start),Buffer.from(e.new),bytes.subarray(e.end)]);last=e.start;}assert.equal(hash(bytes),f.proposedSha256);assert.deepEqual(bytes,readFileSync(join(here,'proposed',f.path.slice(11))));return bytes;}
for(const f of manifest.files)reconstruct(f);
assert.equal(manifest.files.reduce((n,f)=>n+f.replacements.length,0),7);
git(['apply','--check',join(here,'proposed.patch')]);
// Literal independent schedule/outcome table. No engine output and no freeze import.
const table={
 T13:[[1,1,8,1,1],3,5,2,'seven','eleven'],
 T14:[[1,1,5,12,1,1,1],4,6,2,'StringData seven','StringData eleven'],
 T15:[[1,1,8],3,0,1,'exact o, no Get/coercion/allocation','exact o, no Get/coercion/allocation'],
 T16:[[1,1,5,12],4,0,1,'exact o, no Get/coercion/allocation','exact o, no Get/coercion/allocation'],
 T17:[[1,1,1],2,0,1,'fresh empty object','fresh empty object'],
 T18:[[1,1,5,1],3,0,1,'fresh empty object','fresh empty object'],
 C01:[[1,1,8],3,0,1,'string "7"','string "11"'],
 C02:[[1,1,5,12,1],4,0,1,'StringData "7"; own keys 0,length; String prototype A','StringData "11"; own keys 0,1,length; String prototype A'],
 C03:[[1,1,8],3,0,1,'string "Symbol(x)"','string "Symbol(x)"'],
 C04:[[1,1,5,12],4,0,1,'TypeError A; no String allocation/prototype Get','TypeError A; no String allocation/prototype Get'],
 C05:[[1,1,8,1],3,4,2,'TypeError A; returned Symbol; M once; no String allocation/prototype Get','TypeError A; returned Symbol; M once; no String allocation/prototype Get'],
 C06:[[1,1,5,12,1],4,5,2,'TypeError A; returned Symbol; M once; no String allocation/prototype Get','TypeError A; returned Symbol; M once; no String allocation/prototype Get'],
 C07:[[1,1,8,1],3,0,2,'TypeError A after Symbol wrapper primitive extraction; no String allocation/prototype Get','TypeError A after Symbol wrapper primitive extraction; no String allocation/prototype Get'],
 C08:[[1,1,5,12,1],4,0,2,'TypeError A after Symbol wrapper primitive extraction; no String allocation/prototype Get','TypeError A after Symbol wrapper primitive extraction; no String allocation/prototype Get'],
 C09:[[1,1,8,1],3,0,1,'genuine NumberData 7; Number prototype A','genuine NumberData 11; Number prototype A'],
 C10:[[1,1,5,12,1],4,0,1,'genuine NumberData 7; Number prototype A','genuine NumberData 11; Number prototype A']
};
const sources=['String(m);','new String(m);','Object(o);','new Object(o);','Object();','new Object();','String(7);','new String(7);','String(s);','new String(s);','String(m);','new String(m);','String(w);','new String(w);','Object(p);','new Object(p);'];
function oracle(data){
 assert.deepEqual(data.inputs.map(i=>[i.id,i.number,i.payload,i.source]),[['input-a',7,'seven','String(7);\n'],['input-b',11,'eleven','String(11);\n']]);
 assert.deepEqual(data.traces.map(t=>t.id),Object.keys(table));
 for(const [index,t] of data.traces.entries()){
  const [cols,sourceTicks,effectAt,calls,a,b]=table[t.id],N=cols.length;
  assert.deepEqual(t.events.map(e=>e.column),cols);assert.equal(t.sourceTicks,sourceTicks);assert.equal(t.minimumCalls,calls);
  assert.deepEqual(t.events.map(e=>e.effect),cols.map((_,n)=>n+1===effectAt?'M':''));
  assert.deepEqual(t.expectedByInput,{'input-a':a,'input-b':b});
  for(const key of ['expected','prefixes','calls','abruptVariants'])assert.equal(t[key],undefined);
  const terminal=/^C0[4-8]$/.test(t.id)?'engine TypeError':'normal';assert.equal(t.terminal,terminal);
  for(const [id,expected] of [['input-a',a],['input-b',b]]){
   assert.equal(t.sourcesByInput[id],(id==='input-b'&&['C01','C02'].includes(t.id)?sources[index].replace('(7)','(11)'):sources[index])+'\n');
   const prefixes=t.prefixesByInput[id];assert.equal(prefixes.length,2*(N+2));
   for(const [j,p] of prefixes.entries()){const seed=j<N+2?0:7,k=j%(N+2);assert.equal(p.seed,seed);assert.equal(p.limit,seed+k);assert.equal(p.steps,seed+Math.min(k+1,N));assert.equal(p.outcome,k<N?'resource steps':terminal);assert.equal(p.expected,k<N?'step limit exceeded':expected);assert.equal(p.effects,effectAt&&k>=effectAt?'M':'');assert.deepEqual(p.loc,k<N?{line:1,column:cols[k]}:terminal==='normal'?null:{line:1,column:1});assert.equal(p.realm,k<N?(k<sourceTicks?'caller':'A'):terminal==='normal'?null:'A');assert.equal(p.source,id);assert.equal(p.phase,'body');assert.equal(p.publication,k>=N&&terminal==='normal'?'return value':'none');assert.match(p.cleanup,/calls0; depth0/);}
   assert.equal(t.callsByInput[id].length,2);
   for(const [j,c] of t.callsByInput[id].entries()){const seed=j*7;assert.equal(c.seed,seed);assert.equal(c.maxCalls0.steps,seed+sourceTicks);assert.equal(c.maxCalls0.count,0);assert.equal(c.maxCalls0.limit,0);assert.equal(c.maxCalls0.realm,'caller');assert.equal(c.maxCalls0.effects,'');assert.equal(c.maxCalls0.source,id);assert.equal(c.sufficient.limit,calls);assert.equal(c.sufficient.expected,expected);assert.equal(c.sufficient.steps,seed+N);assert.equal(c.sufficient.outcome,terminal);assert.equal(c.sufficient.effects,effectAt?'M':'');if(calls===2){assert.equal(c.maxCalls1.steps,seed+(effectAt||N));assert.equal(c.maxCalls1.outcome,'resource calls');assert.equal(c.maxCalls1.count,1);assert.equal(c.maxCalls1.limit,1);assert.equal(c.maxCalls1.effects,'');assert.equal(c.maxCalls1.realm,'A');}else{assert.equal(c.maxCalls1.expected,expected);assert.equal(c.maxCalls1.outcome,terminal);assert.equal(c.maxCalls1.steps,seed+N);}}
   assert.equal(t.abruptByInput[id].length,effectAt?1:0);
   if(effectAt){const q=t.abruptByInput[id][0];assert.equal(q.atTick,effectAt);assert.equal(q.freshSteps,effectAt);assert.equal(q.seededSteps,effectAt+7);assert.equal(q.effects,'M');assert.equal(q.source,id);assert.equal(q.variants.length,4);assert.equal(q.stringAllocation,'none');assert.equal(q.stringPrototypeGet,'none');assert.match(q.cleanup,/BOTH original sessions/);}
  }
 }
}
const data=read('frozen-traces.json');oracle(data);
for(const i of data.inputs)assert.equal(hash(readFileSync(join(here,i.file))),i.sha256);
const bp=read('../ts-034h6-bp/frozen-traces.json');for(const t of data.traces.slice(0,6))assert.deepEqual(t.events,bp.traces.find(p=>p.id===t.id).events);
const mutations=[
 d=>d.traces[0].expectedByInput['input-b']='seven',
 d=>d.traces[6].sourcesByInput['input-b']='String(7);\n',
 d=>d.traces[7].callsByInput['input-b'][0].sufficient.expected=d.traces[7].expectedByInput['input-a'],
 d=>d.traces[0].prefixesByInput['input-b'][5].expected='seven',
 d=>d.traces[0].callsByInput['input-a'][0].maxCalls1.effects='M',
 d=>d.traces[1].events[6].column=12,
 d=>d.traces[2].sourceTicks=2,
 d=>d.traces[3].events.push({column:1,event:'allocation',effect:''}),
 d=>d.traces[9].terminal='normal',
 d=>d.traces[12].minimumCalls=1,
 d=>d.inputs[1].payload='seven',
 d=>d.traces[0].abruptByInput['input-b'][0].stringPrototypeGet='performed',
 d=>d.traces[0].expected='seven/eleven'
];
for(const mutate of mutations){const copy=structuredClone(data);mutate(copy);assert.throws(()=>oracle(copy));}
const broken=structuredClone(manifest.files[0]);broken.replacements[0].new+=' ';assert.throws(()=>reconstruct(broken));
const rows=read('matrix-map.json');assert.deepEqual(rows.map(r=>r.id),Array.from({length:12},(_,i)=>'F'+String(i+1).padStart(2,'0')));
for(const r of rows){assert.ok(r.expectedByInput['input-a']&&r.expectedByInput['input-b']);assert.equal(r.status,'UNEXECUTED');}
assert.deepEqual(rows[4].expectedByInput,{'input-a':'M once with string hint; call="seven"; new StringData seven; abrupt exact q before prototype Get/allocation','input-b':'M once with string hint; call="eleven"; new StringData eleven; abrupt exact q before prototype Get/allocation'});
assert.deepEqual(rows[11].expectedByInput,{'input-a':'String(7)="7"; new String(7) data "7"; Object(o)/new Object(o) exact o','input-b':'String(11)="11"; new String(11) data "11"; Object(o)/new Object(o) exact o'});
const original=read('../ts-034h6-cp/replacement-manifest.json');
for(const f of original.files)assert.deepEqual(manifest.files.find(g=>g.path===f.path),f,'original CP proposal preserved');
assert.deepEqual(data,read('../ts-034h6-cp/frozen-traces.json'),'host-hook schedules unchanged');
const result={status:'PASS offline only; C semantics UNEXECUTED',base:baseline.base,protectedFiles:baseline.files.length,oldTestFiles:baseline.files.filter(f=>f.path.startsWith('typescript/test/')).length,proposedFiles:3,replacements:7,wholeFileReconstruction:true,patchCheck:true,traceCount:16,prefixesPerInput:200,inputs:2,matrixRows:12,oracleMutationNegatives:mutations.length,manifestMutationNegatives:1};
writeFileSync(join(here,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
