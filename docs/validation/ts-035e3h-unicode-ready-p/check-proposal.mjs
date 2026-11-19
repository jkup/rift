import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const here = import.meta.dirname;
const repo = path.resolve(here, '../../../..');
const ready = p => path.join(here, p);
const corrected = path.join(here, '../ts-035e3h-unicode-corrected');
const design = path.join(here, '../ts-035e3h-unicode-p');
const read = p => fs.readFileSync(p);
const hash = b => createHash('sha256').update(b).digest('hex');
const json = p => JSON.parse(read(p));
const requireBoundBytes=(bytes,expectedBytes,expectedHash,label)=>{
  assert.equal(bytes.length,expectedBytes,label);
  assert.equal(hash(bytes),expectedHash,label);
};
const fixedRunner = 'C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3h-unicode-runner-1';
const fixedDiagnostic = 'C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3h-unicode-diagnostic-1';
const originalBindingHash = '10d6853086efef3d4dd65ff9d92253ac8d3d4fa501c65f929b1a06eb7e6ff802';
const transformedBindingHash = 'cd34842707f92c09b6ec3afe84e23bab71b8105db765c98083e601159b6c92ed';
const transformedEntryHash = '5fa58f52a780bdc223d9e73f22e8804ebd45f1934db470cab27bce526bd01e61';
const expectedAliasPolicy={path:'typescript/docs/validation/ts-035e3h-runtime-ready-p/alias-policy.json',bytes:35797,sha256:'bfab8dfb6968e755146d40d477b1aae282ac7961f2d7a4cdca6432e85f6be9c4',scope:'Reuse the exact accepted six-group/15-name metadata policy; do not broaden groups or infer trust beyond cooperative OS/tool identity.'};
const acceptedModules = [
  {name:'controller.mjs',bytes:9681,sha256:'b6bce21f9ffa856a6244f6855e586d1da80edea6e27707fa27b54ae45e5d0a69'},
  {name:'transport.mjs',bytes:1384,sha256:'8cfc90600ea06a18aa045e7f781b9522b9bc650f99b03401ef87f39655747f07'},
  {name:'inventory.mjs',bytes:4092,sha256:'11bd1578801b325d0ecb24b51681ca59e64eb1de264c54cc40ec712cd43b5db6'}
];
const sourceRelative = name => `typescript\\docs\\validation\\ts-035e3h-unicode-corrected\\${name}`;
const destination = name => `${fixedRunner}\\${name}`;
const expectedDirectories = ['tmp','home','home\\AppData','home\\AppData\\Roaming','home\\AppData\\Local'];
const expectedStagingProtocol=[
  'Before any write: verify both fixed roots are absent; verify C:\\Users\\jonku\\code\\rift\\typescript\\build and every named ancestor with the exact alias policy pinned by proposal.json; rehash all eleven source/tool rows and both derived artifact rows; verify every destination name is unique.',
  'Create runnerRoot with a single non-recursive mkdir; create the five listed subdirectories one at a time; create each of the five listed files with exclusive-new-file semantics. Never overwrite, retry, or remove a partial tree.',
  'After writes: reopen each of the five files, verify type, size and SHA-256; rehash all original source/tool rows and require before/after identity equality. Any mismatch retains the partial runner tree and prevents dispatch.',
  'Only after the complete successful preflight and writes, dispatch exactly one pinned Node process with the exact argv, cwd and ten-key future-invocation environment. The Node entry then validates bundle bindings and invokes the unchanged bounded controller; no shell or fallback command.'
];
const expectedEnv = root => ({
  SystemRoot:'C:\\WINDOWS', WINDIR:'C:\\WINDOWS',
  TEMP:`${root}\\tmp`, TMP:`${root}\\tmp`,
  USERPROFILE:`${root}\\home`, HOME:`${root}\\home`,
  APPDATA:`${root}\\home\\AppData\\Roaming`, LOCALAPPDATA:`${root}\\home\\AppData\\Local`,
  POWERSHELL_TELEMETRY_OPTOUT:'1', POWERSHELL_UPDATECHECK:'Off'
});
let syntheticControls=0;
const rejects=(fn,label)=>{assert.throws(fn,label);syntheticControls++;};
const requireEnvironment=(candidate,root)=>{
  assert.equal(Object.keys(candidate).length,10);
  assert.deepEqual(candidate,expectedEnv(root));
};
const proposal = json(ready('proposal.json'));
const base = json(path.join(corrected,'bindings.json'));
const future = json(ready('future-invocation.json'));
const contractBytes = read(path.join(design,'diagnostic-contract.json'));
const contract = JSON.parse(contractBytes);
const childContractArtifact=read(ready('child-contract.json.txt'));
const material = json(ready('materialization.json'));
const entryTransform = json(ready('entry-transform.json'));
const entryRow = json(ready('enabled-entry-row.json'));
const bindingRow = json(ready('enabled-bindings-row.json'));

