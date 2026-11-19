// One-time reviewed literal capture. Never called by verify.mjs/model.mjs.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {frozenManifest,variants,REVISION} from '../../../tools/test262/input.mjs';
import {reconstructScriptDebts} from '../../../tools/test262/script-capabilities.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(name,v)=>writeFileSync(new URL(name,import.meta.url),JSON.stringify(v,null,2)+'\n');
const read=p=>JSON.parse(readFileSync(p));
const {manifest}=await frozenManifest();const fields=['flags','features','includes','locale','negative'];
const corpus=[];const reports=[];
const zero={pass:0,fail:0,'unsupported-feature':0,'unsupported-profile':0,'harness-error':0,'resource-limit':0,timeout:0,'host-fault':0};
for(const lane of ['node','native']){
 const old=read(`docs/validation/ts-031b-a/${lane}-ledger.json`);let ordinal=0;
 const files=manifest.entries.map((e,fileOrdinal)=>({ordinal:fileOrdinal,path:e.path,manifestId:e.id,inputError:null,slots:variants({...e,locale:e.locale??[]}).map(variant=>{
  const v=old.selection.files.flatMap(f=>f.variants??[]).find(v=>v.path===e.path&&v.variant===variant);
  const metadata=Object.fromEntries(fields.map(k=>[k,e[k]??(k==='negative'?null:[])]));
  return {id:`${REVISION}:${e.path}:${variant}:${lane}`,ordinal:ordinal++,fileOrdinal,path:e.path,manifestId:e.id,lane,variant,goal:variant==='module'?'Module':'Script',blob:v.blob,sourceSha256:v.sourceSha256,byteLength:v.byteLength,transformedSourceSha256:v.transformedSourceSha256,metadata,harness:v.harness,harnessState:'verified',debts:reconstructScriptDebts(metadata,variant,e.id),admission:'blocked'};
 })}));
 const selection={lane,files,excludedFixtures:[]};corpus.push({lane,basis:'retained verified ts-031b-a identities; current E1 debts; no fresh retrieval',selection});
 const attempts=files.flatMap(f=>f.slots).map((s,n)=>({sequence:n+1,slotId:s.id,attempt:1,retryReason:null,terminal:{kind:'policy',stage:'preflight',status:s.debts[0].status,reasonCode:s.debts[0].reasonCode,executed:false,testBodyEvaluated:false}}));
 const reportFiles=(complete)=>files.map(f=>({path:f.path,manifestId:f.manifestId,statuses:f.slots.map(s=>({slotId:s.id,variant:s.variant,status:complete?s.debts[0].status:null})),inputError:null,passed:false}));
 for(const complete of [false,true])reports.push({id:`${lane}-${complete?'final':'initial'}`,selection,attempts:complete?attempts:[],expected:{lane,selectedFiles:33,plannedVariants:60,executedVariants:0,testBodyEvaluatedVariants:0,unplannedInputErrors:0,completed:complete?60:0,missing:complete?0:60,attempts:complete?60:0,counts:complete?{...zero,'unsupported-feature':19,'unsupported-profile':41}:zero,passedFiles:0,files:reportFiles(complete),excludedFixtures:[],complete,passOverPlanned:complete?{numerator:0,denominator:60}:null,conditionalPass:null,exitCode:complete?1:2}});
}
save('corpus-literals.json',corpus);
const statuses=Object.keys(zero);const files=statuses.map((status,n)=>({path:`test/s${n}.js`,manifestId:`synthetic-${n}`,inputError:null,slots:[{id:`s${n}`,variant:'raw',admission:'synthetic-admitted'}]}));
files.push({path:'test/module.js',manifestId:'synthetic-module',inputError:null,slots:[{id:'s8',variant:'module',admission:'blocked'}]});
const selection={lane:'node',files,excludedFixtures:[]};
const attempts=statuses.map((status,n)=>({sequence:n+1,slotId:`s${n}`,attempt:1,retryReason:null,terminal:{kind:'synthetic-transport',status,executed:true,testBodyEvaluated:n<2}}));
const resultFiles=files.map((f,n)=>({path:f.path,manifestId:f.manifestId,statuses:[{slotId:`s${n}`,variant:n===8?'module':'raw',status:statuses[n]??null}],inputError:null,passed:n===0}));
const expected={lane:'node',selectedFiles:9,plannedVariants:9,executedVariants:8,testBodyEvaluatedVariants:2,unplannedInputErrors:0,completed:8,missing:1,attempts:8,counts:Object.fromEntries(statuses.map(s=>[s,1])),passedFiles:1,files:resultFiles,excludedFixtures:[],complete:false,passOverPlanned:null,conditionalPass:{numerator:1,denominator:2},exitCode:2};
reports.push({id:'all-statuses-partial',selection,attempts:structuredClone(attempts),expected:structuredClone(expected)});
attempts.push({sequence:9,slotId:'s1',attempt:2,retryReason:'investigate',terminal:{kind:'synthetic-transport',status:'pass',executed:true,testBodyEvaluated:true}});
reports.push({id:'retry-first-headline',selection,attempts:structuredClone(attempts),expected:{...structuredClone(expected),attempts:9}});
attempts.push({sequence:10,slotId:'s8',attempt:1,retryReason:null,terminal:{kind:'policy',stage:'preflight',status:'unsupported-feature',reasonCode:'module',executed:false,testBodyEvaluated:false}});
const final=structuredClone(expected);Object.assign(final,{completed:9,missing:0,attempts:10,complete:true,passOverPlanned:{numerator:1,denominator:9},exitCode:1});final.counts['unsupported-feature']=2;final.files[8].statuses[0].status='unsupported-feature';
reports.push({id:'all-statuses-complete',selection,attempts:structuredClone(attempts),expected:final});
const error={status:'harness-error',stage:'input',reasonCode:'metadata'};
reports.push({id:'metadata-unknown-denominator',selection:{lane:'node',files:[{path:'test/bad.js',manifestId:'synthetic-bad',inputError:error,slots:null}],excludedFixtures:[]},attempts:[],expected:{lane:'node',selectedFiles:1,plannedVariants:0,executedVariants:0,testBodyEvaluatedVariants:0,unplannedInputErrors:1,completed:0,missing:0,attempts:0,counts:zero,passedFiles:0,files:[{path:'test/bad.js',manifestId:'synthetic-bad',statuses:null,inputError:error,passed:false}],excludedFixtures:[],complete:false,passOverPlanned:null,conditionalPass:null,exitCode:2}});
for(const reasonCode of ['include-missing','blob-mismatch','include-unpinned']){
 const error={status:'harness-error',stage:'input',reasonCode};
 const slots=['non-strict','strict'].map((variant,n)=>({id:'i'+n,variant}));
 reports.push({id:reasonCode,selection:{lane:'node',files:[{path:'test/includes.js',manifestId:'synthetic-include',inputError:error,slots}],excludedFixtures:[]},attempts:slots.map((s,n)=>({sequence:n+1,slotId:s.id,attempt:1,retryReason:null,terminal:{kind:'policy',stage:'input',status:'harness-error',reasonCode,executed:false,testBodyEvaluated:false}})),expected:{lane:'node',selectedFiles:1,plannedVariants:2,executedVariants:0,testBodyEvaluatedVariants:0,unplannedInputErrors:0,completed:2,missing:0,attempts:2,counts:{...zero,'harness-error':2},passedFiles:0,files:[{path:'test/includes.js',manifestId:'synthetic-include',statuses:slots.map(s=>({slotId:s.id,variant:s.variant,status:'harness-error'})),inputError:error,passed:false}],excludedFixtures:[],complete:true,passOverPlanned:{numerator:0,denominator:2},conditionalPass:null,exitCode:1}});
}
const allpass=structuredClone(reports[4]);allpass.id='complete-all-pass';allpass.selection.files=allpass.selection.files.slice(0,1);allpass.attempts=allpass.attempts.slice(0,1);allpass.expected={...allpass.expected,selectedFiles:1,plannedVariants:1,executedVariants:1,testBodyEvaluatedVariants:1,completed:1,missing:0,attempts:1,counts:{...zero,pass:1},files:allpass.expected.files.slice(0,1),complete:true,passOverPlanned:{numerator:1,denominator:1},conditionalPass:{numerator:1,denominator:1},exitCode:0};reports.push(allpass);
const cancelled=structuredClone(allpass);cancelled.id='cancelled-no-terminal';cancelled.attempts=[];Object.assign(cancelled.expected,{executedVariants:0,testBodyEvaluatedVariants:0,completed:0,missing:1,attempts:0,counts:zero,passedFiles:0,complete:false,passOverPlanned:null,conditionalPass:null,exitCode:2});cancelled.expected.files[0].statuses[0].status=null;cancelled.expected.files[0].passed=false;reports.push(cancelled);
save('report-literals.json',reports);
save('persistence-literals.json',['open','write','sync','close','link','cleanup','link-visible-unacknowledged','conflicting-visible','committed'].map(phase=>({phase,expected:{durable:phase==='conflicting-visible'?'foreign':['link-visible-unacknowledged','committed'].includes(phase)?'new':'old',dirty:phase!=='committed',state:['link-visible-unacknowledged','conflicting-visible'].includes(phase)?'indeterminate':'ready',receiptSpent:true},recovery:phase==='link-visible-unacknowledged'?'acknowledge':phase==='conflicting-visible'?'reject-conflict':'retain'})));
const paths=execFileSync('git',['ls-files'],{encoding:'utf8',maxBuffer:64e6}).trim().split('\n').filter(p=>p!=='TASKS.md'&&p!=='COORDINATION.md'&&!p.startsWith('docs/validation/ts-035e2-p/')&&p!=='docs/script-selection-ledger.md');
save('preservation.json',paths.map(path=>({path,sha256:hash(readFileSync(path))})));
console.log(JSON.stringify({captured:true,corpusSlots:120,reports:reports.length,preserved:paths.length}));
