import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),read=f=>readFileSync(new URL(f,root)),json=f=>JSON.parse(readFileSync(new URL(f,here))),hash=b=>createHash('sha256').update(b).digest('hex'),git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const m=json('proposal-manifest.json'),p=json('old-test-proposals.json'),a=json('audit.json');assert.equal(m.base,'041982113d292a9035ea644bdb3eae104963942f');assert.equal(p.base,m.base);
const blobs=new Map(git('ls-tree','-r',m.base).split('\n').map(l=>{const [a,b]=l.split('\t');return [b,a.split(' ')[2]];}));
const inventory=[...blobs.keys()].filter(p=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&(/\.test\.mjs$|\.integration\.mjs$/.test(p))||p.startsWith('typescript/docs/validation/')&&p.endsWith('.mjs'));
assert.deepEqual(m.entries.map(e=>e.path),inventory);assert.deepEqual(p.entries.map(e=>e.path),inventory);let changes=0;
const future=process.argv.includes('--dispatch-applied');
for(const [i,e] of m.entries.entries()){
 const v=p.entries[i],b=Buffer.from(v.baseGitBytes,'base64');assert.equal(e.gitBlob,blobs.get(e.path));assert.equal(hash(b),e.baseGitSha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex'),e.gitBlob);
 for(const [key,sha] of [['originalBytes','originalSha256'],['auditResultBytes','auditSha256'],['dispatchResultBytes','dispatchSha256']]){const bytes=Buffer.from(v[key],'base64');assert.equal(bytes.toString('base64'),v[key]);assert.equal(hash(bytes),e[sha]);}
 assert.equal(v.originalBytes,v.auditResultBytes);assert.equal(Buffer.from(v.originalBytes,'base64').length,e.originalLength);assert.equal(Buffer.from(v.dispatchResultBytes,'base64').length,e.dispatchLength);assert.equal(Buffer.from(v.originalBytes,'base64').toString().replaceAll('\r\n','\n'),b.toString().replaceAll('\r\n','\n'));
 assert.deepEqual(read(e.path),Buffer.from(future?v.dispatchResultBytes:v.originalBytes,'base64'),e.path);
 if(v.originalBytes!==v.dispatchResultBytes){changes++;assert.deepEqual(readFileSync(new URL('proposed/'+e.path,here)),Buffer.from(v.dispatchResultBytes,'base64'));}
}assert.equal(changes,5);
if(!future){for(const e of [...a.protectedInventory,...a.artifacts])assert.equal(hash(read(e.path)),e.sha256,e.path);
 const own=f=>['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/script-lexical-statement-rule.md'].includes(f)||f.startsWith('typescript/docs/validation/ts-035d7-p/');for(const listing of [git('diff',m.base,'--name-only'),git('ls-files','--others','--exclude-standard')])assert.deepEqual(listing.split('\n').filter(Boolean).filter(f=>!own(f)),[]);
 const before=s=>s.split('### TS-035D7-P')[0].replaceAll('\r\n','\n');assert.equal(before(read('typescript/TASKS.md').toString()),before(git('show',m.base+':typescript/TASKS.md')));
}
assert.equal(a.planned.length,60);assert(a.planned.every(r=>r.blockers.length));
for(const r of json('semantic-matrix.json').rows){assert.equal(hash(r.text),r.sha256);assert.equal(r.text.length,r.sourceUnits);if(r.expected.kind!=='eligible')assert.deepEqual(r.futurePreparation,r.current.preparation);for(const c of r.contexts)assert.deepEqual(JSON.parse(c.ascii),c.expected);}
console.log(JSON.stringify({wholeFiles:inventory.length,auditMigrations:0,futureDispatchMigrations:changes,protected:a.protectedInventory.length,all60Blocked:true,future}));
