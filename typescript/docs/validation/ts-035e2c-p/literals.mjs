import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const run=resolve(process.argv[2]);
assert(run.startsWith(resolve('docs/validation/ts-035e2c-p')+'\\run-'));
const read=p=>JSON.parse(readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const file=join(run,'isolated/tools/test262/private-validators.mjs');
writeFileSync(file,readFileSync(join(run,'isolated/tools/test262/script-ledger.mjs'),'utf8')+'\nexport {validateSelection,validateHistory,reportValue};\n');
const api=await import(pathToFileURL(file));
const manifest=read(join(run,'literal-manifest.json')),observations=[];
for(const row of manifest){
 const bytes=readFileSync(join(run,row.path));assert.equal(hash(bytes),row.sha256);assert.equal(bytes.length,row.byteLength);
 const snapshot=JSON.parse(bytes),slots=api.validateSelection(snapshot.ledger.selection);
 api.validateHistory(snapshot.ledger,slots);assert.deepEqual(api.reportValue(snapshot.ledger),snapshot.report);
 assert.equal(bytes.toString(),JSON.stringify(snapshot,null,2)+'\n');
 observations.push({id:row.id,fullSchema:true,fullHistory:true,fullReport:true,exactBytes:true,privateOnly:true});
}
const chosen=manifest.find(row=>{const v=read(join(run,row.path));return v.ledger.attempts.length>60;});
assert(chosen);
const original=read(join(run,chosen.path)),anchor=readFileSync(join(run,chosen.path));
const edits=[['first-terminal',x=>x.ledger.attempts[0].terminal.reasonCode='changed'],
 ['retry-original-text',x=>x.ledger.attempts.at(-1).retryReason='changed'],
 ['order',x=>x.ledger.attempts.reverse()],['gap',x=>x.ledger.attempts[0].sequence=2],
 ['duplicate',x=>x.ledger.attempts.push(structuredClone(x.ledger.attempts[0]))],
 ['checkpoint-version',x=>x.checkpointVersion=2],['ledger-version',x=>x.ledger.ledgerVersion=1],
 ['selection-version',x=>x.ledger.selection.selectionVersion=1],['extra',x=>x.extra=true],
 ['report',x=>x.report.exitCode=0],['previous',x=>x.previousSha256='f'.repeat(64)],
 ['generation',x=>x.generation=Number.MAX_SAFE_INTEGER+1]];
mkdirSync(join(run,'tampered'));
for(const [id,edit] of edits){
 const value=structuredClone(original);edit(value);
 const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n'),firstHash=hash(bytes);
 const successor={...value,generation:1,previousSha256:firstHash};
 const successorBytes=Buffer.from(JSON.stringify(successor,null,2)+'\n');
 assert(!bytes.equals(anchor));assert.equal(successor.previousSha256,hash(bytes));
 writeFileSync(join(run,'tampered',id+'-0.json'),bytes);writeFileSync(join(run,'tampered',id+'-1.json'),successorBytes);
 observations.push({id:'rehashed-'+id,firstSha256:firstHash,nextSha256:hash(successorBytes),chainSelfConsistent:true,liveAnchorEqual:false,authority:false});
}
// Whitespace alone is a byte error despite parsing to the same object.
assert.deepEqual(JSON.parse(anchor.toString()+' '),original);
assert(!Buffer.from(anchor.toString()+' ').equals(anchor));
observations.push({id:'noncanonical-equivalent',anchorEqual:false});
writeFileSync(join(run,'literal-checks.json'),JSON.stringify(observations,null,2)+'\n');
console.log(JSON.stringify({completeLiterals:manifest.length,tamperedRehashed:edits.length,checks:observations.length}));
