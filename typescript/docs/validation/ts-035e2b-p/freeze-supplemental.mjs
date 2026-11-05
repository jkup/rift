// One-time supplemental boundary literals; main frozen captures stay unchanged.
import fs from 'node:fs';import assert from 'node:assert/strict';
const own='docs/validation/ts-035e2b-p',read=n=>JSON.parse(fs.readFileSync(own+'/'+n)),save=(n,v)=>fs.writeFileSync(own+'/'+n,JSON.stringify(v,null,2)+'\n');assert(!fs.existsSync(own+'/supplemental-literals.json'));
const base=read('design-selections.json').rows,rows=[],reports=[];
for(const lane of ['node','native']){
 const s=structuredClone(base.find(r=>r.id===lane).selection),moduleFile=s.files.find(f=>f.slots.some(s=>s.variant==='module'));assert(moduleFile);
 const f=structuredClone(moduleFile);f.ordinal=0;for(const slot of f.slots){slot.ordinal=0;slot.fileOrdinal=0;slot.harness=[];slot.harnessState='input-failed';}assert.equal(f.slots.length,1);f.inputError={status:'harness-error',stage:'input',reasonCode:'include-missing'};
 const moduleSelection={...s,files:[f]},id=lane+'-module-input';rows.push({id,selection:moduleSelection});
 const attempt={sequence:1,slotId:f.slots[0].id,attempt:1,retryReason:null,terminal:{kind:'policy',stage:'input',status:'harness-error',reasonCode:'include-missing',executed:false,testBodyEvaluated:false}};
 const counts={pass:0,fail:0,'unsupported-feature':0,'unsupported-profile':0,'harness-error':1,'resource-limit':0,timeout:0,'host-fault':0};
 const expected={lane,selectedFiles:1,plannedVariants:1,executedVariants:0,testBodyEvaluatedVariants:0,unplannedInputErrors:0,completed:1,missing:0,attempts:1,counts,passedFiles:0,files:[{path:f.path,manifestId:f.manifestId,statuses:[{slotId:f.slots[0].id,variant:'module',status:'harness-error'}],inputError:f.inputError,passed:false}],excludedFixtures:[],complete:true,passOverPlanned:{numerator:0,denominator:1},conditionalPass:null,exitCode:1};reports.push({id:id+'-final',selectionId:id,attempts:[attempt],expected});
 const nullFile=structuredClone(s.files.find(file=>file.path!==f.path));nullFile.ordinal=1;nullFile.inputError={status:'harness-error',stage:'input',reasonCode:'metadata'};nullFile.slots=null;
 const mixedId=lane+'-mixed-null-module';rows.push({id:mixedId,selection:{...s,files:[f,nullFile]}});reports.push({id:mixedId+'-partial',selectionId:mixedId,attempts:[attempt],expected:{...expected,selectedFiles:2,unplannedInputErrors:1,files:[...expected.files,{path:nullFile.path,manifestId:nullFile.manifestId,statuses:null,inputError:nullFile.inputError,passed:false}],complete:false,passOverPlanned:null,exitCode:2}});
}
save('supplemental-literals.json',{syntheticPolicyOnly:true,rows,reports});console.log('Frozen 4 full Module/input/mixed-null cases; no wire or receipt authority');
