import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='267e4e8';
const read=p=>readFileSync(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024});
const changes=new Map();
function edit(path,from,to,count=1){const text=changes.get(path)??read(path).toString();assert.equal(text.split(from).length,count+1,path);changes.set(path,text.replaceAll(from,to));}
const c='typescript/tools/test262/script-observe-codec.test.mjs';
edit(c,"ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter'])","ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter','assignment-target'])");
const d2='typescript/docs/validation/ts-035d2-p/verify-future-wire.mjs';
edit(d2,"if(m.id==='parameter-rule')","if(m.id==='parameter-rule'||m.id==='assignment-rule')",2);
const d4='typescript/docs/validation/ts-035d4-p/wire.mjs';
edit(d4,'set(c,m.childPath,m.value);assert.throws(()=>decodeChild(c),r.id+\'/\'+m.id);','set(c,m.childPath,m.value);if(m.id===\'assignment-rule\'&&future)assert.deepEqual(decodeChild(c),c,r.id+\'/\'+m.id);else assert.throws(()=>decodeChild(c),r.id+\'/\'+m.id);');
edit(d4,'set(e,m.envelopePath,m.value);assert.throws(()=>decodeEnvelope(e),r.id+\'/\'+m.id);','set(e,m.envelopePath,m.value);if(m.id===\'assignment-rule\'&&future)assert.deepEqual(decodeEnvelope(e),e,r.id+\'/\'+m.id);else assert.throws(()=>decodeEnvelope(e),r.id+\'/\'+m.id);');
const paths=git('ls-tree','-r','--name-only',base).toString().trim().split('\n');
const inventory=paths.filter(p=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&(/\.test\.mjs$|\.integration\.mjs$/.test(p))||p.startsWith('typescript/docs/validation/')&&p.endsWith('.mjs'));
const proposals=[],manifest=[];
for(const path of inventory){const original=read(path),gitBytes=git('show',base+':'+path),emission=changes.has(path)?Buffer.from(changes.get(path)):original;
 assert.equal(original.toString().replaceAll('\r\n','\n'),gitBytes.toString().replaceAll('\r\n','\n'),path);
 proposals.push({path,encoding:'base64',baseGitBytes:gitBytes.toString('base64'),originalBytes:original.toString('base64'),resultBytes:original.toString('base64'),emissionBytes:emission.toString('base64')});
 manifest.push({path,intent:'D5 non-emitting identity',gitBlob:git('rev-parse',base+':'+path).toString().trim(),baseGitSha256:hash(gitBytes),originalSha256:hash(original),resultSha256:hash(original),emissionSha256:hash(emission),originalLength:original.length,resultLength:original.length,emissionLength:emission.length});
 if(changes.has(path)){const dest=new URL('proposed-emission/'+path,here);mkdirSync(new URL('./',dest),{recursive:true});writeFileSync(dest,emission);}
}
for(const p of changes.keys())assert(inventory.includes(p));
for(const [name,entries] of [['old-test-proposals',proposals],['proposal-manifest',manifest]])writeFileSync(new URL(name+'.json',here),JSON.stringify({base,claim:'D5 all identity; three separate future emission proposals require fresh acceptance after D5.',entries},null,2)+'\n');
console.log(JSON.stringify({wholeFiles:manifest.length,D5migrations:0,futureEmissionMigrations:changes.size}));