assert.equal(proposal.base,'ec63ebee1e77c818b405ed9f546cbbfacae187ab');
assert.equal(proposal.status,'DESIGN ONLY; no reservation/materialization/execution');
assert.equal(proposal.runnerRoot,fixedRunner);
assert.equal(proposal.diagnosticRoot,fixedDiagnostic);
assert.equal(proposal.fixedRootsMustRemainAbsent,true);
assert.deepEqual(proposal.aliasPolicy,expectedAliasPolicy);
requireBoundBytes(read(path.resolve(repo,proposal.aliasPolicy.path)),proposal.aliasPolicy.bytes,proposal.aliasPolicy.sha256,'accepted alias policy');
assert.equal(future.authorized,false);
assert.equal(future.ready,false);
assert.equal(future.amendmentAcceptanceRequired,true);
assert.equal(contract.status,'DESIGN ONLY; execution unauthorized');
assert.equal(base.rows.length,11);
requireBoundBytes(read(path.join(corrected,'bindings.json')),3745,originalBindingHash,'accepted binding');
requireBoundBytes(read(path.join(corrected,'future-invocation.json')),2061,'f770eae1fa245a8d2c0061a7048029cb0eb0c047f3d70a4caa00a8dc97b4a4bc','accepted invocation');
requireBoundBytes(read(path.join(corrected,'amendment.json')),3222,'d14ac2bac269bbd153e5a292fd842bbba8ea10bd2bf5d35ac18cb369896e1bcc','accepted amendment');
requireBoundBytes(contractBytes,3736,'2cd2ec5b6c10d5f92aa97f27c2a7b3f9e64396b8b29e8789de09393e678740cc','accepted child contract');
assert.deepEqual(childContractArtifact,contractBytes);

// Freeze the ordered source/dependency/tool rows independently before deriving their bundle copy.
for (const row of [...Object.values(base).filter(v=>v&&typeof v==='object'&&!Array.isArray(v)),...base.rows]) {
  const bytes=read(row.path);
  requireBoundBytes(bytes,row.bytes,row.sha256,row.path);
}
const expectedBinding = structuredClone(base);
for (const module of acceptedModules) {
  const row = expectedBinding.rows.find(r=>r.path===`C:\\Users\\jonku\\code\\rift\\${sourceRelative(module.name).replaceAll('/','\\')}`);
  assert(row,module.name);
  row.path=destination(module.name);
}
const expectedBindingBytes=Buffer.from(JSON.stringify(expectedBinding,null,2)+'\n','utf8');
assert.equal(expectedBindingBytes.length,3706);
assert.equal(hash(expectedBindingBytes),transformedBindingHash);
assert.deepEqual(read(ready('enabled-bindings.json.txt')),expectedBindingBytes);
assert.equal(bindingRow.path,'typescript\\docs\\validation\\ts-035e3h-unicode-ready-p\\enabled-bindings.json.txt');
assert.equal(bindingRow.destination,destination('bindings.json'));
assert.equal(bindingRow.bytes,3706);
assert.equal(bindingRow.sha256,transformedBindingHash);
assert.equal(bindingRow.mode,'exclusive-new-file');

