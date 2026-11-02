// Source/preservation audit only; never imports or runs the guest engine.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {blockers} from '../../../tools/test262/input.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const base='c15f27b2e5d6d30efd303235e64553a56bdd4d70';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const read=p=>readFileSync(root+p);
const json=p=>JSON.parse(read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const allowed=p=>p==='typescript/TASKS.md'||p==='typescript/docs/script-realm-bootstrap.md'||p.startsWith('typescript/docs/validation/ts-033c-p/');
const excluded='typescript/COORDINATION.md';
const changed=git('diff','--name-only',base).split('\n').filter(Boolean);
const untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert.ok(changed.every(p=>allowed(p)||p===excluded),'out-of-scope tracked edit');
assert.ok(untracked.every(allowed),'out-of-scope untracked file');
const paths=git('ls-tree','-r','--name-only',base).split('\n');
const protectedPaths=paths.filter(p=>!allowed(p)&&p!==excluded);
assert.ok(!changed.some(p=>protectedPaths.includes(p)));
const sourcePaths=paths.filter(p=>p.startsWith('typescript/src/')||p.startsWith('typescript/test/'));
const sources=sourcePaths.map(path=>({path,sha256:sha(read(path)),gitBlob:git('rev-parse',base+':'+path)}));
const pattern=/new Realm|new Evaluator|\.global\b|createGuestFunction|createBuiltin|\.invoke\(|context\.call|call\(callee|block\(body|export function (run|observe)/;
const inventory=[];
for(const path of sourcePaths){
  read(path).toString('utf8').split(/\r?\n/).forEach((text,i)=>{
    if(pattern.test(text))inventory.push({path,line:i+1,text});
  });
}
const prefix='typescript/docs/validation/ts-033b/';
const node=json(prefix+'guest-node-results.json'), native=json(prefix+'guest-native-results.json'), gates=json(prefix+'native-build-results.json');
assert.equal(node.length,212); assert.equal(native.length,212); assert.equal(gates.length,39);
const historical=['guest-node-results.json','guest-native-results.json','native-build-results.json'].map(p=>({path:prefix+p,sha256:sha(read(prefix+p))}));
const manifest=json('typescript/fixtures/assistance/test262-starter-corpus/manifest.json');
const variants=manifest.entries.flatMap(e=>e.variants.map(variant=>({id:e.id,variant,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},variant,e.id)})));
assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length>0));
const supplemental=json('typescript/docs/validation/ts-033c-p/supplemental-spec.json');
assert.equal(supplemental.sha256,'6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713');
assert.equal(supplemental.excerpts.length,6);
const upstream=json('typescript/docs/validation/ts-033p/upstream.json');
assert.ok(upstream.some(r=>r.url.endsWith('/LICENSE')));
const report={base,kind:'source/identity/preservation audit only; no guest/native execution',protectedTrackedFiles:protectedPaths.length,sources,inventory,inheritedOnly:{guestRecordsPerLane:212,nativeGates:39,historical},variants,upstream:upstream.map(({url,sha256,bytes})=>({url,sha256,bytes})),supplemental:{sha256:supplemental.sha256,bytes:supplemental.bytes,clauses:supplemental.excerpts.map(e=>e.id)},coordinator:{path:excluded,excludedFromPreservation:true,sha256:sha(read(excluded))}};
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${protectedPaths.length} protected tracked files; ${sources.length} source/test identities; ${inventory.length} migration occurrences; inherited 212 records per lane / 39 gates; 60/60 variants blocked. Source audit only.`);
