// Checks inert design data only. No process execution, symbol analysis or discovery.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=p=>JSON.parse(fs.readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const r of json(join(here,'evidence-links.json'))){const b=fs.readFileSync(join(repo,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);}
const p=json(join(here,'proposal.json')),old=json(join(here,'../ts-035e3f-p/probe-contract/contract.json'));
assert.equal(p.kind,'review-request-not-execution');assert.equal(p.status,'blocked-recorder-source-binary-and-supervisor-review');
assert.deepEqual(p.argv,['build','probe.ts','--tier','static-only','--emit','exe','-o','probe.exe']);
assert.equal(p.cwd,p.root);assert.equal(p.executable,p.root+'\\node_modules\\scriptc\\bin\\scriptc.exe');
assert.deepEqual(p.inputFiles,json(join(here,'../ts-035e3f-p/probe-proposal.json')).files);
const env=Object.fromEntries(Object.entries(old.childEnvironment).map(([k,v])=>[k,v.replaceAll(old.root,p.root)]));
env.SCRIPTC_LINKER=p.root+'\\recorder\\link-command-recorder.exe';env.RIFT_LINK_CAPTURE=p.root+'\\capture\\first-command.bin';assert.deepEqual(p.childEnvironment,env);assert.equal(Object.keys(env).length,23);
const compiler=json(join(here,'../ts-035e3f-p/installed-packages.json')).find(r=>r.path==='node_modules/scriptc/bin/scriptc.exe');assert.equal(p.compilerIdentity.sha256,compiler.sha256);assert.equal(p.compilerIdentity.bytes,compiler.bytes);
for(const k of ['node','supervisor','cmd','zig'])assert.deepEqual(p.toolIdentities[k],{path:old[k],sha256:old[k+'Sha256']});
assert.equal(p.recorder.sourceSha256,null);assert.equal(p.recorder.binarySha256,null);assert.equal(p.recorder.forwardToLinker,false);assert.equal(p.recorder.launchChildren,false);assert.equal(p.launchProducedOutput,false);assert.equal(p.productionAuthority,false);assert.equal(p.limits.maxCompilerInvocations,1);assert.equal(p.limits.maxRecorderRecords,1);assert.equal(p.recorder.bounds.recordBytes,1048576);
assert(p.recorder.terminalBehavior.includes('do not return'));assert(p.stop.includes('@response-file token'));assert(p.executionPrerequisites.length>=5);
console.log(JSON.stringify({designOnly:true,proposedCompilerArgv:1,completeEnvironmentKeys:23,unavailableRecorderIdentities:2,newSymbolAnalyses:0,newToolLibraryScans:0,newToolExecutions:0,passed:true}));
