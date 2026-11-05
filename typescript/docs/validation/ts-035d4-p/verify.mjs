// Read-only verifier. --applied is for the separately accepted future D4 lane.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url);
const read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(readFileSync(new URL(p,here))),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const m=json('proposal-manifest.json'),p=json('old-test-proposals.json'),audit=json('audit.json'),matrix=json('semantic-matrix.json');
assert.equal(m.base,'257f7fa');assert.equal(p.base,m.base);assert.equal(m.entries.length,p.entries.length);
const pm=new Map(p.entries.map(e=>[e.path,e]));assert.equal(pm.size,p.entries.length);
const blobs=new Map(git('ls-tree','-r',m.base).split('\n').map(l=>{const [a,b]=l.split('\t');return[b,a.split(' ')[2]];}));
const applied=process.argv.includes('--applied');let changed=0;
for(const e of m.entries){const proposal=pm.get(e.path);assert(proposal);assert.equal(proposal.encoding,'base64');
 const original=Buffer.from(proposal.originalBytes,'base64'),result=Buffer.from(proposal.resultBytes,'base64');
 assert.equal(original.toString('base64'),proposal.originalBytes);assert.equal(result.toString('base64'),proposal.resultBytes);
 assert.equal(hash(original),e.originalSha256);assert.equal(hash(result),e.resultSha256);assert.equal(original.length,e.originalLength);assert.equal(result.length,e.resultLength);
 const gitBytes=Buffer.from(proposal.baseGitBytes,'base64');assert.equal(gitBytes.toString('base64'),proposal.baseGitBytes);
 assert.equal(original.toString().replaceAll('\r\n','\n'),gitBytes.toString().replaceAll('\r\n','\n'),e.path);
 assert.equal(hash(gitBytes),e.baseGitSha256);assert.equal(e.gitBlob,blobs.get(e.path));assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+gitBytes.length+'\0'),gitBytes])).digest('hex'),e.gitBlob);
 assert.deepEqual(read(e.path),applied?result:original,e.path+' whole-file drift');
 if(e.resultSha256!==e.originalSha256){changed++;assert.deepEqual(readFileSync(new URL('proposed/'+e.path,here)),result);}
}
assert.equal(changed,4);
if(!applied){
 for(const x of [...audit.protectedInventory,...audit.sources,...audit.artifacts])assert.equal(hash(read(x.path)),x.sha256,x.path);
 const owned=p=>p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p==='typescript/docs/script-strict-parameter-dispatch.md'||p.startsWith('typescript/docs/validation/ts-035d4-p/');
 for(const list of [git('diff',m.base,'--name-only'),git('ls-files','--others','--exclude-standard')])assert.deepEqual(list.split('\n').filter(Boolean).filter(p=>!owned(p)),[]);
 const prefix=t=>t.split('### TS-035D4-P')[0].replaceAll('\r\n','\n');assert.equal(prefix(read('typescript/TASKS.md').toString()),prefix(git('show',m.base+':typescript/TASKS.md')));
}
assert.equal(matrix.rows.length,193);assert.equal(audit.planned.length,60);assert(audit.planned.every(r=>r.blockers.length));
const inherited=json('inherited-expectations.json');assert.equal(Object.keys(inherited.D2).length,7);assert.equal(Object.keys(inherited.D3).length,28);
for(const r of matrix.rows){assert.equal(hash(r.text),r.sha256);assert.equal(r.sourceUnits,r.text.length);assert.equal(r.contexts.length,4);
 if(r.selected){assert.equal(r.text.slice(r.selected.start,r.selected.start+r.selected.name.length),r.selected.name);assert.equal(r.futurePreparation.rejection.ruleCode,r.selected.ruleCode);assert.equal(r.current.D2.rejection.capabilityCode,'parse.duplicate-parameter');}
 else assert.deepEqual(r.futurePreparation,r.current.D2);
}
for(const [name,id] of [['alpha','D3/R0'],['beta','D3/R1']])assert.equal(readFileSync(new URL('inputs/'+name+'.js',here),'utf8'),matrix.rows.find(r=>r.id===id).text);
console.log(JSON.stringify({wholeFiles:m.entries.length,exactMigrations:changed,protected:applied?'future check separate':audit.protectedInventory.length,rows:193,all60Blocked:true,applied}));