// Verify the exact ordered two-literal enabled entry and its embedded transformed binding digest.
const sourcePath=path.join(repo,'typescript/docs/validation/ts-035e3h-unicode-corrected/entry.mjs');
const sourceEntry=read(sourcePath);
assert.equal(sourceEntry.length,1460);
assert.equal(hash(sourceEntry),'d8fa8adffe0d7c33bcc5293df65d864e612082c096e455b576dddcf89c2c9613');
const literalChanges=[
  ['const RUN = false;','const RUN = true;'],
  [originalBindingHash,transformedBindingHash]
];
let expectedEntry=sourceEntry;
for(const [oldText,newText] of literalChanges){
  const oldBytes=Buffer.from(oldText),newBytes=Buffer.from(newText),at=expectedEntry.indexOf(oldBytes);
  assert(at>=0,oldText);assert.equal(expectedEntry.indexOf(oldBytes,at+oldBytes.length),-1,oldText);
  expectedEntry=Buffer.concat([expectedEntry.subarray(0,at),newBytes,expectedEntry.subarray(at+oldBytes.length)]);
}
assert.equal(expectedEntry.length,1459);
assert.equal(hash(expectedEntry),transformedEntryHash);
assert.deepEqual(read(ready('enabled-entry.mjs.txt')),expectedEntry);
assert.equal(entryTransform.source,'typescript/docs/validation/ts-035e3h-unicode-corrected/entry.mjs');
assert.equal(entryTransform.sourceBytes,1460);
assert.equal(entryTransform.sourceSha256,'d8fa8adffe0d7c33bcc5293df65d864e612082c096e455b576dddcf89c2c9613');
assert.deepEqual(entryTransform.transformations,literalChanges.map(([oldLiteral,newLiteral])=>({oldLiteral,newLiteral,count:1})));
assert.equal(entryTransform.outputBytes,1459);
assert.equal(entryTransform.outputSha256,transformedEntryHash);
assert.equal(entryTransform.output,'enabled-entry.mjs.txt');
assert.equal(entryTransform.destination,destination('entry.mjs'));
assert.equal(entryTransform.gateEnabledOnlyInProposalTxt,true);
assert.equal(entryRow.path,'typescript\\docs\\validation\\ts-035e3h-unicode-ready-p\\enabled-entry.mjs.txt');
assert.equal(entryRow.destination,destination('entry.mjs'));
assert.equal(entryRow.bytes,1459);
assert.equal(entryRow.sha256,transformedEntryHash);
assert.equal(entryRow.mode,'exclusive-new-file');

