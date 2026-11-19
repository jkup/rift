import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const here=new URL('./',import.meta.url);
let source=readFileSync(new URL('../ts-035d5-p/wire.mjs',here),'utf8');
const addition=`
// Both modes are separate bound requests; observation envelopes have no classification.
for(const original of rows.slice()){
 const r=copy(original),b=r.binding,c=r.child,e=r.envelope;
 b.mode='script-observation';c.mode=b.mode;e.identity.mode=b.mode;
 b.requestSha256=hash(JSON.stringify({requestVersion:2,nonce:b.nonce,mode:b.mode,variant:b.variant,units:b.units,realms:b.realms,limits:b.limits,preflightId:b.preflightId,action:b.action}));
 c.requestSha256=b.requestSha256;e.inputs.requestSha256=b.requestSha256;e.inputs.capabilityLedgerSha256=null;delete e.classification;
 r.context.identity=copy(e.identity);r.context.inputs=copy(e.inputs);r.id='script-observation/'+r.id;rows.push(r);
}
`;
assert(source.includes('for(const r of rows){r.ascii='));source=source.replace('for(const r of rows){r.ascii=',addition+'\nfor(const r of rows){r.ascii=');
source=source.replace('assert.equal(rows.length,128)','assert.equal(rows.length,256)');
source=source.replace("old.classification.filter(x=>x.stage===child.operation.stage)","old.classification.filter(x=>r.binding.mode==='conformance'&&x.stage===child.operation.stage)");
source=source.replace('const future=process.argv.includes',"const future=process.argv.includes");
writeFileSync(new URL('wire.mjs',here),source);
