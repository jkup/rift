import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,cpSync,symlinkSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=fileURLToPath(new URL('./',import.meta.url)),base=resolve(here,'../../..'),out=mkdtempSync(resolve(here,'context-'));
const files=['tools/test262/input.mjs','tools/test262/script-plan.mjs','tools/test262/script-ledger.mjs','tools/test262/script-capabilities.mjs','tools/test262/script-capabilities.json','fixtures/assistance/test262-starter-corpus/manifest.json','package.json','package-lock.json'];
const isolated=resolve(out,'isolated');
for(const f of files){const target=resolve(isolated,f);mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(base,f),target);}
cpSync(resolve(base,'node_modules/yaml'),resolve(isolated,'node_modules/yaml'),{recursive:true});
copyFileSync(resolve(here,'proposals/script-execution-inputs.mjs'),resolve(isolated,'tools/test262/script-execution-inputs.mjs'));
const load=name=>import(pathToFileURL(resolve(isolated,'tools/test262',name)));
const policy=await load('script-plan.mjs'),input=await load('input.mjs'),api=await load('script-execution-inputs.mjs');
const corpus='C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',limits={sourceUnits:100000,parseDepth:128,steps:0,calls:0,evaluationDepth:256,wallMs:0,outputBytes:0};
const {manifest}=await input.frozenManifest(),paths=manifest.entries.map(e=>e.path),rows=[];
async function failure(id,fn,error,before,token){await assert.rejects(fn,{message:error});const after=api.inspectScriptExecutionInputs(token);assert.deepEqual(after,before);rows.push({id,error,before,after});}
for(const lane of ['node','native']){
 const token=await policy.prepareScriptSelection({root:corpus,revision:input.REVISION,lane,paths});
 const selected=await api.prepareScriptExecutionInputs(token,{root:corpus,limits}),before=api.inspectScriptExecutionInputs(selected);
 const ledgerPath=resolve(isolated,'tools/test262/script-ledger.mjs'),ledgerBytes=readFileSync(ledgerPath);
 writeFileSync(ledgerPath,Buffer.concat([ledgerBytes,Buffer.from('\n// isolated closure drift\n')]));
 await assert.rejects(()=>policy.assertScriptSelectionCurrent(token),{message:'script-plan/drift'});
 await failure(lane+'/closure',()=>api.assertScriptExecutionInputsCurrent(selected),'script-execution-inputs/policy-current',before,selected);
 await failure(lane+'/closure-before-missing-root',()=>api.prepareScriptExecutionInputs(token,{root:resolve(out,'absent'),limits}),'script-execution-inputs/policy-current',before,selected);
 const registryPath=resolve(isolated,'tools/test262/script-capabilities.json'),registryBytes=readFileSync(registryPath);
 writeFileSync(registryPath,Buffer.concat([registryBytes,Buffer.from('\n')]));
 await assert.rejects(()=>policy.assertScriptSelectionCurrent(token),{message:'script-plan/authority'});
 await failure(lane+'/authority-and-closure',()=>api.assertScriptExecutionInputsCurrent(selected),'script-execution-inputs/policy-current',before,selected);
 writeFileSync(registryPath,registryBytes);writeFileSync(ledgerPath,ledgerBytes);
 await api.assertScriptExecutionInputsCurrent(selected);
 const alias=resolve(out,'junction-'+lane);symlinkSync(corpus,alias,'junction');
 await failure(lane+'/root-junction',()=>api.prepareScriptExecutionInputs(token,{root:alias,limits}),'script-execution-inputs/root',before,selected);
 unlinkSync(alias);
 // A deliberate reduction: E2 does NOT close this new helper or the engine.
 // Its input digest must therefore never be sold as execution certification.
 const helperPath=resolve(isolated,'tools/test262/script-execution-inputs.mjs'),helperBytes=readFileSync(helperPath);
 writeFileSync(helperPath,Buffer.concat([helperBytes,Buffer.from('\n// isolated unclosed source change\n')]));
 await api.assertScriptExecutionInputsCurrent(selected);
 assert.deepEqual(api.inspectScriptExecutionInputs(selected),before);
 rows.push({id:lane+'/unclosed-helper-reduction',claim:'Input assertion passes; execution certification is explicitly unavailable.',snapshot:before});
 writeFileSync(helperPath,helperBytes);
}
writeFileSync(resolve(out,'results.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,rows:rows.length,lanes:2,guestLaunches:0,builds:0}));
