import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {hash} from './files.mjs';
import {actualSnapshot,validateSnapshot,expectedSources} from './proposal-policy.mjs';
import {validateEnvironment} from './home-policy.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=n=>JSON.parse(fs.readFileSync(join(here,n)));
validateSnapshot(actualSnapshot());
const records=json('frozen-identities.json');assert.deepEqual(records.map(r=>r.path).sort(),Object.keys(expectedSources()).sort());
for(const r of records){const b=fs.readFileSync(join(here,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
for(const r of json('source-transformations.json')){const b=fs.readFileSync(join(repo,r.source));assert.equal(b.length,r.sourceBytes);assert.equal(hash(b),r.sourceSha256);let s=b.toString();for(const x of r.replacements){assert.equal(s.split(x.old).length-1,x.count);s=x.all?s.replaceAll(x.old,x.next):s.replace(x.old,x.next);}const actual=fs.readFileSync(join(here,r.target));assert.equal(actual.toString(),s);assert.equal(actual.length,r.bytes);assert.equal(hash(actual),r.sha256);}
for(const r of json('copied-dependencies.json')){const b=fs.readFileSync(join(repo,r.source));assert.deepEqual(b,fs.readFileSync(join(here,r.target)));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
const config=json('execution-config.json'),plan=json('proposal.json'),invocation=json('invocation.proposed.json'),literals=json('environment-literals.json');
assert.equal(config.root,literals.root);for(const env of [config.childEnvironment,plan.childEnvironment,plan.supervisor.environment,invocation.command.environment])validateEnvironment(config.root,env,literals.expectedEnvironment);
for(const k of ['root','executable','argv'])assert.deepEqual(config[k],plan[k]);assert.equal(config.argv.length,17);assert.equal(config.timeoutMs,60000);assert.equal(config.cleanupMs,10000);assert.equal(config.streamCapBytes,8388608);
assert.equal(invocation.authorized,false);assert.equal(invocation.helperCompilerMaximum,1);assert.equal(invocation.supervisorAddTypeMaximum,1);assert.equal(invocation.generatedOutputLaunches,0);assert.equal(invocation.retries,0);
assert(fs.readFileSync(join(here,'runner.mjs.proposed.txt'),'utf8').includes('const RUN_ENABLED=true;'));assert.equal(plan.source.sha256,'25e285690c80c9b5d9e7a18136338394cbc9b55d9d6f8c6b82f3342cffd23877');assert.equal(plan.reference.sha256,'11ac114c43ecf6996bef58ba3c99fba3693a4560a84eeadde54d193060dc626c');
console.log(JSON.stringify({frozenSources:records.length,fullEnvironmentKeys:16,home:config.childEnvironment.HOMEDRIVE+config.childEnvironment.HOMEPATH,privateHomeEqual:true,executionAuthorized:false,passed:true}));
