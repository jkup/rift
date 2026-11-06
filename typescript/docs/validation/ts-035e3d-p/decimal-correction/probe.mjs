// Bounded offline request-boundary checks. No complete engine module is loaded.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseScriptDriverResult} from '../../../../tools/test262/script-driver-result.mjs';
const here=import.meta.dirname,read=p=>JSON.parse(readFileSync(join(here,"../correction",p)));
const proposal=readFileSync(join(here,'proposals/script-observation.ts'),'utf8');
const rows=read('future-literals.json'),negative=read('argv-negatives.json'),sourceNegative=read('source-negatives.json');
const helpers=proposal.slice(proposal.indexOf('function producerIdentifier'),proposal.indexOf('function producerDecimal'));
const boundary=proposal.slice(proposal.indexOf('// BEGIN closed conformance preflight prerequisite.'),proposal.indexOf('// Trusted positional string arrays, as in E3b;'));
const pure='type ObservationUnit = {id:string;role:"harness"|"test";text:string};\ntype ScriptObservationRequest = {nonce:string;requestSha256:string;action:"execute"|"parse-only";preflightId:string|null;steps:number;calls:number;units:ObservationUnit[]};\n'+helpers+boundary+'\nexport {preparePreflightRequest};\n';
const directory=mkdtempSync(join(here,'boundary-'));
async function load(text,name){const path=join(directory,name+'.mts');writeFileSync(path,text,{flag:'wx'});return import(pathToFileURL(path));}
function check(api){
 for(const r of rows){
  api.validateConformancePreflightArguments(r.argv);
  const answer=api.preparePreflightRequest(r.argv,r.sourceTexts);
  assert.deepEqual(answer,{control:r.control,input:r.input,observation:{nonce:r.binding.nonce,requestSha256:r.binding.requestSha256,action:'execute',preflightId:null,steps:r.binding.limits.steps,calls:r.binding.limits.calls,units:r.binding.units.map((u,n)=>({id:u.id,role:u.role,text:r.sourceTexts[n]}))}},r.id);
 }
 for(const r of negative)assert.throws(()=>api.validateConformancePreflightArguments(r.argv),{message:r.error},r.id);
 for(const r of sourceNegative)assert.throws(()=>api.preparePreflightRequest(r.argv,r.sourceTexts),{message:r.error},r.id);
 const b=rows[0];
 for(const bad of [null,{},'',[],[undefined],Array(29)])assert.throws(()=>api.validateConformancePreflightArguments(bad),{message:Array.isArray(bad)&&bad.length===0?'script-preflight/argc':'script-preflight/arguments'});
 for(const bad of [null,{},[],[undefined],Array(4)])assert.throws(()=>api.preparePreflightRequest(b.argv,bad),{message:'script-preflight/source-texts'});
 const decorated=[...b.argv];decorated.extra='ignored';api.validateConformancePreflightArguments(decorated);
 const inherited=[...b.argv];delete inherited[6];Object.setPrototypeOf(inherited,Object.assign(Object.create(Array.prototype),{6:b.argv[6]}));api.validateConformancePreflightArguments(inherited);
 for(const index of [12,13,16]){const argv=[...b.argv];argv[index]='0';api.validateConformancePreflightArguments(argv);}
 const leading=[...b.argv];leading[12]='0001';api.validateConformancePreflightArguments(leading);
}
check(await load(pure,'baseline'));
const mutations=[
 ['omit-harness-check','sourceTexts[0] === preflightAssert','true'],
 ['omit-sta-check','sourceTexts[n] === preflightSta','true'],
 ['omit-control-check','sourceTexts[units.length - 2] === preflightSource(request.control, request.input)','true'],
 ['omit-dummy-check',`sourceTexts[units.length - 1] === '"use strict";\\n'`,'true'],
 ['variant',`args[4] === "strict"`,'true'],['action',`args[5] === "execute"`,'true'],
 ['purpose',`args[0] === "conformance-preflight-v1"`,'true'],['mode',`args[3] === "conformance"`,'true'],
 ['preflight',`args[8] === "-"`,'true'],['input',`args[2] === "alpha" || args[2] === "beta"`,'true'],
 ['limits','sourceUnits === 100000 && parseDepth === 128 && evaluationDepth === 256','true'],
 ['wall','wallMs <= 2147483647','true'],['ID','id: args[n], role:','id: "u0", role:'],
];
const rejected=[];
for(const [name,from,to] of mutations){assert.equal(pure.split(from).length,2,name);const api=await load(pure.replace(from,to),name);assert.throws(()=>check(api),name);rejected.push(name);}
let literalMutations=0;
for(const r of rows){
 assert.deepEqual(parseScriptDriverResult(Buffer.from(JSON.stringify(r.expected.child)),r.binding),r.expected.child,r.id);
 // Independent frozen full oracle rejects even a self-consistent request relabel.
 for(const mutate of [x=>x.expected.child.operation.unitId='u99',x=>x.expected.report.passed=!x.expected.report.passed,x=>x.expected.report.control='B01-forged',x=>x.expected.report.input='gamma',x=>x.expected.child.operation.stage='test',x=>x.expected.child.operation.realmId='other',x=>x.expected.child.completedUnits=['u99'],x=>x.expected.child.mode='script-observation']){
  const candidate=structuredClone(r);mutate(candidate);assert.throws(()=>assert.deepEqual(candidate.expected,r.expected));literalMutations++;
 }
}
const result={pureBoundary:true,engineExecutions:0,preparedLiterals:rows.length,argvNegatives:negative.length,sourceNegatives:sourceNegative.length,boundaryMutantsRejected:rejected,childCodecFullLiterals:rows.length,literalMutationComparisons:literalMutations,directory};
writeFileSync(join(directory,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
