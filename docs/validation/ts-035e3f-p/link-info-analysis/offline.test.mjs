import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {hash,reconcile} from './reconcile.mjs';
const here=import.meta.dirname;
const old=join(here,'../probe-contract/atomic-job-correction/lifecycle-execution/cleanup-rerun/descendant-publication/execution/parent-lifetime/execution/compiler-probe-refresh/cmd-identity-amendment/execution');
const json=p=>JSON.parse(readFileSync(p)),literal=json(join(here,'metadata-literal.json')),ordered=json(join(here,'ordered-input-literal.json'));
const inventory=json(join(old,'inventory.json')),map=new Map(inventory.files.map(r=>[r.path,r]));
const read=p=>{const r=map.get(p);assert(r,'missing archived input');const b=Buffer.concat(r.chunks.map(sha=>{const b=gunzipSync(readFileSync(join(old,'blobs',sha+'.gz')));assert.equal(hash(b),sha);return b;}));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);return b;};
const actual=JSON.parse(read('compiler.stdout.bin'));
const reconciled=reconcile(actual,literal,ordered,read),rejected=[];
function reject(id,change){const m=structuredClone(actual),o=structuredClone(ordered);let reader=read;reader=change(m,o,reader)||reader;assert.throws(()=>reconcile(m,literal,o,reader),undefined,id);rejected.push(id);}
for(let i=0;i<42;i++){
 reject('missing-ordered-'+i,m=>{m.link.input_order.splice(i,1)});
 reject('duplicate-ordered-'+i,m=>{m.link.input_order[i]=m.link.input_order[(i+1)%42]});
 reject('missing-archive-'+i,(m,o,r)=>p=>{if(p===o[i].path)throw Error('missing');return r(p)});
 reject('changed-archive-byte-'+i,(m,o,r)=>p=>{const b=Buffer.from(r(p));if(p===o[i].path)b[0]^=1;return b});
 reject('changed-archive-size-'+i,(m,o,r)=>p=>p===o[i].path?Buffer.concat([r(p),Buffer.from([0])]):r(p));
 reject('ordered-literal-hash-'+i,(m,o)=>{o[i].sha256='0'.repeat(64)});
 reject('ordered-literal-size-'+i,(m,o)=>{o[i].bytes++});
 if(i<41){
  reject('reorder-'+i,m=>{[m.link.input_order[i],m.link.input_order[i+1]]=[m.link.input_order[i+1],m.link.input_order[i]]});
  reject('object-hash-'+i,m=>{m.runtime_pack.objects[i].sha256='0'.repeat(64)});
  reject('object-size-'+i,m=>{m.runtime_pack.objects[i].size++});
  reject('missing-object-'+i,m=>{m.runtime_pack.objects.splice(i,1)});
 }
}
for(const path of ['../probe.obj','artifacts/../probe.obj','/probe.obj','C:/probe.obj','artifacts\\release\\runtime\\default\\scr_context.o','artifacts//release/runtime/default/scr_context.o'])reject('path-'+path,m=>{m.runtime_pack.objects[0].path=path});
for(const key of Object.keys(actual)){
 reject('missing-field-'+key,m=>{delete m[key]});
 reject('wrong-type-'+key,m=>{m[key]=null});
}
reject('extra-field',m=>{m.unreviewed=true});
reject('root-substitution',m=>{m.runtime_pack.root+='-other'});
reject('program-substitution',m=>{m.program.object=m.program.object.replace('probe.obj','other.obj')});
reject('case-alias',m=>{m.link.input_order[0]=m.link.input_order[0].toLowerCase()});
reject('extra-object',m=>{m.runtime_pack.objects.push(m.runtime_pack.objects[0])});
reject('extra-input',m=>{m.link.input_order.push(m.link.input_order[0])});
writeFileSync(join(here,'reconciliation.json'),JSON.stringify(reconciled,null,2)+'\n',{flag:'wx'});
writeFileSync(join(here,'offline-results.json'),JSON.stringify({fullLiteral:true,orderedInputs:42,runtimeObjects:41,programObjects:1,rejected,childProcesses:0,compilerInvocations:0,linkerInvocations:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({reconciled:42,rejected:rejected.length}));
