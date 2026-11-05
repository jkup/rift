// One-time literal capture; normal correction replay never invokes this file.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {frozenManifest,REVISION} from '../../../tools/test262/input.mjs';
const save=(n,v)=>writeFileSync(new URL(n,import.meta.url),JSON.stringify(v,null,2)+'\n');
const hash=b=>createHash('sha256').update(b).digest('hex');
const {manifest,manifestSha256}=await frozenManifest();
const wrong=[];
for(const lane of ['node','native']){
 const files=manifest.entries.map(e=>({path:e.path,id:e.id,variants:null,inputError:{status:'harness-error',stage:'input',reasonCode:'revision-mismatch'}}));
 const policyFiles=[{path:'tools/test262/script-plan.mjs',sha256:'1'.repeat(64)}];
 const fixedContext={runId:lane==='node'?'00000000-0000-4000-8000-000000000001':'00000000-0000-4000-8000-000000000002',authority:{registryVersion:1,registrySha256:hash(readFileSync(new URL('../../../tools/test262/script-capabilities.json',import.meta.url))),entries:[]},policy:{id:'rift-script-blocked-v2',closureSha256:hash(JSON.stringify(policyFiles)),files:policyFiles,host:'synthetic-host',platform:'synthetic-platform'}};
 wrong.push({id:lane+'-wrong-revision',basis:'Complete literal planCorpus and outer projection; fixedContext is synthetic policy/UUID data, never a production token or actual closure.',input:{root:'.',revision:'wrong',lane,paths:manifest.entries.map(e=>e.path)},pinnedRevision:REVISION,fixedContext,
 expectedPlan:{schemaVersion:1,kind:'host-only-selection',revision:'wrong',manifestSha256,lane,cache:false,files,excludedFixtures:[]},
 expectedSelection:{selectionVersion:2,kind:'script-blocked-selection',runId:fixedContext.runId,revision:'wrong',manifestSha256,lane,cache:false,authority:fixedContext.authority,policy:fixedContext.policy,execution:null,files:files.map((f,ordinal)=>({ordinal,path:f.path,manifestId:f.id,inputError:f.inputError,slots:null})),excludedFixtures:[]},
 expectedDenominator:{selectedFiles:33,plannedVariants:0,unplannedInputErrors:33,completed:0,missing:0,complete:false,passOverPlanned:null,conditionalPass:null,exitCode:2}});
}
save('wrong-revision-literals.json',wrong);
const rows=[];
for(const authority of ['same','read-error','invalid-bytes','different'])for(const closure of ['same','read-error','different']){
 const trace=['authority-read'];let error=null,published=false;
 if(authority==='read-error'||authority==='invalid-bytes')error='script-plan/authority';
 else {trace.push('authority-compare');if(authority==='different')error='script-plan/drift';else{trace.push('closure-read');if(closure==='read-error')error='script-plan/closure';else {trace.push('closure-compare');if(closure==='different')error='script-plan/drift';else{trace.push('publish');published=true;}}}}
 rows.push({id:authority+'/'+closure,input:{authority,closure},expected:{error,published,trace},reachable:authority==='different'?'defensive only; impossible successful E1 read':'current E1 IO contract'});
}
save('second-check-literals.json',rows);
console.log(JSON.stringify({wrongRevisionLanes:wrong.length,secondChecks:rows.length}));
