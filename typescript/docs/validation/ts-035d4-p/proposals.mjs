import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),base='257f7fa';
const read=p=>readFileSync(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024});
const changes=new Map();
function edit(path,from,to){let text=changes.get(path)??read(path).toString();assert.equal(text.split(from).length,2,path+' exact unique edit');changes.set(path,text.replace(from,to));}
const c='typescript/tools/test262/script-observe-codec.test.mjs';
edit(c,'C predicates and D2 closed rule additions','C predicates and D2/D4 closed rule additions');
edit(c,"const ruleTo=\"ruleCode:one(['return-outside-function','duplicate-block-lexical-function'])\";","const ruleTo=\"ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter'])\";");
const d2='typescript/docs/validation/ts-035d2/validate.mjs';
edit(d2,"mkdirSync('build/ts035d2-inputs'","const d4=JSON.parse(readFileSync('docs/validation/ts-035d4-p/inherited-expectations.json')).D2;\r\nmkdirSync('build/ts035d2-inputs'");
edit(d2,"assert.deepEqual(actual.preparation,row.futurePreparation,row.id+' preparation');","const migration=d4[row.id]; if(migration)assert.equal(row.text,migration.text,row.id+' exact D4 source');\r\n assert.deepEqual(actual.preparation,migration?migration.preparation:row.futurePreparation,row.id+' preparation');");
edit(d2,'row.contexts.entries()','(migration?migration.contexts:row.contexts).entries()');
const d3='typescript/docs/validation/ts-035d3/validate.mjs';
edit(d3,"const blockedDiagnostics=","const d4=JSON.parse(readFileSync('docs/validation/ts-035d4-p/inherited-expectations.json')).D3;\r\nconst blockedDiagnostics=");
edit(d3,"assert.deepEqual(result.ordinary,row.ordinary,'ordinary '+row.id);","const migration=d4[row.id]; if(migration)assert.equal(row.text,migration.text,row.id+' exact D4 source');\r\n const expectedOrdinary=migration?{...row.ordinary,D2:migration.preparation}:row.ordinary;\r\n assert.deepEqual(result.ordinary,expectedOrdinary,'ordinary '+row.id);");
const wire='typescript/docs/validation/ts-035d2-p/verify-future-wire.mjs';
edit(wire,"set(c,m.childPath,m.value);assert.throws(()=>parseChild(c),r.id+'/'+m.id);mutations++;","set(c,m.childPath,m.value);\r\n  if(m.id==='parameter-rule')assert.deepEqual(parseChild(c),c,r.id+'/'+m.id+' reviewed D4 code');\r\n  else assert.throws(()=>parseChild(c),r.id+'/'+m.id);mutations++;");
edit(wire,"set(e,m.envelopePath,m.value);assert.throws(()=>parseFull(e),r.id+'/'+m.id);mutations++;","set(e,m.envelopePath,m.value);\r\n   if(m.id==='parameter-rule')assert.deepEqual(parseFull(e),e,r.id+'/'+m.id+' reviewed D4 code');\r\n   else assert.throws(()=>parseFull(e),r.id+'/'+m.id);mutations++;");
const paths=git('ls-tree','-r','--name-only',base).toString().trim().split('\n');
const inventory=paths.filter(p=>p.startsWith('typescript/test/')||p.startsWith('typescript/tools/test262/')&&(/\.test\.mjs$|\.integration\.mjs$/.test(p))||p.startsWith('typescript/docs/validation/')&&p.endsWith('.mjs'));
const proposals=[],manifest=[];
for(const path of inventory){
 const original=read(path),gitBytes=git('show',base+':'+path),result=changes.has(path)?Buffer.from(changes.get(path)):original;
 assert.equal(original.toString().replaceAll('\r\n','\n'),gitBytes.toString().replaceAll('\r\n','\n'),path);
 proposals.push({path,encoding:'base64',baseGitBytes:gitBytes.toString('base64'),originalBytes:original.toString('base64'),resultBytes:result.toString('base64')});
 manifest.push({path,intent:changes.has(path)?'exact proposed D4 migration; review required':'identity',gitBlob:git('rev-parse',base+':'+path).toString().trim(),baseGitSha256:hash(gitBytes),originalSha256:hash(original),resultSha256:hash(result),originalLength:original.length,resultLength:result.length});
 if(changes.has(path)){const dest=new URL('proposed/'+path,here);mkdirSync(new URL('./',dest),{recursive:true});writeFileSync(dest,result);}
}
for(const path of changes.keys())assert(inventory.includes(path));
for(const [name,entries] of [['old-test-proposals',proposals],['proposal-manifest',manifest]])writeFileSync(new URL(name+'.json',here),JSON.stringify({base,entries},null,2)+'\n');
console.log(JSON.stringify({wholeFiles:manifest.length,identity:manifest.length-changes.size,migrations:[...changes.keys()]}));
