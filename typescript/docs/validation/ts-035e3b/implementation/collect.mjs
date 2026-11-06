import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync,mkdirSync,copyFileSync,cpSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve,dirname} from 'node:path';
const here=import.meta.dirname,root=resolve(here,'../../../..'),{sandbox}=JSON.parse(readFileSync(join(here,'run-location.json'))),hash=b=>createHash('sha256').update(b).digest('hex');
const initial=JSON.parse(readFileSync(join(here,'stages.json'))),resumed=JSON.parse(readFileSync(join(here,'resume-stages.json')));
assert.deepEqual(initial.map(r=>[r.name,r.status]),[['node-build',0],['native-build',0],['producer',0],['guest-node',1]]);
const stages=[...initial.slice(0,3),...resumed];assert.equal(stages.length,40);assert(stages.every(r=>r.status===0&&r.signal===null&&r.error===null));
writeFileSync(join(here,'final-stages.json'),JSON.stringify(stages,null,2)+'\n',{flag:'wx'});
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v!==null&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
const key=v=>JSON.stringify(canonical(v));
const expected=JSON.parse(readFileSync(join(root,'docs/validation/ts-035e3b-p/future-wire-literals.json'))),producerDirs=readdirSync(join(sandbox,'build')).filter(n=>/^producer-[A-Za-z0-9]{6}$/.test(n));
assert.equal(expected.length,66);assert.equal(producerDirs.length,74);
assert(!existsSync(join(here,'producer-artifacts')));mkdirSync(join(here,'producer-artifacts'));
const children=[],artifacts=[];
for(const dir of producerDirs){
 const base=join(sandbox,'build',dir),child=join(base,'child.json');
 if(existsSync(child)&&lstatSync(child).isFile()&&readFileSync(child,'utf8')!=='original'){
  const bytes=readFileSync(child),record=JSON.parse(bytes);children.push({directory:dir,sha256:hash(bytes),record,compatibleLiteralIds:expected.filter(r=>key(r.expected)===key(record)).map(r=>r.id)});
 }
 cpSync(base,join(here,'producer-artifacts',dir),{recursive:true,errorOnExist:true,force:false});
 for(const name of readdirSync(base)){const path=join(base,name),stat=lstatSync(path);assert(!stat.isSymbolicLink());artifacts.push({directory:dir,name,kind:stat.isDirectory()?'directory':'file',sha256:stat.isFile()?hash(readFileSync(path)):null});}
}
assert.equal(children.length,66);assert.deepEqual(children.map(r=>key(r.record)).sort(),expected.map(r=>key(r.expected)).sort());
const negatives=readdirSync(join(sandbox,'build')).filter(n=>n.startsWith('producer-negative-')),spoofs=readdirSync(join(sandbox,'build')).filter(n=>n.startsWith('producer-record-spoof-'));
assert.equal(negatives.length,114);assert.equal(spoofs.length,8);
for(const dir of [...negatives,...spoofs]){assert(!existsSync(join(sandbox,'build',dir,'child.json')));cpSync(join(sandbox,'build',dir),join(here,'producer-artifacts',dir),{recursive:true,errorOnExist:true,force:false});}
writeFileSync(join(here,'producer-artifacts.json'),JSON.stringify({children,artifacts,negativeDirectories:negatives,spoofDirectories:spoofs,claim:'Exact frozen test asserts lane/process results; raw child multiset independently matches all 66 complete literals. Matching IDs may be nonunique across lane-identical records.'},null,2)+'\n',{flag:'wx'});
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const copied=JSON.parse(readFileSync(join(here,'copied-inputs.json'))),prior=new Map(copied.map(r=>[r.path,r.sha256])),inherited=[];
// Retain fresh output provenance even when a deterministic replay reproduces
// exactly the historical bytes. Only outputs of stages above are forced here.
const forced=new Set([
 ...['node-alpha.jsonl','node-beta.jsonl','native-alpha.jsonl','native-beta.jsonl','serializer-results.json'].map(n=>'docs/validation/ts-035a/'+n),
 ...[1,2,3,4,5].map(n=>'docs/validation/ts-035d'+n+'/matrix-results.json'),
 'docs/validation/ts-035d6/source-results.json','docs/validation/ts-035d7/matrix-results.json.gz','docs/validation/ts-035d8/source-results.json',
 ...[2,4,6,8].map(n=>'docs/validation/ts-035d'+n+'/wire-results.json'),
 'docs/validation/ts-035d1/extra-results.json','docs/validation/ts-035d2/extra-results.json','docs/validation/ts-035d4/controls-results.json','docs/validation/ts-035d4/metadata-results.json',
 'docs/validation/ts-035b/inspection-results.json','docs/validation/ts-035b/boundary-results.json','docs/validation/ts-034h7/bundle-results.json',
 'docs/validation/ts-035d5-p/oracle-controls.json','docs/validation/ts-035c/integration-latest.json',
]);
for(const path of files(join(sandbox,'docs/validation'))){
 const relative=path.slice(sandbox.length+1),bytes=readFileSync(path),sha256=hash(bytes);
 if(forced.has(relative.replaceAll('\\','/'))||prior.get(join(root,relative))!==sha256){const target=join(here,'inherited',relative);mkdirSync(dirname(target),{recursive:true});copyFileSync(path,target);inherited.push({path:relative,sha256,originalSha256:prior.get(join(root,relative))??null});}
}
for(const row of copied){
 assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
 const relative=row.path.slice(root.length+1);
 if(!relative.replaceAll('\\','/').startsWith('docs/validation/'))assert.equal(hash(readFileSync(join(sandbox,relative))),row.sha256,'sandbox input '+relative);
}
for(const row of JSON.parse(readFileSync(join(here,'fresh-native-outputs.json'))))assert.equal(hash(readFileSync(join(sandbox,'build/native',row.binary))),row.sha256,row.binary);
const repair=JSON.parse(readFileSync(join(here,'sandbox-input-repair.json')));assert.equal(hash(readFileSync(repair.source)),repair.sha256);assert.equal(hash(readFileSync(repair.target)),repair.sha256);
assert(!existsSync(join(sandbox,'src/script-producer-request.ts')));assert(!existsSync(join(sandbox,'build/node/src/script-producer-request.js')));
writeFileSync(join(here,'completion.json'),JSON.stringify({stages:stages.length,originalInputsUnchanged:copied.length,producerLiterals:66,driverNegatives:114,lateFailures:8,recordSpoofs:8,sourceModuleAbsent:true,generatedModuleAbsent:true,inherited},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({stages:stages.length,originalInputsUnchanged:copied.length,children:children.length,negatives:negatives.length,spoofs:spoofs.length,inherited:inherited.length}));
