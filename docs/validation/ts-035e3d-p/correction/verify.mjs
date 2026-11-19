import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=import.meta.dirname,root=resolve(here,'../../../..'),repo=resolve(root,'..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(join(here,p)));
const manifest=read('proposal-manifest.json'),implemented=process.argv.includes('--implemented');
const targets=new Map([...manifest.replacements,...manifest.additions].map(x=>['typescript/'+x.target,x]));
const baseline=JSON.parse(readFileSync(join(here,'../baseline.json')));
for(const f of baseline.files){const target=targets.get(f.path),bytes=readFileSync(join(repo,f.path));assert.equal(sha(bytes),implemented&&target?target.sha256:f.sha256,f.path);if(!(implemented&&target))assert.equal(bytes.length,f.bytes,f.path);}
for(const f of manifest.additions){const p=join(root,f.target);if(implemented)assert.equal(sha(readFileSync(p)),f.sha256);else assert.equal(existsSync(p),false,f.target);}
for(const f of [...manifest.replacements,...manifest.additions])assert.equal(sha(readFileSync(join(here,f.proposal))),f.sha256,f.proposal);
const checkpoint=read('checkpoint-preservation.json');
for(const f of checkpoint.files){const b=readFileSync(join(here,'..',f.path));assert.equal(sha(b),f.sha256,f.path);assert.equal(b.length,f.bytes,f.path);}
assert.equal(sha(readFileSync(join(here,checkpoint.document.path))),checkpoint.document.sha256);
const oldManifest=JSON.parse(readFileSync(join(here,'../proposal-manifest.json')));
for(const f of oldManifest.evidence){const p=f.path==='../../script-conformance-preflight.md'?join(here,checkpoint.document.path):join(here,'..',f.path);assert.equal(sha(readFileSync(p)),f.sha256,f.path);}
const descriptor=read('dispatch-descriptor.json');assert.equal(sha(JSON.stringify(descriptor.data)),descriptor.sha256);assert.equal(descriptor.sha256,manifest.sourceDescriptorSha256);
for(const f of descriptor.data.sourceFiles){const mapping=targets.get('typescript/'+f.path),p=mapping?join(here,mapping.proposal):join(root,f.path);const b=readFileSync(p);assert.equal(sha(b),f.sha256,f.path);assert.equal(b.length,f.bytes,f.path);}
// Restore only the exact proposed additions in memory, proving original paths
// have no incidental edits. Never writes a production or historical file.
const old=readFileSync(join(root,'src/script-observation.ts'),'utf8');
let proposal=readFileSync(join(here,'proposals/script-observation.ts'),'utf8');
proposal=proposal.slice(0,proposal.indexOf('// BEGIN closed conformance preflight prerequisite.')).replace(/\r?\n$/,'');
proposal=proposal.replace(', private preflightControl: boolean = false)',')');
proposal=proposal.replace('            // The closed preflight route stops at the actual control harness, even\r\n            // when its oracle reports false. Never prepare the trailing test.\r\n            if (this.preflightControl && unit.id === "u" + (this.request.units.length - 2)) return answer;\r\n','');
if(!implemented)assert.equal(proposal,old,'only exact Attempt edits and appended boundary');
if(!implemented){
 let driver=readFileSync(join(here,'proposals/script-observation-driver-test.ts'),'utf8');
 const begin=driver.indexOf('    if (process.argv[2] === "conformance-preflight-v1")'),end=driver.indexOf('    const control = process.argv[2];');
 assert(begin>=0&&end>begin);driver=driver.slice(0,begin)+driver.slice(end);
 driver=driver.replace('observeScriptControl, validateConformancePreflightArguments, produceConformancePreflightControl, type ObservationUnit','observeScriptControl, type ObservationUnit');
 // Remove the CRLF inserted with the branch header, restoring the original LF.
 // This is an exact one-site inverse, not whole-file newline normalization.
 driver=driver.replace('function main(): void {\r\n','function main(): void {\n');
 assert.equal(driver,readFileSync(join(root,'test/script-observation.ts'),'utf8'),'unchanged original observation driver');
 const oldTest=readFileSync(join(here,'proposals/script-producer.test.mjs'),'utf8').replace(",'produceConformancePreflightControl','validateConformancePreflightArguments'",'');
 assert.equal(oldTest,readFileSync(join(root,'tools/test262/script-producer.test.mjs'),'utf8'),'only exact export assertion extension');
}
const heading='### TS-035E3d-P - Conformance host services and preflight contract design';
const previousTasks=execFileSync('git',['show',manifest.base+':typescript/TASKS.md'],{cwd:repo,encoding:'utf8',maxBuffer:4*1024*1024});
const taskPrefix=x=>sha(x.split(heading)[0].replaceAll('\r\n','\n'));
assert.equal(taskPrefix(readFileSync(join(root,'TASKS.md'),'utf8')),taskPrefix(previousTasks),'other task sections');
if(existsSync(join(here,'artifact-manifest.json')))for(const f of read('artifact-manifest.json').files)assert.equal(sha(readFileSync(join(here,f.path))),f.sha256,f.path);
console.log(JSON.stringify({implemented,protectedFiles:baseline.files.length,checkpointFiles:checkpoint.files.length,sourceMembers:descriptor.data.sourceFiles.length,replacements:manifest.replacements.length,additions:manifest.additions.length,passed:true}));
