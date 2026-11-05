import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url);
const read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(readFileSync(new URL(p,here))),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const m=json('proposal-manifest.json'),p=json('old-test-proposals.json'),a=json('audit.json'),s=json('semantic-matrix.json');
assert.equal(m.base,'267e4e8');assert.equal(m.base,p.base);assert.equal(m.entries.length,p.entries.length);
const pm=new Map(p.entries.map(e=>[e.path,e]));assert.equal(pm.size,p.entries.length);
const blobs=new Map(git('ls-tree','-r',m.base).split('\n').map(l=>{const [a,b]=l.split('\t');return[b,a.split(' ')[2]];}));
const expectedPaths=[...blobs.keys()].filter(p=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&(/\.test\.mjs$|\.integration\.mjs$/.test(p))||p.startsWith('typescript/docs/validation/')&&p.endsWith('.mjs'));
assert.deepEqual(m.entries.map(e=>e.path),expectedPaths);
const emission=process.argv.includes('--emission-applied'),implementation=process.argv.includes('--audit-implemented');let changes=0;
for(const e of m.entries){const v=pm.get(e.path);assert(v);assert.equal(v.encoding,'base64');const b=Buffer.from(v.baseGitBytes,'base64');assert.equal(hash(b),e.baseGitSha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex'),e.gitBlob);assert.equal(e.gitBlob,blobs.get(e.path));
 for(const [bytes,sha,length] of [['originalBytes','originalSha256','originalLength'],['resultBytes','resultSha256','resultLength'],['emissionBytes','emissionSha256','emissionLength']]){const decoded=Buffer.from(v[bytes],'base64');assert.equal(decoded.toString('base64'),v[bytes]);assert.equal(hash(decoded),e[sha]);assert.equal(decoded.length,e[length]);}
 assert.equal(Buffer.from(v.originalBytes,'base64').toString().replaceAll('\r\n','\n'),b.toString().replaceAll('\r\n','\n'),e.path+' Git/checkout');
 assert.equal(v.originalBytes,v.resultBytes);assert.deepEqual(read(e.path),Buffer.from(emission?v.emissionBytes:v.resultBytes,'base64'),e.path);
 if(v.emissionBytes!==v.originalBytes){changes++;assert.deepEqual(readFileSync(new URL('proposed-emission/'+e.path,here)),Buffer.from(v.emissionBytes,'base64'));}
}
assert.equal(changes,3);
if(!emission&&!implementation){for(const e of [...a.protectedInventory,...a.artifacts])assert.equal(hash(read(e.path)),e.sha256,e.path);
 const owned=p=>['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/script-assignment-target-rule.md'].includes(p)||p.startsWith('typescript/docs/validation/ts-035d5-p/');
 for(const list of [git('diff',m.base,'--name-only'),git('ls-files','--others','--exclude-standard')])assert.deepEqual(list.split('\n').filter(Boolean).filter(p=>!owned(p)),[]);
 const prefix=t=>t.split('### TS-035D5-P')[0].replaceAll('\r\n','\n');assert.equal(prefix(read('typescript/TASKS.md').toString()),prefix(git('show',m.base+':typescript/TASKS.md')));
}
for(const r of s.rows){assert.equal(hash(r.text),r.sha256);assert.equal(r.text.length,r.sourceUnits);if(r.expected.kind==='eligible')for(const c of r.expected.candidates){assert.equal(r.text.slice(c.target.start,c.target.end),c.target.text);assert.equal(r.text.slice(c.operator.start,c.operator.end),c.operator.text);}}
const blocked=json('blocked-expectations.json');assert.equal(blocked.rows.length,56);
for(const r of blocked.rows){const row=s.rows.find(x=>x.id===r.id);assert.equal(row.text,r.text);assert.deepEqual(row.expected,r.expected);}
for(const r of json('original-blocked-oracle/manifest.json'))assert.equal(hash(readFileSync(new URL('original-blocked-oracle/'+r.name,here))),r.sha256);
assert.equal(a.planned.length,60);assert(a.planned.every(r=>r.blockers.length));
console.log(JSON.stringify({wholeFiles:m.entries.length,D5migrations:0,futureEmissionMigrations:changes,protected:a.protectedInventory.length,rows:s.rows.length,all60Blocked:true,emission,implementation}));
