import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const run=resolve(process.argv[2]);assert(run.startsWith(resolve('docs/validation/ts-035e2c-p')+'\\run-'));
const root=join(run,'isolated'),url=n=>pathToFileURL(join(root,'tools/test262/'+n));
const api=await import(url('script-ledger.mjs')),p=await import(url('script-plan.mjs')),input=await import(url('input.mjs'));
const {manifest}=await input.frozenManifest(),hash=b=>createHash('sha256').update(b).digest('hex');
const results=[];
for(const lane of ['node','native']){
 const selection=await p.prepareScriptSelection({root:'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',revision:input.REVISION,lane,paths:manifest.entries.map(e=>e.path)});
 const ledger=api.newScriptLedger(selection),ids=api.inspectScriptLedger(ledger).selection.files.flatMap(f=>f.slots??[]).map(s=>s.id);
 api.appendScriptPolicy(ledger,ids[0]);const dir=join(run,'anchor-'+lane),store=await api.createScriptLedgerStore(dir,ledger);await api.checkpointScriptLedger(store);
 api.appendScriptPolicy(ledger,ids[0],' original retry ');const token=await api.checkpointScriptLedger(store);
 const first=await fs.readFile(join(dir,'checkpoint-0.json')),latest=await fs.readFile(join(dir,'checkpoint-1.json'));
 const before=api.inspectScriptLedger(ledger),report=api.reportScriptLedger(ledger);
 const edits=[['first',x=>x.ledger.attempts[0].terminal.reasonCode='changed'],['retry',x=>x.ledger.attempts[1].retryReason='changed'],['order',x=>x.ledger.attempts.reverse()],['gap',x=>x.ledger.attempts[0].sequence=2],['duplicate',x=>x.ledger.attempts.push(structuredClone(x.ledger.attempts[0]))],['report',x=>x.report.exitCode=0],['checkpoint-version',x=>x.checkpointVersion=2],['ledger-version',x=>x.ledger.ledgerVersion=1],['selection-version',x=>x.ledger.selection.selectionVersion=1],['generation',x=>x.generation=4],['extra',x=>x.extra=1]];
 for(const [id,edit] of edits){
  const old=JSON.parse(first),next=JSON.parse(latest);old.ledger.attempts[0].terminal.reasonCode='tampered first';const oldBytes=Buffer.from(JSON.stringify(old,null,2)+'\n');
  edit(next);next.previousSha256=hash(oldBytes);const nextBytes=Buffer.from(JSON.stringify(next,null,2)+'\n');
  await fs.writeFile(join(dir,'checkpoint-0.json'),oldBytes);await fs.writeFile(join(dir,'checkpoint-1.json'),nextBytes);
  await assert.rejects(api.reopenScriptLedger(token),{message:'script-ledger-store/bytes'});
  assert.deepEqual(api.inspectScriptLedger(ledger),before);assert.deepEqual(api.reportScriptLedger(ledger),report);
  results.push({lane,id,firstSha256:hash(oldBytes),latestSha256:hash(nextBytes),selfConsistentChain:true,error:'script-ledger-store/bytes',unchanged:true});
 }
 await fs.writeFile(join(dir,'checkpoint-0.json'),first);await fs.writeFile(join(dir,'checkpoint-1.json'),latest);
 const next=await api.reopenScriptLedger(token);assert.deepEqual(api.inspectScriptLedger(next),before);
}
await fs.writeFile(join(run,'anchor-checks.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({actualLiveAnchorRejections:results.length,lanes:2,recovery:true}));
