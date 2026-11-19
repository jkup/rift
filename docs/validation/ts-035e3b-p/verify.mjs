import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../..'),implemented=process.argv.includes('--implemented');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(readFileSync(resolve(here,p)));
const proposals=read('proposal-manifest.json'),newFiles=read('new-file-manifest.json');
for(const p of proposals){assert.equal(hash(readFileSync(resolve(here,p.proposal))),p.after,p.proposal);assert.equal(hash(readFileSync(resolve(root,p.path))),implemented?p.after:p.before,p.path);}
for(const p of newFiles){assert.equal(hash(readFileSync(resolve(here,p.proposal))),p.sha256,p.proposal);if(implemented)assert.equal(hash(readFileSync(resolve(root,p.path))),p.sha256,p.path);else assert(!existsSync(resolve(root,p.path)),p.path);}
const baseline=read('preservation.json');
for(const p of baseline){const proposal=proposals.find(q=>q.path===p.path);assert.equal(hash(readFileSync(resolve(root,p.path))),implemented&&proposal?proposal.after:p.sha256,p.path);}
for(const p of read('artifacts.json'))assert.equal(hash(readFileSync(resolve(here,p.path))),p.sha256,p.path);
const observer=readFileSync(resolve(here,'proposals/script-observation.ts'),'utf8');
const before=readFileSync(resolve(root,'typescript/src/script-observation.ts'),'utf8');
if(!implemented){
 const corrected=observer.replace(/^import \{ validateScriptProducerRequest[^\n]+\n/,'').replace('constructor(private request: ScriptObservationRequest, private mode: "script-observation" | "conformance" = "script-observation") {','constructor(private request: ScriptObservationRequest) {').replace('mode: this.mode, operation, source,','mode: "script-observation", operation, source,');
 assert.equal(corrected.slice(0,before.length),before);assert(corrected.slice(before.length).includes('export function produceConformanceScripts'));
 const driver=readFileSync(resolve(here,'proposals/script-observation-driver.ts'),'utf8');
 assert(driver.indexOf('parseScriptProducerArguments(args)')<driver.indexOf('readFileSync(parsed.sourcePaths[n]'));
 const oldDriver=readFileSync(resolve(root,'typescript/src/script-observation-driver.ts'),'utf8');
 assert.equal(driver.slice(driver.indexOf('    if (args.length < 11')),oldDriver.slice(oldDriver.indexOf('    if (args.length < 11')));
}
console.log(JSON.stringify({implemented,oldProposals:proposals.length,newFiles:newFiles.length,preserved:baseline.length,artifacts:read('artifacts.json').length}));
