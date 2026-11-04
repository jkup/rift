import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const here=import.meta.dirname,repo=resolve(here,'../../../..');
const read=p=>JSON.parse(readFileSync(join(here,p)));
const hash=b=>createHash('sha256').update(b).digest('hex');
function git(args,input){const r=spawnSync('git',args,{cwd:repo,input,maxBuffer:1024*1024*1024});assert.equal(r.status,0,String(r.error||r.stderr));return r.stdout;}
const baseline=read('baseline-hashes.json'),manifest=read('replacement-manifest.json');
assert.equal(baseline.base,git(['rev-parse','18011ee']).toString().trim());
const expectedPaths=git(['ls-tree','-r','--name-only',baseline.base]).toString().trim().split('\n').filter(p=>!['typescript/TASKS.md','typescript/COORDINATION.md'].includes(p));
assert.deepEqual(baseline.files.map(f=>f.path),expectedPaths);
const bytes=git(['cat-file','--batch'],expectedPaths.map(p=>`${baseline.base}:${p}\n`).join(''));
let offset=0;const blobs=new Map();
for(const f of baseline.files){const end=bytes.indexOf(10,offset),size=Number(bytes.subarray(offset,end).toString().split(' ')[2]);assert.ok(Number.isInteger(size));const b=bytes.subarray(end+1,end+1+size);assert.equal(hash(b),f.sha256,f.path);blobs.set(f.path,b);offset=end+2+size;}assert.equal(offset,bytes.length);
const allowed=p=>['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/harness-map-default.md'].includes(p)||p.startsWith('typescript/docs/validation/ts-034h6-mp/');
for(const p of git(['diff',baseline.base,'--name-only']).toString().trim().split(/\r?\n/).filter(Boolean))assert.ok(allowed(p),'unauthorized change '+p);
for(const p of git(['ls-files','--others','--exclude-standard']).toString().trim().split(/\r?\n/).filter(Boolean))assert.ok(allowed(p),'unauthorized new file '+p);
// Ensure TASKS changes are confined to the assigned terminal entry.
const tasks=git(['show',baseline.base+':typescript/TASKS.md']).toString(),current=readFileSync(join(repo,'typescript/TASKS.md'),'utf8').replaceAll('\r\n','\n');
const marker='### TS-034H6-MP';assert.equal(current.split(marker)[0],tasks.replaceAll('\r\n','\n').split(marker)[0]);
assert.equal(manifest.base,baseline.base);assert.equal(manifest.files.length,1);
const file=manifest.files[0];assert.equal(file.path,'typescript/test/harness-errors-b.ts');assert.equal(file.replacements.length,1);
const original=blobs.get(file.path),e=file.replacements[0];assert.equal(hash(original),file.baseSha256);assert.equal(original.subarray(e.start,e.end).toString(),e.old);
assert.equal(e.old,'check(thrown(run("species();",r)).origin.kind==="unsupported-operation","species unchanged");');
assert.equal(e.new,'const invalidSpecies=run("species();",r);error(invalidSpecies,r,"TypeError");check(thrown(invalidSpecies).diagnostic.message==="map species is not a constructor"&&calls===0,"invalid species language error before callbacks");');
const proposed=Buffer.concat([original.subarray(0,e.start),Buffer.from(e.new),original.subarray(e.end)]);
assert.equal(hash(proposed),file.proposedSha256);assert.deepEqual(proposed,readFileSync(join(here,'proposed/test/harness-errors-b.ts')));assert.deepEqual(original,readFileSync(join(here,'baseline/test/harness-errors-b.ts')));
git(['apply','--check',join(here,'proposed.patch')]);
// Independent literal schedules; not imported from the artifact generator.
const literal={
 T01:['1,1,7','||LKSA','normal []',1],T02:['1,1,7,1','||LKSA|HECD','normal [payload]',2],
 T03:['1,1,7,1','||LKGSQA|HECD','normal [payload]',2],T04:['1,1,7','||L','callback TypeError',1],
 T05:['1,1,7','||LK','language TypeError',1],T06:['1,1,7','||LKS','language TypeError',1],
 T07:['1,1,7','||LKS','unsupported map-species',1],T08:['1,1,7','||LKG','exact abrupt',2],
 T09:['1,1,7','||LKSQ','exact abrupt',2],T10:['1,1,7,1','||LA|HECD','normal [payload]',2],
 T11:['1,1,7','||LKS','language RangeError',1],T12:['1,1,7,1','||LKSQA|H','normal [hole]',2],
 N01:['1,1,7,1','||LKSQlkaA|HECD','normal [payload]',2],N02:['1,1,7,1,1','||LKSQlka|hecdA|HECD','normal [payload]',3]
};
function oracle(frozen,prefixes,calls){
 assert.equal(frozen.status,'UNEXECUTED');assert.deepEqual(frozen.traces.map(t=>t.id),Object.keys(literal));
 assert.deepEqual(frozen.inputs.map(i=>[i.id,i.number,i.source]),[['input-a',7,'probe(7);\n'],['input-b',11,'probe(11);\n']]);
 for(const i of frozen.inputs)assert.equal(hash(readFileSync(join(here,i.file))),i.sha256);
 let pc=0,cc=0;
 for(const t of frozen.traces){const [cols,fx,terminal,minCalls]=literal[t.id];assert.equal(t.status,'UNEXECUTED');assert.equal(t.columns.join(','),cols);assert.equal(t.effectsAfterTick.join('|'),fx);assert.equal(t.terminal,terminal);assert.equal(t.minimumCalls,minCalls);
  const effects=fx.split('|'),N=effects.length,full=effects.join('');assert.equal(t.arrays,[...full].filter(c=>'Aa'.includes(c)).length);assert.equal(t.callbacks,[...full].filter(c=>'Cc'.includes(c)).length);
  for(const i of frozen.inputs)for(const seed of [0,7]){
   for(let k=0;k<=N+1;k++){const p=prefixes.controls[pc++],success=k>=N,seen=effects.slice(0,Math.min(k,N)).join('');assert.deepEqual([p.trace,p.input,p.seed,p.limit,p.steps,p.effects],[t.id,i.id,seed,seed+k,seed+Math.min(k+1,N),seen]);
    assert.equal(p.outcome,success?terminal.replace('payload',String(i.number)):'resource steps');assert.equal(p.count,success?null:seed+k+1);
    assert.deepEqual(p.loc,success?(terminal.startsWith('normal')?null:{line:1,column:1}):{line:1,column:t.columns[k]});
    assert.equal(p.realm,success?(terminal.startsWith('normal')?null:['T08','T09'].includes(t.id)?'C':'A'):k<3?'B':t.id==='N02'&&k===3?'C':'A');
    checkCommon(p,seen,i.id,success&&terminal.startsWith('normal'));
   }
   for(const k of [0,1,2,3]){const c=calls.controls[cc++],fail=k<minCalls;let steps=N,seen=full,realm=terminal.startsWith('normal')?null:['T08','T09'].includes(t.id)?'C':'A';
    if(fail){if(k===0){steps=3;seen='';realm='B';}else if(k===2){assert.equal(t.id,'N02');steps=4;seen='LKSQlkahe';realm='C';}else{const v={T02:[4,'LKSAHE'],T03:[3,'LK'],T08:[3,'LK'],T09:[3,'LKS'],T10:[4,'LAHE'],T12:[3,'LKS'],N01:[3,'LKS'],N02:[3,'LKS']}[t.id];assert.ok(v);[steps,seen]=v;realm='A';}}
    assert.deepEqual([c.trace,c.input,c.seed,c.limit,c.steps,c.effects,c.realm,c.count],[t.id,i.id,seed,k,seed+steps,seen,realm,fail?k:null]);assert.equal(c.outcome,fail?'resource calls':terminal.replace('payload',String(i.number)));assert.deepEqual(c.loc,fail||!terminal.startsWith('normal')?{line:1,column:1}:null);checkCommon(c,seen,i.id,!fail&&terminal.startsWith('normal'));
   }
  }
 }
 assert.equal(pc,308);assert.equal(prefixes.controls.length,pc);assert.equal(cc,224);assert.equal(calls.controls.length,cc);
}
function checkCommon(p,effects,input,normal){assert.equal(p.arrays,[...effects].filter(c=>'Aa'.includes(c)).length);assert.equal(p.callbacks,[...effects].filter(c=>'Cc'.includes(c)).length);assert.equal(p.source,input);assert.equal(p.publication,normal?'fresh outer result':'none');assert.equal(p.cleanup,'calls0; depth0; active null; original sessions reusable');}
const frozen=read('frozen-traces.json'),prefixes=read('prefix-controls.json'),calls=read('call-controls.json');oracle(frozen,prefixes,calls);
const mutations=[
 (f,p,c)=>f.traces[5].terminal='unsupported map-species',
 (f,p,c)=>f.traces[0].effectsAfterTick[2]='LK',
 (f,p,c)=>f.traces[2].effectsAfterTick[2]='LKSQA',
 (f,p,c)=>f.traces[13].minimumCalls=2,
 (f,p,c)=>p.controls.find(x=>x.trace==='T02'&&x.input==='input-b'&&x.outcome==='normal [11]').outcome='normal [7]',
 (f,p,c)=>p.controls.find(x=>x.trace==='N02'&&x.outcome==='resource steps'&&x.realm==='C').realm='A',
 (f,p,c)=>p.controls[0].steps=0,
 (f,p,c)=>p.controls.find(x=>x.trace==='T02'&&x.arrays===1&&x.publication==='none').arrays=0,
 (f,p,c)=>c.controls.find(x=>x.trace==='T03'&&x.limit===1).effects='LKG',
 (f,p,c)=>c.controls.find(x=>x.trace==='N02'&&x.limit===2).callbacks=1,
 (f,p,c)=>p.controls[0].cleanup='fresh session works',
 (f,p,c)=>f.inputs[1].number=7
];
for(const mutate of mutations){const f=structuredClone(frozen),p=structuredClone(prefixes),c=structuredClone(calls);mutate(f,p,c);assert.throws(()=>oracle(f,p,c));}
const matrix=read('matrix.json');assert.equal(matrix.rows.length,54);assert.ok(matrix.rows.every(r=>r.status==='UNEXECUTED'));assert.equal(new Set(matrix.rows.map(r=>r.id)).size,54);
const search=read('consumer-search.json');for(const c of search.consumers){assert.equal(hash(blobs.get(c.path).toString().replaceAll('\r\n','\n')),hash(readFileSync(join(repo,c.path),'utf8').replaceAll('\r\n','\n')));}
const result={status:'PASS offline design audit only',base:baseline.base,protectedFiles:baseline.files.length,oldTestFiles:baseline.files.filter(f=>f.path.startsWith('typescript/test/')).length,consumers:search.consumers.length,proposedOldTestFiles:1,exactReplacements:1,semanticRows:54,traces:14,stepPrefixes:308,callControls:224,oracleNegativeMutations:mutations.length,execution:'UNEXECUTED; no production/build/runtime claim'};
writeFileSync(join(here,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
