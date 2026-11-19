// Offline test-harness audit only. No driver/producer import, spawn or guest.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,existsSync,mkdirSync,renameSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const here=fileURLToPath(new URL('./',import.meta.url)),base=resolve(here,'..'),out=mkdtempSync(join(here,'run-'));
const hash=b=>createHash('sha256').update(b).digest('hex'),save=(n,v)=>writeFileSync(join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const source=readFileSync(join(base,'proposals/script-producer.test.mjs'),'utf8');
const start='// BEGIN offline-audited negative setup',end='// END offline-audited negative setup.';
assert.equal(source.split(start).length,2);assert.equal(source.split(end).length,2);
const block=source.slice(source.indexOf(start),source.indexOf(end));
assert(!/spawn|produceConformanceScripts|parseScriptProducerArguments/.test(block));
function assertWiring(text){
 assert(text.includes("read('correction/driver-negative-cases.json')"));
 assert(text.includes("const {args,result}=setupNegative(row,mkdtempSync(resolve('build','producer-negative-')));"));
 assert(text.includes('assertNegativeSetup(row,setup);return setup;'));
 assert(text.indexOf('setupNegative(row,mkdtempSync')<text.indexOf("const p=spawnSync",text.indexOf("test('pure parser")));
}
assertWiring(source);
assert.throws(()=>assertWiring(source.replace('assertNegativeSetup(row,setup);return setup;','return setup;')));
const prelude="import assert from 'node:assert/strict';\nimport {readFileSync,writeFileSync,existsSync} from 'node:fs';\nimport {join} from 'node:path';\n";
const modulePath=join(out,'actual-test-setup.mjs');writeFileSync(modulePath,prelude+block+'\nexport {assertNegativeSetup,setupNegative};\n',{flag:'wx'});
const api=await import(pathToFileURL(modulePath));
const rows=JSON.parse(readFileSync(join(here,'driver-negative-cases.json'))),original=JSON.parse(readFileSync(join(base,'argv-negatives.json')));
assert.equal(rows.length,57);assert.deepEqual(rows.map(r=>({id:r.id,argv:r.argv,error:r.error})),original.map(r=>({id:r.id,argv:r.argv,error:r.error})));
const setups=[],mutations=[];
for(const lane of ['node','native'])for(const row of rows){
 const dir=mkdtempSync(join(out,'case-')),setup=api.setupNegative(row,dir);api.assertNegativeSetup(row,setup);
 const files=row.files.map(f=>({path:join(dir,f.token),present:existsSync(join(dir,f.token)),bytes:f.present?readFileSync(join(dir,f.token),'utf8'):null}));
 setups.push({lane,id:row.id,setupClass:row.setupClass,argv:setup.args,files,expectedDriver:row.expectedDriver,driverLaunched:false});
 if(row.setupClass!=='ordinary-controls')continue;
 const first=row.files[0];assert(first?.present);const path=join(dir,first.token);
 // Retain original bytes under an explicit adjacent name, rather than delete.
 renameSync(path,path+'.retained');assert.throws(()=>api.assertNegativeSetup(row,setup));renameSync(path+'.retained',path);
 const badArgs={...setup,args:setup.args.map(a=>a===path?path+'.absent':a)};assert.throws(()=>api.assertNegativeSetup(row,badArgs));
 const bad=structuredClone(row);bad.files[0].present=false;bad.files[0].text=null;assert.throws(()=>api.assertNegativeSetup(bad,setup));
 const text=structuredClone(row);text.files[0].text='0;';assert.throws(()=>api.assertNegativeSetup(text,setup));
 mutations.push({lane,id:row.id,missingFileRejected:true,wrongArgPathRejected:true,unapprovedMissingFixtureRejected:true,strictPrefixRemovalRejected:true});
}
// Mutate the exact proposed test helper, not a substitute model of setup.
const write='for(const f of row.files)if(f.present)writeFileSync(join(dir,f.token),f.text,{flag:\'wx\'});';
assert.equal(block.split(write).length,2);
const mutated=join(out,'missing-file-mutant.mjs');writeFileSync(mutated,prelude+block.replace(write,'// mutation: omit source creation')+'\nexport {setupNegative};\n',{flag:'wx'});
const mutant=await import(pathToFileURL(mutated));let mutantRejected=0;
for(const row of rows.filter(r=>r.setupClass==='ordinary-controls')){
 assert.throws(()=>mutant.setupNegative(row,mkdtempSync(join(out,'mutant-'))));mutantRejected++;
}
const prior=JSON.parse(readFileSync(join(here,'original/artifacts.json'))),allowed=['README.md','proposals/script-producer.test.mjs','new-file-manifest.json'];let unchanged=0;
for(const f of prior)if(!allowed.includes(f.path)){assert.equal(hash(readFileSync(join(base,f.path))),f.sha256,f.path);unchanged++;}
save('setups.json',setups);save('mutations.json',mutations);
const summary={setupCases:setups.length,ordinaryPerLane:52,malformedLayoutPerLane:4,explicitMissingCompoundPerLane:1,ordinaryMutationChecks:mutations.length*4,missingCreationMutantsRejected:mutantRejected,removedSetupAssertionMutantRejected:1,originalArtifactIdentitiesUnchanged:unchanged,sourceProposalsChanged:0,driverLaunches:0,guestExecutions:0,nativeBuilds:0};
save('summary.json',summary);console.log(JSON.stringify({out,...summary}));
