import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseScriptDriverResult} from '../../../tools/test262/script-driver-result.mjs';
import {parseScriptEnvelope} from '../../../tools/test262/script-result.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..'),out=mkdtempSync(resolve(here,'extended-'));
const save=(p,v)=>writeFileSync(resolve(out,p),JSON.stringify(v,null,2)+'\n');
const rows=JSON.parse(readFileSync(resolve(root,'test/fixtures/script-observation-serialization/frozen.json')));
const selected=[];const signatures=new Set();
for(const r of rows){const signature=JSON.stringify([r.child.result.kind,r.child.result.constructor?.outcome,!!r.child.inspection]);if(!signatures.has(signature)){selected.push(r);signatures.add(signature);}}
const mutations=[];
function missing(value,path=[]){const result=[];if(!value||typeof value!=='object')return result;if(!Array.isArray(value))for(const key of Object.keys(value))if(key!=='diagnostic')result.push([...path,key]);for(const key of Object.keys(value))result.push(...missing(value[key],[...path,key]));return result;}
for(const r of selected)for(const kind of ['child','envelope','binding'])for(const path of missing(r[kind])){
 const changed=structuredClone(r[kind]);let at=changed;for(const key of path.slice(0,-1))at=at[key];delete at[path.at(-1)];
 if(kind==='child')assert.throws(()=>parseScriptDriverResult(JSON.stringify(changed),r.binding));
 if(kind==='envelope')assert.throws(()=>parseScriptEnvelope(JSON.stringify(changed),r.binding));
 if(kind==='binding'){assert.throws(()=>parseScriptDriverResult(r.ascii,changed));assert.throws(()=>parseScriptEnvelope(JSON.stringify(r.envelope),changed));}
 mutations.push({id:r.id,kind,path,expected:kind==='binding'?'both reject':'reject'});
}
save('recursive-boundaries.json',{provenance:'retained synthetic literals; deletion vectors reference complete originals below',originals:selected,mutations});
const statuses=['pass','fail','unsupported-feature','unsupported-profile','harness-error','resource-limit','timeout','host-fault'];
function report(selection,attempts){
 const first=new Map();for(const a of attempts)if(!first.has(a.slotId))first.set(a.slotId,a.terminal);
 const counts=Object.fromEntries(statuses.map(s=>[s,0]));let plannedVariants=0,completed=0,executedVariants=0,testBodyEvaluatedVariants=0,unplannedInputErrors=0,passedFiles=0;
 const files=selection.files.map(f=>{if(f.slots===null){unplannedInputErrors++;return {path:f.path,manifestId:f.manifestId,statuses:null,inputError:f.inputError,passed:false};}
 const ss=f.slots.map(s=>{plannedVariants++;const t=first.get(s.id);if(t){completed++;counts[t.status]++;executedVariants+=Number(t.executed);testBodyEvaluatedVariants+=Number(t.testBodyEvaluated);}return {slotId:s.id,variant:s.variant,status:t?.status??null};});const passed=ss.length>0&&!f.inputError&&ss.every(s=>s.status==='pass');passedFiles+=Number(passed);return {path:f.path,manifestId:f.manifestId,statuses:ss,inputError:f.inputError,passed};});
 const complete=unplannedInputErrors===0&&completed===plannedVariants;
 return {lane:selection.lane,selectedFiles:files.length,plannedVariants,executedVariants,testBodyEvaluatedVariants,unplannedInputErrors,completed,missing:plannedVariants-completed,attempts:attempts.length,counts,passedFiles,files,excludedFixtures:[],complete,passOverPlanned:complete?{numerator:counts.pass,denominator:plannedVariants}:null,conditionalPass:counts.pass+counts.fail?{numerator:counts.pass,denominator:counts.pass+counts.fail}:null,exitCode:!complete?2:counts.pass===plannedVariants?0:1};
}
const reports=JSON.parse(readFileSync(resolve(here,'../ts-035e2-p/report-literals.json')));
for(const r of reports)assert.deepEqual(report(r.selection,r.attempts),r.expected,r.id);
// Replay only the three bounded codec tests against exact proposed bytes.
// Fresh ordinary files, no link, replacement, historical write or full suite.
const sandbox=resolve(out,'replay'),dest=resolve(sandbox,'tools/test262');mkdirSync(dest,{recursive:true});
for(const name of ['script-result.mjs','script-observe-codec.test.mjs'])copyFileSync(resolve(here,'proposals',name),resolve(dest,name));
copyFileSync(resolve(root,'tools/test262/script-driver-result.mjs'),resolve(dest,'script-driver-result.mjs'));
const fixture=resolve(sandbox,'docs/validation/ts-035c');mkdirSync(fixture,{recursive:true});copyFileSync(resolve(root,'docs/validation/ts-035c/parse-only-review.json'),resolve(fixture,'parse-only-review.json'));
const run=spawnSync(process.execPath,['--test',resolve(dest,'script-observe-codec.test.mjs')],{cwd:root,encoding:'utf8',timeout:30000});writeFileSync(resolve(out,'codec-test.stdout.txt'),run.stdout??'');writeFileSync(resolve(out,'codec-test.stderr.txt'),run.stderr??'');
save('codec-test.result.json',{status:run.status,signal:run.signal,error:run.error?.message??null});assert.equal(run.status,0);assert.equal(run.signal,null);assert.equal(run.error,undefined);
save('results.json',{recursiveRequiredFieldMutations:mutations.length,representatives:selected.length,fullReportLiterals:reports.length,exactMigratedCodecTests:3,launches:0});console.log(out);
