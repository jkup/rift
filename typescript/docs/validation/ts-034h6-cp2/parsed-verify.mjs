import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const read=p=>JSON.parse(readFileSync(join(import.meta.dirname,p)));
// Independent literal columns and boundaries; no import of generator or engine.
const table=[['call-return',[1,1,8,1,1,1,1,14,21],3,5,9,false],['call-throw',[1,1,8,1,1,1,1,14,20],3,5,9,true],['new-return',[1,1,5,12,1,1,1,1,14,21,1],4,6,10,false],['new-throw',[1,1,5,12,1,1,1,1,14,20],4,6,10,true]];
function audit(d){assert.equal(d.traces.length,4);for(const [n,t] of d.traces.entries()) {
 const [id,cols,sourceTicks,start,end,throws]=table[n],N=cols.length;
 assert.equal(t.id,id);assert.equal(t.sourceTicks,sourceTicks);assert.deepEqual(t.events.map(e=>e.column),cols);
 for(const [i,e] of t.events.entries()){assert.equal(e.phase,i>=start&&i<start+2?'instantiation':'body');assert.equal(e.realm,i<sourceTicks?'caller':i>=start&&i<end?'H':'A');assert.equal(e.source,i>=start&&i<end?'getter':'input');assert.equal(e.effect,!throws&&i===end-1?'M':'');}
 for(const input of ['input-a','input-b']){const q=t.inputs[input],word=input==='input-a'?'seven':'eleven';assert.equal(q.expected,throws?'exact marker; guest throw; no prototype Get or String allocation':id.startsWith('new')?'StringData '+word+'; prototype A':'string '+word);assert.equal(q.prefixes.length,2*(N+2));
 for(const [j,p] of q.prefixes.entries()){const seed=j<N+2?0:7,k=j%(N+2);assert.equal(p.seed,seed);assert.equal(p.limit,seed+k);assert.equal(p.steps,seed+Math.min(k+1,N));assert.equal(p.effect,!throws&&k>=end?'M':'');assert.equal(p.outcome,k<N?'resource steps':throws?'guest throw':'normal');assert.equal(p.column,k<N?cols[k]:throws?14:null);assert.equal(p.realm,k<N?t.events[k].realm:throws?'H':null);assert.equal(p.source,k<N?(k>=start&&k<end?'getter':input):throws?'getter':null);assert.equal(p.phase,k<N?t.events[k].phase:throws?'body':null);assert.equal(p.publication,k>=N&&!throws?'return value':'none');}
 assert.equal(q.calls.length,8);for(const [j,c] of q.calls.entries()){const seed=j<4?0:7,limit=j%4;assert.equal(c.seed,seed);assert.equal(c.limit,limit);assert.equal(c.steps,seed+(limit===0?sourceTicks:limit===1?start:N));assert.equal(c.outcome,limit<2?'resource calls':throws?'guest throw':'normal');assert.equal(c.effect,limit>=2&&!throws?'M':'');assert.equal(c.realm,limit===0?'caller':limit===1?'A':throws?'H':null);assert.equal(c.source,limit<2?input:throws?'getter':null);assert.equal(c.column,limit<2?1:throws?14:null);}
 }
}}
const d=read('parsed-traces.json');audit(d);
const mutations=[x=>x.traces[0].events.splice(6,1),x=>x.traces[0].events[6].phase='body',x=>x.traces[2].inputs['input-b'].expected='StringData seven; prototype A',x=>x.traces[1].inputs['input-a'].prefixes[9].column=20,x=>x.traces[2].inputs['input-b'].calls[1].steps=5];
for(const m of mutations){const x=structuredClone(d);m(x);assert.throws(()=>audit(x));}
const r={status:'PASS offline only',traces:4,prefixesPerInput:94,callControlsPerInput:32,inputs:2,mutations:mutations.length};
assert.equal(d.traces.reduce((n,t)=>n+t.inputs['input-a'].prefixes.length,0),r.prefixesPerInput);
writeFileSync(join(import.meta.dirname,'parsed-verification.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
