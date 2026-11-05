import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='335663fcddf5bfc595369c6a8f68b584a9165e0f';
const read=p=>readFileSync(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:128*1024*1024});
const changes=new Map();
function edit(path,from,to,count=1){const text=changes.get(path)??read(path).toString();assert.equal(text.split(from).length,count+1,path);changes.set(path,text.replaceAll(from,to));}
edit('typescript/tools/test262/script-observe-codec.test.mjs',"ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter'])","ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter','assignment-target'])");
edit('typescript/docs/validation/ts-035d2-p/verify-future-wire.mjs',"if(m.id==='parameter-rule')","if(m.id==='parameter-rule'||m.id==='assignment-rule')",2);
const d4='typescript/docs/validation/ts-035d4-p/wire.mjs';
edit(d4,"set(c,m.childPath,m.value);assert.throws(()=>decodeChild(c),r.id+'/'+m.id);","set(c,m.childPath,m.value);if(m.id==='assignment-rule'&&future)assert.deepEqual(decodeChild(c),c,r.id+'/'+m.id);else assert.throws(()=>decodeChild(c),r.id+'/'+m.id);");
edit(d4,"set(e,m.envelopePath,m.value);assert.throws(()=>decodeEnvelope(e),r.id+'/'+m.id);","set(e,m.envelopePath,m.value);if(m.id==='assignment-rule'&&future)assert.deepEqual(decodeEnvelope(e),e,r.id+'/'+m.id);else assert.throws(()=>decodeEnvelope(e),r.id+'/'+m.id);");
edit('typescript/docs/validation/ts-035d5/validate.mjs',"assert.deepEqual(actual.ordinary,row.current,row.id+' seven ordinary outputs');","const expectedOrdinary={...row.current,preparation:row.futurePreparation};assert.deepEqual(actual.ordinary,expectedOrdinary,row.id+' six ordinary outputs plus reviewed rejection-only preparation');");
const tree=git('ls-tree','-r',base).toString().trim().split('\n').map(l=>{const [a,path]=l.split('\t');return {path,blob:a.split(' ')[2]};});
const inventory=tree.filter(({path:p})=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&(/\.test\.mjs$|\.integration\.mjs$/.test(p))||p.startsWith('typescript/docs/validation/')&&p.endsWith('.mjs'));
// One binary-safe batch preserves Git bytes, including CRLF fixture attributes.
const batch=execFileSync('git',['cat-file','--batch'],{cwd:root,input:inventory.map(e=>e.blob).join('\n')+'\n',maxBuffer:128*1024*1024});let offset=0;
const proposals=[],manifest=[];
for(const {path,blob} of inventory){
 const end=batch.indexOf(10,offset),header=batch.subarray(offset,end).toString().split(' '),size=Number(header[2]);assert.equal(header[0],blob);assert.equal(header[1],'blob');
 const gitBytes=batch.subarray(end+1,end+1+size);offset=end+size+2;
 const original=read(path),result=changes.has(path)?Buffer.from(changes.get(path)):original;
 assert.equal(original.toString().replaceAll('\r\n','\n'),gitBytes.toString().replaceAll('\r\n','\n'),path);
 proposals.push({path,encoding:'base64',baseGitBytes:gitBytes.toString('base64'),originalBytes:original.toString('base64'),resultBytes:result.toString('base64')});
 manifest.push({path,intent:changes.has(path)?'exact future emission migration':'identity',gitBlob:blob,baseGitSha256:hash(gitBytes),originalSha256:hash(original),resultSha256:hash(result),originalLength:original.length,resultLength:result.length});
 if(changes.has(path)){const dest=new URL('proposed/'+path,here);mkdirSync(new URL('./',dest),{recursive:true});writeFileSync(dest,result);}
}
assert.equal(offset,batch.length);for(const path of changes.keys())assert(inventory.some(e=>e.path===path));
for(const [name,entries] of [['old-test-proposals',proposals],['proposal-manifest',manifest]])writeFileSync(new URL(name+'.json',here),JSON.stringify({base,claim:'Complete future old-file results; four migrations, all other files byte-identical. No proposal applied.',entries},null,2)+'\n');
console.log(JSON.stringify({wholeFiles:manifest.length,migrations:changes.size}));
