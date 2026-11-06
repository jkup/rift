// Read-only continuation verifier: original seals are never regenerated.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=import.meta.dirname,prior=resolve(here,'..'),repo=resolve(here,'../../../../..'),doc='typescript/docs/script-build-provenance.md';
const json=p=>JSON.parse(readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const bytesAt=p=>readFileSync(join(repo,p));
function check(r){const b=bytesAt(r.path);assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
const oldSeals=json(join(here,'prior-seals.json'));assert.equal(oldSeals.base,'0e7337989c7683202b70259599f26c562ec0662b');oldSeals.rows.forEach(check);
const original=json(join(prior,'artifact-manifest.json')),baseline=json(join(prior,'preservation.json'));
baseline.forEach(check);
for(const r of original){if(r.path!==doc)check(r);else {
  const saved=readFileSync(join(here,'original-design.md'));assert.equal(saved.length,r.bytes);assert.equal(hash(saved),r.sha256);
  assert(bytesAt(doc).subarray(0,saved.length).equals(saved),'original design prefix changed');
}}
function paths(base,skip=null){const out=[];function visit(p){for(const n of readdirSync(p).sort()){const q=join(p,n);if(q===skip)continue;const s=lstatSync(q);assert(!s.isSymbolicLink(),q);if(s.isDirectory())visit(q);else{assert(s.isFile()&&s.nlink===1,q);out.push(relative(repo,q).replaceAll('\\','/'));}}}visit(base);return out;}
const oldActual=paths(prior,here).sort(),oldExpected=original.filter(r=>r.path!==doc).map(r=>r.path).concat('typescript/docs/validation/ts-035e3f-p/artifact-manifest.json').sort();assert.deepEqual(oldActual,oldExpected);
const manifest=json(join(here,'guard-manifest.json'));manifest.forEach(check);
const actual=paths(here).filter(p=>!p.endsWith('/guard-manifest.json')).concat(doc).sort();assert.deepEqual(actual,manifest.map(r=>r.path).sort());
const c=json(join(here,'contract.json')),expected=json(join(here,'expected-plan.json'));assert.deepEqual(c.childEnvironment,expected.environment);assert.deepEqual(c.argv,expected.argv);assert.equal(c.root,expected.cwd);
assert.equal(c.status,'proposal-not-executed-awaiting-actual-and-second-review');assert.equal(c.admission,'none');
assert.deepEqual(c.exclusions,['node_modules/@scriptc/runtime-win32-x64-msvc/runtime-pack.verified.json']);
const oldProposal=json(join(prior,'probe-proposal.json'));assert.deepEqual(c.argv,oldProposal.argv);assert.equal(c.timeoutMs,oldProposal.timeoutMs);assert.equal(c.streamCapBytes,oldProposal.stdoutBytes);assert.equal(c.streamCapBytes,oldProposal.stderrBytes);
const syntax=json(join(here,'syntax-results.json'));assert(syntax.node.every(r=>r.exitCode===0));assert.deepEqual(syntax.powershell.errors,[]);assert.equal(syntax.csharp,'not compiled or executed');
const offline=json(join(here,'offline-J6W355/results.json'));assert.deepEqual(offline.actualPlan,expected);assert.equal(offline.completedPlanMutants,8);assert(offline.mutants.every(r=>r.completed&&r.rejectedBy==='independent-whole-plan-literal'));assert.equal(offline.compilerInvocations,0);assert.equal(offline.supervisorInvocations,0);
const baseTask=execFileSync('git',['show',oldSeals.base+':typescript/TASKS.md'],{cwd:repo,encoding:'utf8'}).replaceAll('\r\n','\n'),task=bytesAt('typescript/TASKS.md').toString('utf8').replaceAll('\r\n','\n'),heading='### TS-035E3f-P - Controlled build-input provenance design';
assert.equal(task.split(heading)[0],baseTask.split(heading)[0]);
const suffix=s=>{const n=s.indexOf('\n### ',s.indexOf(heading)+heading.length);return n<0?'':s.slice(n);};assert.equal(suffix(task),suffix(baseTask));
const status=execFileSync('git',['status','--porcelain=v1','-z','--untracked-files=all'],{cwd:repo,encoding:'utf8'}).split('\0').filter(Boolean);
for(const row of status){const p=row.slice(3);assert(p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p===doc||p.startsWith('typescript/docs/validation/ts-035e3f-p/probe-contract/'),'scope '+row);}
console.log(JSON.stringify({baseline:baseline.length,originalArtifacts:original.length,continuationArtifacts:manifest.length,fullPlanLiterals:1,completedPlanMutants:8,compilerInvocations:0,supervisorInvocations:0,passed:true}));
