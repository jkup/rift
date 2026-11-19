// Read-only engine audit: parses whole retained units; never evaluates guest code.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {parseDeclarationPlan} from '../../../build/node/src/parser.js';
import {prepareStrictScript} from '../../../build/node/src/script-record.js';
import {Realm} from '../../../build/node/src/realm.js';
import {blockers,frozenManifest} from '../../../tools/test262/input.mjs';
const root=resolve(import.meta.dirname,'../../..'),repo=resolve(root,'..'),base='b84a5e0';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:repo,maxBuffer:64*1024*1024});
const owned=p=>p==='typescript/docs/harness-prerequisites.md'||p.startsWith('typescript/docs/validation/ts-034p/')||p==='typescript/TASKS.md';
const tree=git('ls-tree','-r',base).toString().trim().split('\n').map(line=>{
 const [header,path]=line.split('\t');return {path,blob:header.split(' ')[2]};
});
const paths=tree.map(e=>e.path);
const changes=git('diff','--name-only',base).toString().trim().split('\n').filter(Boolean);
assert.ok(changes.every(p=>owned(p)||p==='typescript/COORDINATION.md'||p==='Claude Roadmap.md'),changes.join('\n'));
assert.ok(git('ls-files','--others','--exclude-standard').toString().trim().split('\n').filter(Boolean).every(owned));
const protectedFiles=[];
for(const path of paths.filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md'&&p!=='Claude Roadmap.md')) {
  // The full baseline diff above compares Git-clean content, accounting for CRLF.
  const old=tree.find(e=>e.path===path).blob;
  assert.ok(!changes.includes(path)); protectedFiles.push({path,blob:old,sha256:sha(readFileSync(join(repo,path)))});
}
const taskOld=git('show',base+':typescript/TASKS.md').toString().replaceAll('\r\n','\n');
const taskNow=readFileSync(join(root,'TASKS.md'),'utf8').replaceAll('\r\n','\n');
assert.equal(taskNow.split('### TS-034P')[0],taskOld.split('### TS-034P')[0]);
const {manifest}=await frozenManifest();
const corpus=JSON.parse(readFileSync(join(root,'docs/validation/ts-033p/corpus.json')));
const results=[];
for(const entry of corpus.filter(e=>e.id!=='LICENSE')) {
  const bytes=Buffer.from(entry.text); assert.equal(sha(bytes),entry.sha256);
  assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),entry.blob);
  const selected=manifest.entries.find(e=>e.id===entry.id);
  assert.equal(entry.blob,selected?.blob??manifest.upstream.harnessBlobs[entry.id]);
  const unit={id:entry.id,text:entry.text};
  const plan=parseDeclarationPlan(unit);
  const preparation=prepareStrictScript(unit,new Realm(()=>{},'script'));
  results.push({id:entry.id,blob:entry.blob,sha256:entry.sha256,bytes:bytes.length,
    parse:plan.kind==='complete'?{kind:plan.kind,consumedUnits:plan.consumedUnits,strict:plan.strictness.strict}:plan,
    preparation:preparation.kind==='ready'?{kind:preparation.kind}:preparation});
}
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length));
const evidence='docs/validation/ts-033e4/execution/';
for(const lane of ['node','native'])assert.equal(JSON.parse(readFileSync(join(root,evidence+`guest-${lane}-results.json`))).length,212);
const gates=JSON.parse(readFileSync(join(root,evidence+'native-build-results.json')));assert.equal(gates.length,49);
const result={base,mode:'Node-hosted parse only, original unchanged units; no native or execution claim',results,variants,retained:{recordsPerLane:212,gates:49},protectedFiles};
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`PASS ${results.length} unchanged whole units submitted; ${protectedFiles.length} protected files; retained212/49;60blocked`);
for(const r of results.filter(r=>r.id.startsWith('harness/')))console.log(r.id,JSON.stringify({kind:r.parse.kind,rejection:r.parse.rejection,diagnostic:r.parse.diagnostic,preparation:r.preparation.kind}));
