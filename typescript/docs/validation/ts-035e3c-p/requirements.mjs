import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {metadata,harnessPaths,transform,sha256} from '../../../tools/test262/input.mjs';
const here=fileURLToPath(new URL('./',import.meta.url));
const reportBytes=readFileSync(resolve(here,'../ts-035e2-p/report-literals.json'));
const rows=JSON.parse(reportBytes);
function report(selection,attempts){
 const chosen=new Map();for(const a of attempts)if(!chosen.has(a.slotId))chosen.set(a.slotId,a.terminal);
 const counts=Object.fromEntries(['pass','fail','unsupported-feature','unsupported-profile','harness-error','resource-limit','timeout','host-fault'].map(s=>[s,0]));
 let planned=0,done=0,unknown=0,executed=0,body=0;
 const files=selection.files.map(f=>{
  const statuses=f.slots===null?null:f.slots.map(s=>{
   planned++;const t=chosen.get(s.id);if(t){done++;counts[t.status]++;executed+=t.executed===true?1:0;body+=t.testBodyEvaluated===true?1:0;}
   return {slotId:s.id,variant:s.variant,status:t?.status??null};
  });if(statuses===null)unknown++;
  return {path:f.path,manifestId:f.manifestId,statuses,inputError:f.inputError,passed:f.inputError===null&&statuses!==null&&statuses.every(s=>s.status==='pass')};
 });
 const complete=unknown===0&&done===planned;
 return {lane:selection.lane,selectedFiles:files.length,plannedVariants:planned,executedVariants:executed,testBodyEvaluatedVariants:body,
  unplannedInputErrors:unknown,completed:done,missing:planned-done,attempts:attempts.length,counts,passedFiles:files.filter(f=>f.passed).length,files,
  excludedFixtures:selection.excludedFixtures,complete,passOverPlanned:complete?{numerator:counts.pass,denominator:planned}:null,
  conditionalPass:counts.pass+counts.fail?{numerator:counts.pass,denominator:counts.pass+counts.fail}:null,
  exitCode:!complete?2:counts.pass===planned?0:1};
}
for(const row of rows)assert.deepEqual(report(row.selection,row.attempts),row.expected,row.id);
const inputs=[];
for(const [id,source,error] of [
 ['unknown-field','/*---\ndescription: x\nunknown: true\n---*/','metadata'],
 ['unknown-flag','/*---\ndescription: x\nflags: [mystery]\n---*/','unknown-flag'],
 ['include-parent','/*---\ndescription: x\nincludes: [../x.js]\n---*/','include-path'],
 ['duplicate-includes','/*---\ndescription: x\nincludes: [sta.js, sta.js]\n---*/',null],
 ['order-ab','/*---\ndescription: x\nincludes: [assert.js, sta.js]\n---*/',null],
 ['order-ba','/*---\ndescription: x\nincludes: [sta.js, assert.js]\n---*/',null]]){
 let actual=null,value=null;try{value=metadata(source);}catch(e){actual=e.reasonCode;}
 assert.equal(actual,error);inputs.push({id,source,error,metadata:value,harness:value?harnessPaths(value):null,claim:'synthetic metadata/ordering input; no manifest authority or admission'});
}
assert.notDeepEqual(inputs[4].harness,inputs[5].harness);
const source=Buffer.from('\uFEFF0; // \u{1F600}\n'),transforms=[];
for(const variant of ['raw','non-strict','strict']){
 const bytes=transform(source,variant),text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
 transforms.push({variant,originalBase64:source.toString('base64'),originalSha256:sha256(source),transformedBase64:bytes.toString('base64'),transformedSha256:sha256(bytes),originalByteLength:source.length,transformedByteLength:bytes.length,sourceUnits:text.length,text});
}
assert.equal(transforms[0].transformedSha256,transforms[1].transformedSha256);assert.notEqual(sha256(JSON.stringify(transforms[0])),sha256(JSON.stringify(transforms[1])));
assert.equal(transforms[2].text,'"use strict";\n'+transforms[0].text);
writeFileSync(resolve(here,'retained-report-literals.json'),reportBytes,{flag:'wx'});
writeFileSync(resolve(here,'requirements-results.json'),JSON.stringify({claim:'13 retained full synthetic/denial report literals independently recomputed; synthetic admits are arithmetic requirements, never production tokens.',reports:rows.map(r=>({id:r.id,passed:true})),inputs,transforms},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({fullReports:rows.length,metadata:inputs.length,transforms:transforms.length,guestLaunches:0}));
