// One-time candidate freeze, never updates prior checkpoint manifests/hashes.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,root=resolve(here,'../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(readFileSync(p));
const save=(p,x)=>writeFileSync(join(here,p),JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const targets=[
 ['src/script-observation.ts','proposals/script-observation.ts'],
 ['test/script-observation.ts','proposals/script-observation-driver-test.ts'],
 ['tools/test262/script-producer.test.mjs','proposals/script-producer.test.mjs'],
 ['tools/test262/script-preflight-producer.test.mjs','proposals/script-preflight-producer.test.mjs'],
];
const replacements=targets.slice(0,3).map(([target,proposal])=>({target,proposal,beforeSha256:sha(readFileSync(join(root,target))),sha256:sha(readFileSync(join(here,proposal)))}));
const additions=targets.slice(3).map(([target,proposal])=>({target,proposal,sha256:sha(readFileSync(join(here,proposal)))}));
const baseline=json(join(here,'../baseline.json'));
const files=baseline.files.filter(x=>/^typescript\/(src|tools|test)\//.test(x.path)||['typescript/package.json','typescript/package-lock.json','typescript/tsconfig.json'].includes(x.path)).map(x=>({path:x.path.slice(11),sha256:x.sha256,bytes:x.bytes}));
for(const [target,proposal] of targets){const b=readFileSync(join(here,proposal)),i=files.findIndex(x=>x.path===target),entry={path:target,sha256:sha(b),bytes:b.length};if(i>=0)files[i]=entry;else files.push(entry);}
files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
const descriptor={descriptorVersion:1,kind:'conformance-preflight-dispatch-source-data',purpose:'conformance-preflight-v1',authority:'none',
 mainConstruction:{owner:'src/script-observation.ts:Attempt',profile:'script',registeredRealms:['test'],outputSink:'throws unexpected Script output',bootstrap:'src/realm.ts:Realm'},
 controlConstruction:{owner:'src/script-observation.ts:Attempt.controlSetup',controls:['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16','N01','N02','I01'],inputs:['alpha','beta'],extraRealms:{B09:['other']},extraGlobals:{B09:['Other']},outputSinkOther:'throws control output'},
 dispatch:{mode:'conformance',variant:'strict',action:'execute',preflightId:null,designated:'penultimate-harness',stopWhenReportFalse:true,trailingTest:'unprepared',layouts:[['assert','sta','control','dummy'],['assert','sta','sta','control','dummy']]},
 sourceFiles:files,literalFile:{path:'docs/validation/ts-035e3d-p/correction/future-literals.json',sha256:sha(readFileSync(join(here,'future-literals.json')))},
 unresolved:['source-to-build mapping','full toolchain/runtime/linker contents','parent host-services certification','target variant/context binding','preflight result authority','archive/private owner/receipts/F']};
save('dispatch-descriptor.json',{data:descriptor,sha256:sha(JSON.stringify(descriptor))});
const previous=readdirSync(resolve(here,'..'),{withFileTypes:true}).filter(x=>x.isFile()).map(x=>{const b=readFileSync(join(here,'..',x.name));return {path:x.name,bytes:b.length,sha256:sha(b)};});
save('checkpoint-preservation.json',{checkpoint:'56fd9920bdff0ff62cf0a0e6a272c98b214981d2',files:previous,document:{path:'original/script-conformance-preflight.md',sha256:sha(readFileSync(join(here,'original/script-conformance-preflight.md')))}});
save('proposal-manifest.json',{version:1,status:'revised-design-candidate-awaiting-review',implementationAuthorized:false,base:'56fd9920bdff0ff62cf0a0e6a272c98b214981d2',replacements,additions,sourceDescriptorSha256:sha(JSON.stringify(descriptor))});
console.log(JSON.stringify({replacements:replacements.length,additions:additions.length,sourceMembers:files.length,checkpointFiles:previous.length}));