const expectedRows=[
  ...acceptedModules.map(m=>({source:sourceRelative(m.name),destination:destination(m.name),bytes:m.bytes,sha256:m.sha256,mode:'exclusive-new-file'})),
  {path:'typescript\\docs\\validation\\ts-035e3h-unicode-ready-p\\enabled-bindings.json.txt',destination:destination('bindings.json'),bytes:3706,sha256:transformedBindingHash,mode:'exclusive-new-file'},
  {path:'typescript\\docs\\validation\\ts-035e3h-unicode-ready-p\\enabled-entry.mjs.txt',destination:destination('entry.mjs'),bytes:1459,sha256:transformedEntryHash,mode:'exclusive-new-file'}
];
const requireRows=rows=>{
  assert.deepEqual(rows,expectedRows);
  assert.equal(new Set(rows.map(r=>r.destination)).size,5);
};
const requireDirectories=dirs=>assert.deepEqual(dirs,expectedDirectories);
const expectedLimits={launches:1,retries:0,timeoutMs:5000,cleanupMs:5000,stdoutBytes:8192,stderrBytes:8192,inputBytes:1024};
const requireLimits=limits=>assert.deepEqual(limits,expectedLimits);
const expectedLaunch={
  node:{path:'C:\\Program Files\\nodejs\\node.exe',bytes:100097864,sha256:'14319838b3f355e0398c13569a90270bce4fc68f25189f58c59b03dadae0e6d5'},
  entry:{path:destination('entry.mjs'),bytes:1459,sha256:transformedEntryHash},
  argv:[destination('entry.mjs')],cwd:'C:\\Users\\jonku\\code\\rift',inheritEnvironment:false
};
const requireLaunch=launch=>assert.deepEqual(launch,expectedLaunch);
const requireRoots=(runner,diagnostic)=>{
  assert.equal(runner,fixedRunner);
  assert.equal(diagnostic,fixedDiagnostic);
};
requireRows(material.runnerRows);
requireDirectories(material.runnerDirectories);
assert.equal(material.status,'DESIGN ONLY; execution unauthorized');
requireRoots(material.runnerRoot,material.diagnosticRoot);
assert.equal(material.childContractBytes,3736);
assert.equal(material.childContractSha256,'2cd2ec5b6c10d5f92aa97f27c2a7b3f9e64396b8b29e8789de09393e678740cc');
assert.deepEqual(material.protocol,expectedStagingProtocol);
assert.equal(material.partialFailure,'Retain runnerRoot and all created bytes/status/errors; do not retry or clean recursively.');
for(const row of material.runnerRows){
  const sourcePath=path.resolve(repo,row.source??row.path);
  const bytes=read(sourcePath);
  requireBoundBytes(bytes,row.bytes,row.sha256,sourcePath);
  if(row.destination.endsWith('\\controller.mjs')||row.destination.endsWith('\\transport.mjs')||row.destination.endsWith('\\inventory.mjs')){
    const name=path.win32.basename(row.destination);
    assert.deepEqual(bytes,read(path.join(corrected,name)));
  }
}

// Both roots remain absent; the outer Node and inner PowerShell environments are separately frozen.
for(const root of [fixedRunner,fixedDiagnostic]) assert.throws(()=>fs.lstatSync(root),e=>e.code==='ENOENT');
const runnerEnv=expectedEnv(fixedRunner),childEnv=expectedEnv(fixedDiagnostic);
requireEnvironment(future.environment,fixedRunner);
requireEnvironment(contract.environment,fixedDiagnostic);
assert.equal(future.node.path,'C:\\Program Files\\nodejs\\node.exe');
assert.equal(future.node.bytes,100097864);
assert.equal(future.node.sha256,'14319838b3f355e0398c13569a90270bce4fc68f25189f58c59b03dadae0e6d5');
requireLaunch({node:future.node,entry:future.entry,argv:future.argv,cwd:future.cwd,inheritEnvironment:future.inheritEnvironment});
assert.equal(Object.keys(future.environment).length,10);
assert.equal(future.gate,'RUN=true only in proposal txt, derived from corrected entry with embedded transformed bindings hash');
assert.deepEqual(future.childContract,base.contract);
assert.deepEqual(future.amendment,base.amendment);
assert.equal(contract.root,fixedDiagnostic);
assert.equal(contract.cwd,fixedDiagnostic);
assert.deepEqual(contract.argv,['-NoLogo','-NoProfile','-NonInteractive','-File',`${fixedDiagnostic}\\diagnostic.ps1`,'-InputPath',`${fixedDiagnostic}\\input.json`]);
assert.equal(contract.inheritEnvironment,false);
assert.equal(Object.keys(contract.environment).length,10);
requireLimits(contract.limits);
assert.equal(contract.executable.path,'C:\\Users\\jonku\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\powershell\\pwsh.exe');
assert.equal(contract.executable.bytes,301368);
assert.equal(contract.executable.sha256,'362a356ce7f0940ec74f73a8fc2c990a2cc24a38a11c90bbd8eca947110ad139');
assert.equal(contract.inputs.length,2);
assert.equal(json(path.join(corrected,'amendment.json')).inventory.limits.entries,10);

