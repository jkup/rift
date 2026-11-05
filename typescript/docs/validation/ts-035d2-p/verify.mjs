// Read-only whole-file verifier. Never applies a proposal to a real old test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url);
const read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(readFileSync(new URL(p,here)));
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=json('proposal-manifest.json'),proposals=json('old-test-proposals.json'),audit=json('audit.json');
assert.equal(manifest.base,'62a8787');assert.equal(proposals.base,manifest.base);
assert.equal(proposals.entries.length,manifest.entries.length);
const proposalMap=new Map(proposals.entries.map(p=>[p.path,p]));assert.equal(proposalMap.size,proposals.entries.length);
const tree=execFileSync('git',['ls-tree','-r',manifest.base],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
const blobs=new Map(tree.trim().split('\n').map(line=>{const [meta,path]=line.split('\t');return[path,meta.split(' ')[2]];}));
for(const entry of manifest.entries){
 const proposal=proposalMap.get(entry.path);assert.ok(proposal,entry.path);
 assert.equal(proposal.encoding,'base64');const bytes=Buffer.from(proposal.bytes,'base64');
 assert.equal(bytes.toString('base64'),proposal.bytes,'canonical whole-file encoding');
 assert.equal(entry.gitBlob,blobs.get(entry.path),entry.path+' base blob');
 assert.equal(hash(bytes),entry.resultSha256,entry.path+' proposed hash');
 assert.equal(entry.resultSha256,entry.originalSha256,entry.path+' identity proposal');
 assert.equal(bytes.length,entry.byteLength,entry.path+' full length');
 assert.deepEqual(read(entry.path),bytes,entry.path+' no unapproved whole-file changes');
 // The repository's text files use LF in Git and CRLF in this checkout.
 const normalized=Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
 assert.equal(hash(normalized),entry.baseGitSha256,entry.path+' original Git bytes');
 const gitHash=createHash('sha1').update(Buffer.from('blob '+normalized.length+'\0')).update(normalized).digest('hex');
 assert.equal(gitHash,entry.gitBlob,entry.path+' full original content bound to accepted base');
}
if(!process.argv.includes('--old-tests-only')){
 for(const p of audit.protectedInventory)assert.equal(hash(read(p.path)),p.sha256,p.path+' protected byte drift');
 const allowed=p=>p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p==='typescript/docs/script-strict-rule-dispatch.md'||p.startsWith('typescript/docs/validation/ts-035d2-p/');
 const changes=execFileSync('git',['diff',manifest.base,'--name-only'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 assert.deepEqual(changes.filter(p=>!allowed(p)),[]);
 const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 assert.deepEqual(untracked.filter(p=>!allowed(p)),[]);
}
const matrix=json('semantic-matrix.json');assert.equal(matrix.rows.length,90);
for(const [name,id,col] of [['alpha','R0',44],['beta','R1',60]]){
 const row=matrix.rows.find(r=>r.id===id);assert.equal(readFileSync(new URL('inputs/'+name+'.js',here),'utf8'),row.text);
 assert.equal(row.futurePreparation.diagnostic.loc.column,col);
}
for(const r of matrix.rows){
 assert.equal(r.sourceUnits,r.text.length);assert.equal(r.sha256,hash(r.text));
 assert.equal(r.contexts.length,4);
 if(r.audit.kind==='eligible'){
  assert.equal(r.futurePreparation.rejection.ruleCode,'duplicate-block-lexical-function');
  assert.equal(r.ordinary.bounded.kind,'conflict');assert.notEqual(r.ordinary.returns.kind,'complete');
 }else assert.deepEqual(r.futurePreparation,r.ordinary.bounded,r.id+' no semantic relaxation');
}
const wire=json('wire-matrix.json');assert.equal(wire.rows.length,64);
for(const row of wire.rows){assert.deepEqual(JSON.parse(row.ascii),row.child);assert.match(row.ascii,/^[\x20-\x7e]+$/);}
assert.equal(audit.planned.length,60);assert.ok(audit.planned.every(r=>r.blockers.length));
console.log(JSON.stringify({wholeFiles:manifest.entries.length,protectedFiles:process.argv.includes('--old-tests-only')?'not checked':audit.protectedInventory.length,semanticRows:matrix.rows.length,wireRows:wire.rows.length,blocked:60}));
