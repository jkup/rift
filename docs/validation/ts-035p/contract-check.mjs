// Document-contract lint only; deliberately does not implement a v2 decoder.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const doc=readFileSync(new URL('../../script-admission.md',import.meta.url),'utf8');
const checks=[
  ['runtime-arm',d=>/\{ kind: "unsupported-operation"; phase: "runtime";\s+capabilityCode: "runtime.object-to-number" \| "runtime.object-to-string" \|\s+"runtime.map-species" \}/.test(d)&&d.includes('| U01 |')&&d.includes('| U02 |')],
  ['binding-limits',d=>{const b=d.match(/type ScriptDecoderBinding = \{([\s\S]*?)\n\};/)?.[1]??'';return ['sourceUnits','parseDepth','steps','calls','evaluationDepth','wallMs','outputBytes'].every(k=>b.includes(k+': number'));}],
  ['binding-sources',d=>{const b=d.match(/type ScriptDecoderBinding = \{([\s\S]*?)\n\};/)?.[1]??'';return b.includes('sources: { unitId: string; transformedText: string }[];')&&d.includes('Use the exact ScriptDecoderBinding and API signatures above');}],
  ['registered-other',d=>d.includes('Equality with the active Realm is not required.')&&!d.includes('foreign/unregistered available constructor Realm')&&d.includes('| R01 |')],
  ['normal-control',d=>d.includes('The wire Result is exactly `{kind:"normal"}` for both, with no value/output field.')&&d.includes('let a=1; observe(a);')&&d.includes('let a=2; observe(a);')],
  ['diagnostic-rule',d=>d.includes('(NonNormalResult & { diagnostic?: string });')&&d.includes('Normal forbids diagnostic.')&&d.includes('| D01 |')],
];
const mutations=[
  d=>d.replace('kind: "unsupported-operation"; phase: "runtime";','kind: "unsupported-operation"; phase: "parse";'),
  d=>d.replace('calls: number; evaluationDepth: number; wallMs: number; outputBytes: number','calls: number; evaluationDepth: number; wallMs: number'),
  d=>d.replace('sources: { unitId: string; transformedText: string }[];','sources: { unitId: string }[];'),
  d=>d.replace('Equality with the active Realm is not required.','Equality with the active Realm is required.'),
  d=>d.replace('let a=2; observe(a);','let a=2;'),
  d=>d.replace('(NonNormalResult & { diagnostic?: string });','NonNormalResult;'),
];
const results=checks.map(([id,check],i)=>{
  assert.ok(check(doc),id+' contract consistency');
  const mutated=mutations[i](doc);
  assert.notEqual(mutated,doc,id+' mutation effective');
  assert.equal(check(mutated),false,id+' omitted/contradictory contract caught');
  return {id,documentConsistent:true,mutatedDocumentRejected:true};
});
const result={kind:'document-contract-lint',scope:'Text/shape checks only; no v2 implementation, runtime or native evidence',documentSha256:createHash('sha256').update(doc).digest('hex'),results};
writeFileSync(new URL('contract-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({kind:result.kind,consistent:results.length,documentMutationsRejected:results.length}));
