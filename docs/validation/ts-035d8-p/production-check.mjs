import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as p from '../../../build/node/src/parser.js';
import {observeScripts} from '../../../build/node/src/script-observation.js';
import {scriptObservationJSONRecord} from '../../../build/node/src/script-observation-json.js';
import {gunzipSync} from 'node:zlib';
const here=new URL('./',import.meta.url),root=new URL('../../../../',here),hash=b=>createHash('sha256').update(b).digest('hex');
const json=f=>JSON.parse(readFileSync(new URL(f,here)));
const manifest=json('production-manifest.json'),applied=process.argv.includes('--dispatch-applied');
assert.deepEqual(manifest.entries.map(e=>e.path),['src/parser.ts','src/script-observation.ts','src/script-observation-types.ts','tools/test262/script-driver-result.mjs','tools/test262/script-result.mjs']);
for(const e of manifest.entries){
 const original=Buffer.from(e.originalBytes,'base64'),proposed=Buffer.from(e.proposedBytes,'base64');
 assert.equal(hash(original),e.originalSha256);assert.equal(hash(proposed),e.proposedSha256);
 assert.deepEqual(readFileSync(new URL('production-proposal/'+e.path,here)),proposed,e.path);
 assert.deepEqual(readFileSync(new URL('typescript/'+e.path,root)),applied?proposed:original,e.path);
}
const matrix=json('semantic-matrix.json');
for(const r of matrix.rows){
 assert.deepEqual(p.auditBoundedScriptLexicalStatements(r.text),r.expected,r.id);
 const n={source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()};
 assert.deepEqual(p.parseBoundedScriptPreparation({id:r.id,text:r.text},n),applied?r.futurePreparation:r.current.preparation,r.id);
 assert.deepEqual({source:n.source,body:n.body,scopes:[...n.scopes],declarations:[...n.declarations],assignments:[...n.assignmentNameEligible]},r.retention,r.id);
 for(const c of r.contexts){const actual=observeScripts(c.request);assert.deepEqual(actual,applied?c.expected:c.current);if(applied)assert.equal(scriptObservationJSONRecord(actual),c.ascii);}
}
const inherited=JSON.parse(gunzipSync(readFileSync(new URL('inherited-preparations.json.gz',here)))).rows;
for(const [i,r] of inherited.entries())assert.deepEqual(p.auditBoundedScriptLexicalStatements(r.text),json('inherited-audits.json').rows[i].audit);
const controls=json('future-controls.json');let producer=0;
for(const r of [...controls.prefixRows,...controls.budgetRows]){assert.deepEqual(observeScripts(r.request),applied?r.expected:r.current);producer++;}
for(const r of controls.readyRows){assert.deepEqual(observeScripts(r.request),r.expected);producer++;}
const oldGates=JSON.parse(readFileSync(new URL('typescript/docs/validation/ts-035d7/native-build-results.json',root)));
assert.equal(oldGates.length,70);assert(oldGates.every(g=>g.verdict==='PASS'));
for(const lane of ['node','native']){
 const records=JSON.parse(readFileSync(new URL('typescript/docs/validation/ts-035d7/guest-'+lane+'-results.json',root)));
 assert.equal(records.length,212);assert(records.every(r=>r.verdict==='PASS'));
}
const result={claim:'Offline actual accepted Node sources and frozen full proposals; future/native execution unvalidated.',productionFiles:manifest.entries.length,audits:matrix.rows.length,inheritedAudits:inherited.length,additionalProducerContexts:producer,inheritedGuestRecordsPerHost:212,inheritedStaticGates:70,applied};
writeFileSync(new URL('production-check-results.json',here),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
