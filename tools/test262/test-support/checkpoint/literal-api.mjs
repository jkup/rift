import {corpusRoot, scratchRoot} from '../environment.mjs';
// Complete retained literals are exercised through actual checkpoint/reopen APIs.
// Synthetic input cases use the accepted isolated E2b authenticated inspector;
// this is explicitly private fixture coverage, not public snapshot authority.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync,mkdtempSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const home=process.cwd(),own=scratchRoot;
const expectedRoot=resolve(process.argv[2]);assert(expectedRoot.startsWith(join(own,'migration-')));
const run=mkdtempSync(join(own,'literal-api-')),root=join(run,'isolated');mkdirSync(root);
const identities=[],hash=b=>createHash('sha256').update(b).digest('hex');
function copy(path){const target=join(root,path);mkdirSync(dirname(target),{recursive:true});cpSync(path,target,{recursive:true});if(path!=='node_modules/yaml')identities.push({path,sha256:hash(readFileSync(path))});}
for(const path of ['tools/test262/script-plan.mjs','tools/test262/script-ledger.mjs','tools/test262/input.mjs','tools/test262/script-capabilities.mjs','tools/test262/script-capabilities.json','fixtures/assistance/test262-starter-corpus/manifest.json','package.json','package-lock.json','node_modules/yaml','tools/test262/test-support/ledger-support.mjs','tools/test262/test-support/environment.mjs','docs/validation/ts-035e2b-p/design-selections.json','docs/validation/ts-035e2b-p/supplemental-literals.json','docs/validation/ts-035e2b-p/report-literals.json'])copy(path);
writeFileSync(join(run,'source-copy-identities.json'),JSON.stringify(identities,null,2)+'\n');
process.chdir(root);
const helper=await import(pathToFileURL(join(root,'tools/test262/test-support/ledger-support.mjs')));
const rows=[...helper.read('design-selections.json').rows,...helper.read('supplemental-literals.json').rows];
const manifest=JSON.parse(readFileSync(join(expectedRoot,'literal-manifest.json'))),results=[];
const error=code=>e=>{assert.equal(Object.getPrototypeOf(e),Error.prototype);assert.equal(e.message,'script-ledger-store/'+code);assert.deepEqual(Object.keys(e),[]);return true;};
let tampered=0;
for(const [index,row] of manifest.entries()){
 const bytes=readFileSync(join(expectedRoot,row.path));assert.equal(hash(bytes),row.sha256);
 const expected=JSON.parse(bytes),owner=await helper.planner(),{api}=await helper.ledgerModule(owner);
 const selection=rows.find(r=>r.id===row.sourceSelection).selection;
 assert.deepEqual(expected.ledger.selection,selection);
 const ledger=api.newScriptLedger(owner.mint(selection));
 for(const a of expected.ledger.attempts)api.appendScriptPolicy(ledger,a.slotId,a.retryReason);
 const directory=join(run,'store-'+index),store=await api.createScriptLedgerStore(directory,ledger),checkpoint=await api.checkpointScriptLedger(store);
 const file=join(directory,'checkpoint-0.json');assert.deepEqual(readFileSync(file),bytes);
 assert.deepEqual(api.inspectScriptLedger(ledger),expected.ledger);assert.deepEqual(api.reportScriptLedger(ledger),expected.report);
 if(expected.ledger.attempts.length>60 && tampered===0){
  const edits=[['first-terminal',x=>x.ledger.attempts[0].terminal.reasonCode='changed'],['retry-original-text',x=>x.ledger.attempts.at(-1).retryReason='changed'],['order',x=>x.ledger.attempts.reverse()],['gap',x=>x.ledger.attempts[0].sequence=2],['duplicate',x=>x.ledger.attempts.push(structuredClone(x.ledger.attempts[0]))],['checkpoint-version',x=>x.checkpointVersion=2],['ledger-version',x=>x.ledger.ledgerVersion=1],['selection-version',x=>x.ledger.selection.selectionVersion=1],['extra',x=>x.extra=true],['report',x=>x.report.exitCode=0],['previous',x=>x.previousSha256='f'.repeat(64)],['generation',x=>x.generation=Number.MAX_SAFE_INTEGER+1]];
  for(const [id,edit] of edits){
   const value=structuredClone(expected);edit(value);const first=Buffer.from(JSON.stringify(value,null,2)+'\n');
   const successor=Buffer.from(JSON.stringify({...value,generation:1,previousSha256:hash(first)},null,2)+'\n');
   writeFileSync(join(run,id+'-0.json'),first);writeFileSync(join(run,id+'-1.json'),successor);
   for(const mutation of [first,successor]){writeFileSync(file,mutation);await assert.rejects(api.reopenScriptLedger(checkpoint),error('bytes'));await assert.rejects(api.checkpointScriptLedger(store),error('bytes'));assert.deepEqual(api.inspectScriptLedger(ledger),expected.ledger);assert.deepEqual(api.reportScriptLedger(ledger),expected.report);}
   writeFileSync(file,bytes);assert.equal(await api.checkpointScriptLedger(store),checkpoint);tampered++;
  }
  writeFileSync(file,Buffer.concat([bytes,Buffer.from(' ')]));await assert.rejects(api.reopenScriptLedger(checkpoint),error('bytes'));writeFileSync(file,bytes);
 }
 const next=await api.reopenScriptLedger(checkpoint);
 assert.deepEqual(api.inspectScriptLedger(next),expected.ledger);assert.deepEqual(api.reportScriptLedger(next),expected.report);
 const epoch=await api.checkpointScriptLedger(store);assert.notEqual(epoch,checkpoint);assert.equal(await api.checkpointScriptLedger(store),epoch);
 assert.deepEqual(readFileSync(file),bytes);
 results.push({id:row.id,actualApi:true,isolatedFixture:true,fullBytes:true,fullReport:true,reopened:true});
 writeFileSync(join(run,'results.json'),JSON.stringify({literals:results,rewrittenChains:tampered},null,2)+'\n');
}
assert.equal(results.length,28);assert.equal(tampered,12);process.chdir(home);
console.log(JSON.stringify({run,completeCheckpointLiterals:28,rewrittenChains:12,noncanonicalRejected:true}));
