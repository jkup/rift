// Source preservation plus bounded existing-build parser probes. Never executes guest bodies.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { cases, runtimeSources } from './cases.mjs';
import { variants, blockers } from '../../../tools/test262/input.mjs';
import { parseBoundedScriptDeclarationPlan } from '../../../build/node/src/parser.js';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const base='b6aeb21356e47a723b982959e4161f3e187e3ac7';
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(root+p);
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/docs/script-strict-rule-audit.md'||p.startsWith('typescript/docs/validation/ts-035d-p/');
const protectedPaths=git('ls-tree','-r','--name-only',base).split('\n').filter(p=>!owned(p)&&p!=='typescript/COORDINATION.md');
assert.deepEqual(git('diff',base,'--name-only').split('\n').filter(p=>p&&!owned(p)&&p!=='typescript/COORDINATION.md'),[]);
const manifest=JSON.parse(read('typescript/fixtures/assistance/test262-starter-corpus/manifest.json'));
const planned=manifest.entries.flatMap(e=>{const meta={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null}; return variants(meta).map(v=>({id:e.id,variant:v,blockers:blockers(meta,v,e.id)}));});
assert.equal(planned.length,60); assert(planned.every(x=>x.blockers.length));
const pinned=JSON.parse(readFileSync(new URL('pinned.json',import.meta.url)));
const inputs=[...cases,...runtimeSources.map((s,i)=>['R'+i,s,'eligible'])];
for(const id of ['S21','S22']) {
 const entry=manifest.entries.find(e=>e.id===id), pin=pinned[id.toLowerCase()], bytes=Buffer.from(pin.content);
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'),entry.blob);
 inputs.push([id,'"use strict";\n'+pin.content,id==='S21'?'parameter':'eligible']);
}
const rows=inputs.map(([id,text,future])=>{
 const result=parseBoundedScriptDeclarationPlan({id,text});
 return {id,text,sourceUnits:text.length,sha256:sha(text),future,
  current:result.kind==='complete'?{kind:result.kind,strictness:result.strictness,scopes:result.scopes.map(s=>({kind:s.kind,strict:s.strict,formals:s.formals,lexicalNames:s.lexicalNames,varNames:s.varNames}))}:result};
});
const by=id=>rows.find(r=>r.id===id).current;
assert.equal(by('B01').kind,'conflict'); assert.equal(by('B15').kind,'conflict');
assert.equal(by('B14').rejection.capabilityCode,'parse.declaration-statement');
assert.equal(by('P01').rejection.capabilityCode,'parse.duplicate-parameter');
assert.equal(by('P04').rejection.capabilityCode,'parse.duplicate-parameter');
assert.equal(by('L01').kind,'conflict'); assert.equal(by('L02').rejection.guardCode,'source-units');
assert.equal(by('L03').kind,'conflict'); assert.equal(by('L04').rejection.guardCode,'parse-depth');
const files=['src/parser.ts','src/lexer.ts','src/script-declarations.ts','src/script-prologue.ts','src/script-execution-internal.ts','src/script-observation.ts','src/script-observation-types.ts','src/script-observation-json.ts','src/outcomes.ts','tools/test262/script-driver-result.mjs','tools/test262/script-result.mjs','tools/build-native.mjs','tools/run-guests.mjs'].map(p=>'typescript/'+p);
const artifacts=readdirSync(root+'typescript/build/node/src').filter(p=>p.endsWith('.js')).map(p=>'typescript/build/node/src/'+p);
const result={base,head:git('rev-parse','HEAD'),branch:git('branch','--show-current'),node:process.version,
 claims:'Offline source audit; bounded existing Node build parse probes only, not fresh build/native/runtime/full suite or admission proof.',
 protectedTracked:protectedPaths.length,selectedFiles:manifest.entries.length,variants:planned.length,blocked:planned.filter(x=>x.blockers.length).length,
 files:files.map(path=>({path,sha256:sha(read(path))})),artifacts:artifacts.map(path=>({path,sha256:sha(read(path))})),planned,rows};
writeFileSync(new URL('audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rows:rows.length,protected:protectedPaths.length,files:manifest.entries.length,variants:planned.length,blocked:planned.length,lateCatchWitness:by('B15').kind}));
