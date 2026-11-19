// Read-only; neither of the two earlier verifiers is rerun against new files.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=import.meta.dirname,parent=resolve(here,'..'),original=resolve(here,'../..'),repo=resolve(here,'../../../../../..'),doc='typescript/docs/script-build-provenance.md';
const json=p=>JSON.parse(readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
function check(r){const b=readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
function prefix(r,saved){const b=readFileSync(saved);assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);assert(readFileSync(join(repo,doc)).subarray(0,b.length).equals(b));}
const links=json(join(here,'seal-links.json'));assert.equal(links.base,'629b0e0195e17a1a14a3b90dfa4790ea5f98ef4b');check(links.parentGuard);
const oldSeals=json(join(parent,'prior-seals.json'));oldSeals.rows.forEach(check);
const baseline=json(join(original,'preservation.json'));baseline.forEach(check);
const first=json(join(original,'artifact-manifest.json'));for(const r of first)r.path===doc?prefix(r,join(parent,'original-design.md')):check(r);
const second=json(join(parent,'guard-manifest.json'));for(const r of second)r.path===doc?prefix(r,join(here,'prior-design.md')):check(r);
function paths(base,skip=null){const out=[];function walk(p){for(const name of readdirSync(p).sort()){const q=join(p,name);if(q===skip)continue;const s=lstatSync(q);assert(!s.isSymbolicLink(),q);if(s.isDirectory())walk(q);else{assert(s.isFile()&&s.nlink===1,q);out.push(relative(repo,q).replaceAll('\\','/'));}}}walk(base);return out.sort();}
assert.deepEqual(paths(original,parent),first.filter(r=>r.path!==doc).map(r=>r.path).concat('typescript/docs/validation/ts-035e3f-p/artifact-manifest.json').sort());
assert.deepEqual(paths(parent,here),second.filter(r=>r.path!==doc).map(r=>r.path).concat('typescript/docs/validation/ts-035e3f-p/probe-contract/guard-manifest.json').sort());
const current=json(join(here,'correction-manifest.json'));current.forEach(check);assert.deepEqual(paths(here).filter(p=>!p.endsWith('/correction-manifest.json')).concat(doc).sort(),current.map(r=>r.path).sort());
for(const name of ['contract.json','expected-plan.json','supervise.ps1'])assert(readFileSync(join(here,name)).equals(readFileSync(join(parent,name))),name);
const offline=json(join(here,'offline-9qGb9J/results.json'));assert.equal(offline.wholePlanLiterals,1);assert.equal(offline.fullInstrumentedSources,2);assert.equal(offline.lifecyclePlanCases,25);for(const k of ['executedLifecycleCases','csharpCompilations','scriptcCompilations','supervisorInvocations','benignChildInvocations'])assert.equal(offline[k],0);
const syntax=json(join(here,'syntax-results.json'));assert(syntax.node.every(x=>x.exitCode===0));assert(syntax.powershell.every(x=>x.errors.length===0));assert.equal(syntax.csharp,'uncompiled and unexecuted');
const previous=execFileSync('git',['show',links.base+':typescript/TASKS.md'],{cwd:repo,encoding:'utf8'}).replaceAll('\r\n','\n'),task=readFileSync(join(repo,'typescript/TASKS.md'),'utf8').replaceAll('\r\n','\n'),heading='### TS-035E3f-P - Controlled build-input provenance design';assert.equal(task.split(heading)[0],previous.split(heading)[0]);
const suffix=s=>{const n=s.indexOf('\n### ',s.indexOf(heading)+heading.length);return n<0?'':s.slice(n);};assert.equal(suffix(task),suffix(previous));
const status=execFileSync('git',['status','--porcelain=v1','-z','--untracked-files=all'],{cwd:repo,encoding:'utf8'}).split('\0').filter(Boolean);for(const r of status){const p=r.slice(3);assert(p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p===doc||p.startsWith('typescript/docs/validation/ts-035e3f-p/probe-contract/atomic-job-correction/'),'scope '+r);}
console.log(JSON.stringify({baseline:baseline.length,originalArtifacts:first.length,priorContractArtifacts:second.length,correctionArtifacts:current.length,fullPlan:1,reproducedInstrumentedSources:2,plannedLifecycleCases:25,executedLifecycleCases:0,compilersInvoked:0,passed:true}));