// In-memory mutations exercise the same exact validators without creating either fixed root.
for(const key of Object.keys(runnerEnv)){
  const changed={...runnerEnv,[key]:runnerEnv[key]+'-changed'};
  rejects(()=>requireEnvironment(changed,fixedRunner),`outer env ${key}`);
  const childChanged={...childEnv,[key]:childEnv[key]+'-changed'};
  rejects(()=>requireEnvironment(childChanged,fixedDiagnostic),`child env ${key}`);
}
for(const changed of [
  Object.fromEntries(Object.entries(runnerEnv).slice(1)),
  {...runnerEnv,EXTRA:'x'}
]) rejects(()=>requireEnvironment(changed,fixedRunner),'missing/extra outer env key');
for(const changed of [
  expectedRows.slice(1),
  [...expectedRows,{...expectedRows[4]}],
  [...expectedRows].reverse(),
  expectedRows.map((r,i)=>i===0?{...r,destination:destination('wrong.mjs')}:r),
  expectedRows.map((r,i)=>i===1?{...r,bytes:r.bytes+1}:r),
  expectedRows.map((r,i)=>i===2?{...r,sha256:'0'.repeat(64)}:r),
  expectedRows.map((r,i)=>i===3?{...r,mode:'overwrite'}:r)
]) rejects(()=>requireRows(changed),'row omission/extra/order/path/size/hash/mode');
for(const row of [...Object.values(base).filter(v=>v&&typeof v==='object'&&!Array.isArray(v)),...base.rows]){
  const original=read(row.path),mutated=Buffer.from(original);mutated[0]^=1;
  rejects(()=>requireBoundBytes(mutated,row.bytes,row.sha256,row.path),'source/tool byte mutation');
}
for(const changed of [
  {...expectedLaunch,argv:[destination('wrong.mjs')]},
  {...expectedLaunch,cwd:'C:\\wrong'},
  {...expectedLaunch,inheritEnvironment:true},
  {...expectedLaunch,entry:{...expectedLaunch.entry,sha256:'0'.repeat(64)}},
  {...expectedLaunch,node:{...expectedLaunch.node,path:'C:\\wrong\\node.exe'}}
]) rejects(()=>requireLaunch(changed),'launch identity/argv/cwd/environment inheritance');
for(const key of Object.keys(expectedLimits)) rejects(()=>requireLimits({...expectedLimits,[key]:expectedLimits[key]+1}),`limit ${key}`);
for(const dirs of [expectedDirectories.slice(1),[...expectedDirectories,'extra'],[...expectedDirectories].reverse(),expectedDirectories.map((d,i)=>i===0?'wrong':d)]) rejects(()=>requireDirectories(dirs),'runner directory omission/extra/order/path');
rejects(()=>requireRoots(fixedRunner+'-other',fixedDiagnostic),'runner root drift');
rejects(()=>requireRoots(fixedRunner,fixedDiagnostic+'-other'),'diagnostic root drift');
rejects(()=>assert.deepEqual({...expectedAliasPolicy,scope:'broad scan'},expectedAliasPolicy),'alias policy broadening');
rejects(()=>assert.deepEqual(material.protocol.slice(1),expectedStagingProtocol),'missing staging protocol step');
rejects(()=>assert.deepEqual(read(ready('enabled-bindings.json.txt')),Buffer.concat([expectedBindingBytes,Buffer.from(' ')])),'binding trailing byte');
rejects(()=>assert.deepEqual(read(ready('enabled-entry.mjs.txt')),Buffer.concat([expectedEntry,Buffer.from(' ')])),'entry trailing byte');
rejects(()=>assert.deepEqual(Buffer.concat([childContractArtifact,Buffer.from(' ')]),contractBytes),'child contract tampering');

console.log(JSON.stringify({acceptedSourceRows:11,runnerCopies:5,runnerDirectories:5,diagnosticInputs:2,independentLiteralTransforms:2,syntheticMutationControls:syntheticControls,rootsAbsent:true,executionAuthorized:false,passed:true}));
