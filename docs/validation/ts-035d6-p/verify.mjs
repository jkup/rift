import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url);
const read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(readFileSync(new URL(p,here))),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:128*1024*1024}).trim();
const m=json('proposal-manifest.json'),p=json('old-test-proposals.json'),a=json('audit.json');
assert.equal(m.base,'335663fcddf5bfc595369c6a8f68b584a9165e0f');assert.equal(m.base,p.base);
const blobs=new Map(git('ls-tree','-r',m.base).split('\n').map(l=>{const [a,b]=l.split('\t');return [b,a.split(' ')[2]];}));
const inventory=[...blobs.keys()].filter(p=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&(/\.test\.mjs$|\.integration\.mjs$/.test(p))||p.startsWith('typescript/docs/validation/')&&p.endsWith('.mjs'));
assert.deepEqual(m.entries.map(e=>e.path),inventory);assert.deepEqual(p.entries.map(e=>e.path),inventory);
const applied=process.argv.includes('--applied');let migrations=0;
for(const [i,e] of m.entries.entries()){
 const v=p.entries[i],b=Buffer.from(v.baseGitBytes,'base64');assert.equal(hash(b),e.baseGitSha256);assert.equal(e.gitBlob,blobs.get(e.path));
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex'),e.gitBlob);
 for(const [bytes,sha,length] of [['originalBytes','originalSha256','originalLength'],['resultBytes','resultSha256','resultLength']]){const d=Buffer.from(v[bytes],'base64');assert.equal(d.toString('base64'),v[bytes]);assert.equal(hash(d),e[sha]);assert.equal(d.length,e[length]);}
 assert.equal(Buffer.from(v.originalBytes,'base64').toString().replaceAll('\r\n','\n'),b.toString().replaceAll('\r\n','\n'));
 assert.deepEqual(read(e.path),Buffer.from(applied?v.resultBytes:v.originalBytes,'base64'),e.path+' complete file');
 if(v.originalBytes!==v.resultBytes){migrations++;assert.deepEqual(readFileSync(new URL('proposed/'+e.path,here)),Buffer.from(v.resultBytes,'base64'));}
}
assert.equal(migrations,4);
if(!applied){
 for(const e of [...a.protectedInventory,...a.artifacts])assert.equal(hash(read(e.path)),e.sha256,e.path);
 const owned=p=>p==='typescript/TASKS.md'||p==='typescript/COORDINATION.md'||p==='typescript/docs/script-assignment-target-dispatch.md'||p.startsWith('typescript/docs/validation/ts-035d6-p/');
 for(const listing of [git('diff',m.base,'--name-only'),git('ls-files','--others','--exclude-standard')])assert.deepEqual(listing.split('\n').filter(Boolean).filter(p=>!owned(p)),[]);
 const before=t=>t.split('### TS-035D6-P')[0].replaceAll('\r\n','\n');assert.equal(before(read('typescript/TASKS.md').toString()),before(git('show',m.base+':typescript/TASKS.md')));
}
for(const r of json('semantic-matrix.json').rows){assert.equal(hash(r.text),r.sha256);assert.equal(r.text.length,r.sourceUnits);assert.deepEqual(r.audit,r.expected);if(r.audit.kind!=='eligible')assert.deepEqual(r.futurePreparation,r.current.preparation);for(const c of r.contexts)assert.deepEqual(JSON.parse(c.ascii),c.expected);}
assert.equal(a.planned.length,60);assert(a.planned.every(r=>r.blockers.length));
console.log(JSON.stringify({wholeFiles:m.entries.length,migrations,protected:a.protectedInventory.length,applied,all60Blocked:true}));
