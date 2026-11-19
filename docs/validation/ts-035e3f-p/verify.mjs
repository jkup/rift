import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=import.meta.dirname,root=resolve(here,'../../..'),repo=resolve(root,'..');
const hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(readFileSync(p));
const preservation=json(join(here,'preservation.json'));
for(const r of preservation){const b=readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
const proposal=json(join(here,'proposal-manifest.json'));assert.equal(proposal.disposition,'blocked-design-no-production-proposal');
for(const k of ['additions','replacements','oldTestMigrations','publicApis','successSchemas'])assert.deepEqual(proposal[k],[]);
assert.equal(proposal.implementationAuthorized,false);
const baseline=execFileSync('git',['show',proposal.base+':typescript/TASKS.md'],{cwd:repo,encoding:'utf8'}).replaceAll('\r\n','\n');
const current=readFileSync(join(root,'TASKS.md'),'utf8').replaceAll('\r\n','\n');
const heading='### TS-035E3f-P - Controlled build-input provenance design';
assert.equal(current.split(heading)[0],baseline.split(heading)[0]);
const tail=s=>{const p=s.indexOf('\n### ',s.indexOf(heading)+heading.length);return p===-1?'':s.slice(p);};assert.equal(tail(current),tail(baseline));
const literals=json(join(here,'uncertainty-literals.json')),actual=json(join(here,'uncertainty-hSU6Ue/results.json'));
assert.deepEqual(actual.results,literals);assert.equal(actual.mutations.length,66);assert(actual.mutations.every(r=>r.result==='whole-literal-difference'));
const failed=json(join(here,'uncertainty-NvD7NY/failure.json'));assert.equal(failed.error.code,'EPERM');assert.equal(failed.results.length,4);
const commands=json(join(here,'discovery-commands.json'));assert.equal(commands.length,8);
assert.equal(commands[5].error.code,'ENOENT');assert.equal(commands[7].status,1);
assert.equal(json(join(here,'zig-env-retry.json')).exitCode,0);
const pack=json(join(here,'runtime-pack-check.json'));assert.equal(pack.artifacts.length,1483);assert(pack.artifacts.every(r=>r.match));
const mappings=json(join(here,'entry-mapping.json'));assert.equal(mappings.node.length,137);assert.equal(mappings.native.length,71);
const expected=json(join(here,'artifact-manifest.json'));for(const r of expected){const b=readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(hash(b),r.sha256,r.path);}
const seen=[];function walk(p){for(const n of readdirSync(p).sort()){const q=join(p,n),s=lstatSync(q);assert(!s.isSymbolicLink(),q);if(s.isDirectory())walk(q);else{assert(s.isFile()&&s.nlink===1,q);if(n!=='artifact-manifest.json')seen.push(relative(repo,q).replaceAll('\\','/'));}}}walk(here);
seen.push('typescript/docs/script-build-provenance.md');assert.deepEqual(seen.sort(),expected.map(r=>r.path).sort());
const status=execFileSync('git',['status','--porcelain=v1','-z','--untracked-files=all'],{cwd:repo,encoding:'utf8'}).split('\0').filter(Boolean);
for(const row of status){const p=row.slice(3);assert(p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p==='typescript/docs/script-build-provenance.md'||p.startsWith('typescript/docs/validation/ts-035e3f-p/'),'out-of-scope '+row);}
console.log(JSON.stringify({preservedFiles:preservation.length,evidenceFiles:expected.length,filesystemLiterals:6,dataOracleMutations:66,retainedSetupFailures:1,productionProposal:false,compilations:0,passed:true}));
