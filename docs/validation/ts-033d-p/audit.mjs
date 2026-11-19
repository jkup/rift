// Offline preservation/identity audit. Does not import or execute Rift.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {blockers} from '../../../tools/test262/input.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const base='250aa1b76e8cb3282f2aa2e867cf22197d783278';
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
const read=p=>readFileSync(root+p);
const json=p=>JSON.parse(read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const allowed=p=>p==='typescript/TASKS.md'||p==='typescript/docs/script-declarations.md'||p.startsWith('typescript/docs/validation/ts-033d-p/');
const excluded='typescript/COORDINATION.md';
const changed=git('diff','--name-only',base).split('\n').filter(Boolean);
const untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changed.every(p=>allowed(p)||p===excluded),'out-of-scope tracked edit');
assert.ok(untracked.every(allowed),'out-of-scope untracked path');
const paths=git('ls-tree','-r','--name-only',base).split('\n');
const protectedPaths=paths.filter(p=>!allowed(p)&&p!==excluded);
assert.ok(!changed.some(p=>protectedPaths.includes(p)));
const sourcePaths=paths.filter(p=>p.startsWith('typescript/src/')||p.startsWith('typescript/test/'));
const sources=sourcePaths.map(path=>({path,sha256:sha(read(path)),gitBlob:git('rev-parse',base+':'+path)}));
const pattern=/list\(|functionTail|auditScriptReturns|inspectScript|\.global\b|createGuestFunction|createBuiltin|\.invoke\(|new Evaluator|block\(body|GlobalEnvironment|createGlobal|canDeclareGlobal|hasLexical|hasRestricted|returnCandidates|case "function"|case "let"/;
const inventory=[];
for(const path of sourcePaths)read(path).toString('utf8').split(/\r?\n/).forEach((text,i)=>{
 if(pattern.test(text))inventory.push({path,line:i+1,text});
});
const prefix='typescript/docs/validation/ts-033c/';
const names=['guest-node-results.json','guest-native-results.json','native-build-results.json'];
const counts=names.map(n=>json(prefix+n).length);
assert.deepEqual(counts,[212,212,40]);
const manifest=json('typescript/fixtures/assistance/test262-starter-corpus/manifest.json');
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,
 blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
const spec=json('typescript/docs/validation/ts-033d-p/spec.json');
assert.equal(spec.sha256,'6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713');
assert.equal(spec.excerpts.length,9);
const engine=json('typescript/docs/validation/ts-033d-p/engine.json');
assert.equal(engine.pin,'d553e7b52501fbc47eae981c8d0fa7a5c26d0171');
assert.equal(engine.files.length,3);
for(const f of engine.files){assert.equal(sha(f.text),f.sha256);assert.equal(Buffer.byteLength(f.text),f.bytes);}
assert.ok(engine.files.some(f=>f.path==='LICENSE'));
const design=read('typescript/docs/script-declarations.md').toString('utf8');
const ids=[...Array.from({length:16},(_,i)=>'G'+String(i+1).padStart(2,'0')),
 ...Array.from({length:10},(_,i)=>'L'+String(i+1).padStart(2,'0')),'T01','T02','R01','R02','R03','R04','R05'];
for(const id of ids)assert.equal(design.split('| '+id+' |').length,2,'missing/duplicate row '+id);
const report={base,kind:'offline source/identity/preservation only; matrix not executed',
 protectedTrackedFiles:protectedPaths.length,sources,inventory,
 inheritedOnly:{counts,historical:names.map(n=>({path:prefix+n,sha256:sha(read(prefix+n))}))},
 variants,matrixIds:ids,
 spec:{url:spec.url,sha256:spec.sha256,bytes:spec.bytes,clauses:spec.excerpts.map(e=>e.id)},
 engine:engine.files.map(({path,url,sha256,bytes})=>({path,url,sha256,bytes})),
 coordinator:{path:excluded,excludedFromPreservation:true,sha256:sha(read(excluded))}};
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log('PASS: '+protectedPaths.length+' protected files; '+sources.length+' source identities; '+inventory.length+' seam occurrences; 33 matrix rows inventoried, not executed; inherited212/212/40; 60/60 blocked.');
