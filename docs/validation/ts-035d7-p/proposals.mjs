import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='041982113d292a9035ea644bdb3eae104963942f';
const read=f=>readFileSync(new URL(f,root)),hash=b=>createHash('sha256').update(b).digest('hex'),git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:256*1024*1024});
const changes=new Map();
function edit(path,from,to,count=1){const text=changes.get(path)??read(path).toString();assert.equal(text.split(from).length,count+1,path);changes.set(path,text.replaceAll(from,to));}
edit('typescript/tools/test262/script-observe-codec.test.mjs',"ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter','assignment-target'])","ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter','assignment-target','lexical-declaration-statement'])");
edit('typescript/docs/validation/ts-035d2-p/verify-future-wire.mjs',"m.id==='parameter-rule'||m.id==='assignment-rule'","m.id==='parameter-rule'||m.id==='assignment-rule'||m.id==='statement-rule'",2);
const d4='typescript/docs/validation/ts-035d4-p/wire.mjs';
edit(d4,"m.id==='assignment-rule'&&future","(m.id==='assignment-rule'||m.id==='statement-rule')&&future",2);
for(const scope of ['ts-035d5-p','ts-035d6-p']){
 const f='typescript/docs/validation/'+scope+'/wire.mjs';
 edit(f,"set(c,m.childPath,m.value);assert.throws(()=>decodeChild(c),r.id+'/'+m.id);","set(c,m.childPath,m.value);if(m.id==='statement-rule'&&future)assert.deepEqual(decodeChild(c),c,r.id+'/'+m.id);else assert.throws(()=>decodeChild(c),r.id+'/'+m.id);");
 edit(f,"set(e,m.envelopePath,m.value);assert.throws(()=>decodeEnvelope(e),r.id+'/'+m.id);","set(e,m.envelopePath,m.value);if(m.id==='statement-rule'&&future)assert.deepEqual(decodeEnvelope(e),e,r.id+'/'+m.id);else assert.throws(()=>decodeEnvelope(e),r.id+'/'+m.id);");
}
const tree=git('ls-tree','-r',base).toString().trim().split('\n').map(l=>{const [a,path]=l.split('\t');return {path,blob:a.split(' ')[2]};});
const inventory=tree.filter(({path:p})=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&(/\.test\.mjs$|\.integration\.mjs$/.test(p))||p.startsWith('typescript/docs/validation/')&&p.endsWith('.mjs'));
const batch=execFileSync('git',['cat-file','--batch'],{cwd:root,input:inventory.map(e=>e.blob).join('\n')+'\n',maxBuffer:256*1024*1024});let offset=0;const entries=[],manifest=[];
for(const {path,blob} of inventory){const end=batch.indexOf(10,offset),header=batch.subarray(offset,end).toString().split(' '),size=Number(header[2]);assert.equal(header[0],blob);const gitBytes=batch.subarray(end+1,end+size+1);offset=end+size+2;const original=read(path),future=changes.has(path)?Buffer.from(changes.get(path)):original;
 assert.equal(original.toString().replaceAll('\r\n','\n'),gitBytes.toString().replaceAll('\r\n','\n'),path);
 entries.push({path,baseGitBytes:gitBytes.toString('base64'),originalBytes:original.toString('base64'),auditResultBytes:original.toString('base64'),dispatchResultBytes:future.toString('base64')});
 manifest.push({path,gitBlob:blob,baseGitSha256:hash(gitBytes),originalSha256:hash(original),auditSha256:hash(original),dispatchSha256:hash(future),originalLength:original.length,dispatchLength:future.length,intent:changes.has(path)?'identity in D7; exact separately reviewed future dispatch migration':'identity in both stages'});
 if(changes.has(path)){const dest=new URL('proposed/'+path,here);mkdirSync(new URL('./',dest),{recursive:true});writeFileSync(dest,future);}
}
assert.equal(offset,batch.length);assert.equal(changes.size,5);
for(const [file,value] of [['old-test-proposals',entries],['proposal-manifest',manifest]])writeFileSync(new URL(file+'.json',here),JSON.stringify({base,claim:'Complete whole files: zero audit migrations; five future codec migrations. No proposals applied.',entries:value},null,2)+'\n');
console.log(JSON.stringify({wholeFiles:entries.length,auditMigrations:0,futureDispatchMigrations:changes.size}));
