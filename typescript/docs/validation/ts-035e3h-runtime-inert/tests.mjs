import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {hash} from './files.mjs';
import {stageInputs,checkStaged,collect,readOutputs,readParentStreams,reviewObservation} from './controller-pieces.mjs';
import {run} from './controller.mjs';
const here=import.meta.dirname,repo=resolve(here,'../../../..'),json=n=>JSON.parse(fs.readFileSync(join(here,n))),results=[];
const root=fs.mkdtempSync(join(repo,'typescript/build/ts035e3h-runtime-synthetic-'));
const check=(id,fn)=>{fn();results.push({id,passed:true});},refuse=(id,fn)=>check(id,()=>assert.throws(fn));
const report={root,status:'incomplete',results,childExecutions:0,recorderLaunches:0,addTypeCalls:0};
try{
 await assert.rejects(run(),/INERT_RECORDER_CONTROLLER_GATE/);results.push({id:'actual-controller-gate-before-IO',passed:true});
 for(const f of json('review-literals.json'))check(f.id,()=>{const input={...f.input,streams:Object.fromEntries(Object.entries(f.input.streamHex).map(([k,v])=>[k,Buffer.from(v,'hex')]))};delete input.streamHex;assert.deepEqual(reviewObservation(input),f.expected);});
 const plan=json('proposal.json'),policy=json('output-policy.proposed.json');
 fs.mkdirSync(join(root,'sources'));const source=join(root,'sources/input.txt'),bytes=Buffer.from('synthetic input only\n');fs.writeFileSync(source,bytes,{flag:'wx'});
 const copies=plan.copies.map(c=>({from:source,to:relative(plan.root,c.to).replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)}));
 const owned=join(root,'owned');const state=stageInputs(owned,plan.freshDirectories,copies);
 check('actual-stage-five-copies',()=>assert.equal(state.inputs.length,5));check('actual-staging-preflight',()=>assert.equal(checkStaged(state,policy,plan.freshDirectories).files.length,0));
 refuse('root-reuse',()=>stageInputs(owned,plan.freshDirectories,copies));refuse('duplicate-target',()=>stageInputs(join(root,'duplicate'),plan.freshDirectories,[...copies,copies[0]]));
 refuse('wrong-source-hash',()=>stageInputs(join(root,'wronghash'),plan.freshDirectories,[{...copies[0],sha256:'0'.repeat(64)}]));
 refuse('missing-source',()=>stageInputs(join(root,'missing'),plan.freshDirectories,[{...copies[0],from:join(root,'absent')} ]));
 const hard=join(root,'hard-source');fs.linkSync(source,hard);refuse('source-hardlink-refused',()=>stageInputs(join(root,'hard-owned'),plan.freshDirectories,[{...copies[0],from:hard}]));
 // Source link count changed deliberately; preserve the fixtures and use an independent ordinary source below.
 const next=join(root,'sources/ordinary.txt');fs.writeFileSync(next,bytes,{flag:'wx'});const ordinaryCopies=copies.map(r=>({...r,from:next}));
 const other=stageInputs(join(root,'other'),plan.freshDirectories,ordinaryCopies);
 fs.writeFileSync(join(other.root,'unknown.bin'),'x',{flag:'wx'});refuse('unexpected-preflight-file',()=>checkStaged(other,policy,plan.freshDirectories));check('unknown-retained-refused',()=>{assert(fs.existsSync(join(other.root,'unknown.bin')));assert.equal(collect(other.root,policy,plan.freshDirectories).complete,false);});
 const aliasRoot=join(root,'junction');fs.symlinkSync(other.root,aliasRoot,'junction');refuse('junction-root-refused',()=>collect(aliasRoot,policy,plan.freshDirectories));
 fs.symlinkSync(join(other.root,'recorder'),join(other.root,'capture/redirect'),'junction');check('capture-alias-refused',()=>assert.equal(collect(other.root,policy,plan.freshDirectories).complete,false));
 const full=stageInputs(join(root,'full'),plan.freshDirectories,ordinaryCopies),oracle=json('smoke-oracle.json');
 for(const f of oracle.snapshot.files)fs.writeFileSync(join(full.root,'capture',f.name),Buffer.from(f.hex,'hex'),{flag:'wx'});
 check('actual-capture-extraction',()=>assert.deepEqual(collect(full.root,policy,plan.freshDirectories).files.slice().sort((a,b)=>a.name.localeCompare(b.name)),oracle.snapshot.files.slice().sort((a,b)=>a.name.localeCompare(b.name))));
 const status=json('status-literals.json')[0].input;fs.writeFileSync(join(full.root,'supervisor-status.json'),JSON.stringify(status),{flag:'wx'});for(const name of ['compiler.stdout.bin','compiler.stderr.bin','supervisor.stdout.bin','supervisor.stderr.bin'])fs.writeFileSync(join(full.root,name),'',{flag:'wx'});
 check('actual-status-stream-extraction',()=>assert.deepEqual(readOutputs(full.root).status,status));check('actual-parent-stream-read',()=>assert.equal(readParentStreams(full.root).supervisorStdout.length,0));
 const f=json('review-literals.json')[0],input={...f.input,...readOutputs(full.root),observation:collect(full.root,policy,plan.freshDirectories),inputs:full.inputs.map(r=>({...r,relative:relative(full.root,r.path).replaceAll('\\','/')}))};delete input.streamHex;check('actual-extracted-review',()=>assert.deepEqual(reviewObservation(input),f.expected));
 fs.appendFileSync(join(full.root,'recorder/link-command-recorder.exe'),'changed');check('tampered-private-copy-postreview',()=>assert.equal(reviewObservation({...input,observation:collect(full.root,policy,plan.freshDirectories)}).detail,'staged-input-drift'));
 fs.writeFileSync(join(full.root,'capture/first-command.bin'),Buffer.from([0]));check('partial-record-retained',()=>assert.equal(collect(full.root,policy,plan.freshDirectories).files.find(f=>f.name==='first-command.bin').hex,'00'));
 fs.writeFileSync(join(full.root,'supervisor-status.json'),'{');refuse('malformed-status-refused',()=>readOutputs(full.root));
 let reserved;refuse('partial-stage-retained',()=>stageInputs(join(root,'partial'),plan.freshDirectories,ordinaryCopies,p=>{if(p.endsWith('recorder\\link-command-recorder.exe.config'))throw Error('synthetic attribute fault');return 0;},p=>reserved=p));check('owned-partial-file-still-present',()=>assert(fs.existsSync(join(reserved,'recorder/link-command-recorder.exe'))));
 report.status='passed';
}catch(e){report.error={name:e.name,code:e.code??null,message:e.message,stack:e.stack};report.status='failed';process.exitCode=1;}
finally{
 const inventory=[];function walk(p){const s=fs.lstatSync(p,{bigint:true}),r={path:p,dev:String(s.dev),ino:String(s.ino),nlink:String(s.nlink),kind:s.isSymbolicLink()?'alias':s.isDirectory()?'directory':'file'};if(r.kind==='alias')r.target=fs.readlinkSync(p);else if(r.kind==='file'){const b=fs.readFileSync(p);r.bytes=b.length;r.sha256=hash(b);}inventory.push(r);if(r.kind==='directory')for(const n of fs.readdirSync(p))walk(join(p,n));}walk(root);report.inventory=inventory;
 fs.writeFileSync(join(here,'test-results.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({status:report.status,controls:results.length,error:report.error,childExecutions:0}));
