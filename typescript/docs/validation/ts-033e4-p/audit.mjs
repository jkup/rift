// Offline preservation/source evidence only. No production execution or builds.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {blockers} from '../../../tools/test262/input.mjs';
const repo=resolve(import.meta.dirname,'../../../..'), base='9b540e7';
const git=(...a)=>execFileSync('git',a,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024}).trimEnd();
const read=p=>readFileSync(join(repo,p)), json=p=>JSON.parse(read(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const own=p=>p==='typescript/docs/script-execution-activation.md'||p.startsWith('typescript/docs/validation/ts-033e4-p/');
const task='typescript/TASKS.md', coordinator='typescript/COORDINATION.md';
const changed=git('diff','--name-only',base).split('\n').filter(Boolean);
const untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changed.every(p=>own(p)||p===task||p===coordinator),changed.join('\n'));
assert.ok(untracked.every(own),untracked.join('\n'));
const heading='### TS-033E4-P — Atomic internal Script execution contract';
const before=git('show',base+':'+task),after=read(task).toString().replaceAll('\r\n','\n').trimEnd();
assert.equal(after.split(heading)[0],before.split(heading)[0]);
assert.equal(after.split(heading).length,2);
const tracked=git('ls-tree','-r','--name-only',base).split('\n');
const protectedPaths=tracked.filter(p=>!own(p)&&p!==task&&p!==coordinator);
assert.ok(!changed.some(p=>protectedPaths.includes(p)));
const sourcePaths=tracked.filter(p=>/^typescript\/(src|test)\//.test(p));
const sources=sourcePaths.map(path=>({path,sha256:hash(read(path))}));
const seams=[];
const pattern=/#state|DeclarationNodes|assignmentNameEligible|instantiate|materialize|Script execution unavailable|legacy Realm required|guardBuiltin|finally|calls|depth|OperationContext|case "|RESERVED/;
for(const path of sourcePaths.filter(p=>p.includes('/src/')))read(path).toString().split(/\r?\n/).forEach((text,i)=>{if(pattern.test(text))seams.push({path,line:i+1,text});});
const evidence='typescript/docs/validation/ts-033er-b/';
const inherited=['guest-node-results.json','guest-native-results.json','native-build-results.json'].map(n=>({path:evidence+n,records:json(evidence+n).length,sha256:hash(read(evidence+n))}));
assert.deepEqual(inherited.map(x=>x.records),[212,212,48]);
const gates=json(evidence+'native-build-results.json');
for(const row of gates){assert.equal(row.verdict,'PASS');assert.equal(row.build.status,0);assert.equal(row.coverage.status,0);const r=row.coverage.stdout,a=/statements analyzed\s+(\d+)/.exec(r),s=/compile statically\s+(\d+)\s+\(100%\)/.exec(r);assert.ok(a&&s);assert.equal(a[1],s[1]);assert.ok(!/in dynamic tier\s+[1-9]\d*/.test(r));}
const manifest=json('typescript/fixtures/assistance/test262-starter-corpus/manifest.json');
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length));
const copies=[['execution-matrix.md','ts-033e-p/matrix.md'],['setup-matrix.md','ts-033e3b/frozen-matrix.md'],['accessor-matrix.md','ts-033er-p/matrix.md']];
for(const [dest,src] of copies)assert.deepEqual(read('typescript/docs/validation/ts-033e4-p/'+dest),read('typescript/docs/validation/'+src));
const research=[];
for(const dir of ['ts-033e-p','ts-033er-p']){
 const prefix='typescript/docs/validation/'+dir+'/';const spec=json(prefix+'spec.json'),engine=json(prefix+'engine.json');
 assert.equal(spec.sha256,'6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713');
 assert.equal(engine.pin,'d553e7b52501fbc47eae981c8d0fa7a5c26d0171');
 for(const f of engine.files){assert.equal(hash(f.text),f.sha256);assert.equal(Buffer.byteLength(f.text),f.bytes);}
 research.push({directory:dir,specSha256:hash(read(prefix+'spec.json')),engineSha256:hash(read(prefix+'engine.json')),clauses:spec.excerpts.map(e=>e.id),engineFiles:engine.files.map(f=>({path:f.path,sha256:f.sha256}))});
}
const traces=json('typescript/docs/validation/ts-033e4-p/restricted-traces.json');assert.equal(traces.rows.length,13);
for(const row of traces.rows){assert.equal(row.ticks,row.columns.length);assert.ok(row.columns.every(c=>c>=1&&c<=row.source.length));if(row.events)assert.equal(row.events.length,row.ticks);}
const result={base:git('rev-parse',base),kind:'offline source/preservation audit; no guest/native execution',protectedFiles:protectedPaths.length,sources,seams,inheritedEvidenceOnly:inherited,variants,research,matrixCopies:copies,restrictedTraces:13};
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`PASS ${protectedPaths.length} protected files, ${sources.length} source/test hashes, ${seams.length} seams; inherited212/212/48; 60blocked; 13proposed traces`);
