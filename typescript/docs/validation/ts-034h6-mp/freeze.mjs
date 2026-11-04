// Offline design artifacts only. Never derives expected values from Rift output.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const here=import.meta.dirname,repo=resolve(here,'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
function git(args){const r=spawnSync('git',args,{cwd:repo,maxBuffer:128*1024*1024});assert.equal(r.status,0,r.stderr.toString());return r.stdout;}
function save(p,v){writeFileSync(join(here,p),JSON.stringify(v,null,2)+'\n');}
const base=git(['rev-parse','18011ee']).toString().trim();
const paths=git(['ls-tree','-r','--name-only',base]).toString().trim().split('\n');
const protectedPaths=paths.filter(p=>!['typescript/TASKS.md','typescript/COORDINATION.md'].includes(p));
const batch=spawnSync('git',['cat-file','--batch'],{cwd:repo,input:protectedPaths.map(p=>`${base}:${p}\n`).join(''),maxBuffer:1024*1024*1024});assert.equal(batch.status,0);
let offset=0;const files=protectedPaths.map(path=>{const end=batch.stdout.indexOf(10,offset),size=Number(batch.stdout.subarray(offset,end).toString().split(' ')[2]);assert.ok(Number.isInteger(size));const bytes=batch.stdout.subarray(end+1,end+1+size);offset=end+size+2;return {path,sha256:hash(bytes)};});assert.equal(offset,batch.stdout.length);
save('baseline-hashes.json',{base,files});
const consumers=paths.filter(p=>p.startsWith('typescript/')&&/\.(ts|mjs)$/.test(p)&&!p.startsWith('typescript/docs/')).flatMap(path=>{const text=readFileSync(join(repo,path),'utf8');return /mapObjectDefaultArray|runtime\.map-species|wellKnownSpecies/.test(text)?[{path,sha256:hash(Buffer.from(text)),matches:text.split('\n').flatMap((line,i)=>/mapObjectDefaultArray|runtime\.map-species|unsupported map constructor/.test(line)?[{line:i+1,text:line.replace(/\r$/,'')}]:[])}]:[];});
save('consumer-search.json',{base,pattern:'mapObjectDefaultArray|runtime.map-species|wellKnownSpecies',consumers});
const path='typescript/test/harness-errors-b.ts',before=git(['show',`${base}:${path}`]);
const old='check(thrown(run("species();",r)).origin.kind==="unsupported-operation","species unchanged");';
const replacement='const invalidSpecies=run("species();",r);error(invalidSpecies,r,"TypeError");check(thrown(invalidSpecies).diagnostic.message==="map species is not a constructor"&&calls===0,"invalid species language error before callbacks");';
const start=before.indexOf(old);assert.ok(start>=0);assert.equal(before.indexOf(old,start+1),-1);
const after=Buffer.concat([before.subarray(0,start),Buffer.from(replacement),before.subarray(start+Buffer.byteLength(old))]);
mkdirSync(join(here,'proposed/test'),{recursive:true});mkdirSync(join(here,'baseline/test'),{recursive:true});
writeFileSync(join(here,'proposed/test/harness-errors-b.ts'),after);writeFileSync(join(here,'baseline/test/harness-errors-b.ts'),before);
save('replacement-manifest.json',{base,files:[{path,baseSha256:hash(before),proposedSha256:hash(after),replacements:[{start,end:start+Buffer.byteLength(old),old,new:replacement}]}]});
const a='typescript/docs/validation/ts-034h6-mp/baseline/test/harness-errors-b.ts',b='typescript/docs/validation/ts-034h6-mp/proposed/test/harness-errors-b.ts';
const diff=spawnSync('git',['diff','--no-index','--',a,b],{cwd:repo,maxBuffer:1024*1024});assert.equal(diff.status,1);
writeFileSync(join(here,'proposed.patch'),diff.stdout.toString().replaceAll('a/'+a,'a/'+path).replaceAll('b/'+b,'b/'+path));
const inputs=[{id:'input-a',number:7,source:'probe(7);\n'},{id:'input-b',number:11,source:'probe(11);\n'}];
for(const i of inputs){i.file=i.id+'.js';writeFileSync(join(here,i.file),i.source);i.sha256=hash(Buffer.from(i.source));}
const rows=[
 ['S01','array constructor absent','default','LK'],
 ['S02','array own constructor undefined','default','LK'],
 ['S03','array inherited constructor undefined','default','LK'],
 ['S04','constructor object, species absent','default','LKS'],
 ['S05','constructor object, own species undefined','default','LKS'],
 ['S06','constructor object, own species null','default','LKS'],
 ['S07','constructor object, inherited species undefined/null','default','LKS'],
 ['S08','initial constructor null','language TypeError','LK'],
 ['S09','initial constructor 0/7/NaN/false/true/string/symbol','language TypeError','LK'],
 ['S10','species 0/7/NaN/false/true/string/symbol','language TypeError','LKS'],
 ['S11','species ordinary object with poison own species','language TypeError','LKS'],
 ['S12','species callable builtin without constructorSlot','language TypeError','LKS'],
 ['S13','species actual Script function constructor','unsupported map-species','LKS'],
 ['S14','species actual builtin Error constructor','unsupported map-species','LKS'],
 ['S15','constructor callable nonconstructor, missing species','default','LKS'],
 ['S16','constructor builtin Error constructor, missing species','default','LKS'],
 ['S17','constructor named Object/Array with arbitrary prototype, missing species','default','LKS'],
 ['S18','constructor named Object/Array with poison species','exact abrupt','LKSQ'],
 ['S19','actual CP Object-link simulation before and after, no global installation','default','LKS after; LK before'],
 ['S20','actual CP Object-link with species null/undefined/invalid/custom','by selected species','LKS'],
 ['S21','ordinary object with poison constructor and species','default','L'],
 ['S22','invalid callback and poison constructor/species','callback TypeError','L'],
 ['S23','throwing length getter and invalid callback','exact abrupt','L'],
 ['S24','throwing constructor getter','exact abrupt','LKG'],
 ['S25','constructor getter returns object; throwing species getter','exact abrupt','LKG SQ'],
 ['S26','string Symbol.species and new same-description symbol poison; canonical absent','default','LKS'],
 ['S27','canonical species accessor on prototype; exact C receiver','default','LKSQ'],
 ['S28','constructor getter on prototype; exact array receiver','default','LKGS'],
 ['S29','species getter changes constructor; captured constructor not reread','default','LKSQ'],
 ['S30','constructor getter changes species before lookup','by newly selected species','LKGS'],
 ['L01','ordinary length4294967296 with poison constructor','language RangeError','L'],
 ['L02','synthetic array length4294967296/default species','language RangeError','LKS'],
 ['L03','synthetic array length4294967296/invalid species','language TypeError','LKS'],
 ['L04','synthetic array length4294967296/custom species','unsupported map-species','LKS'],
 ['L05','length4294967295 default/sparse under tight budget','resource steps after allocation','LKSA'],
 ['L06','length coercion mutates constructor; converted length saved','by mutated constructor','length conversion then K'],
 ['M01','species shrinks input length or deletes index0','saved result length; hole','LKSQAH'],
 ['M02','species grows input length/adds beyond saved limit','ignore new beyond-limit elements','LKSQAHECD'],
 ['M03','species fills index0 hole or changes inherited element','new exact payload','LKSQAHECD'],
 ['M04','callback fills future hole/deletes future index/grows input','saved limit, live presence','per-index H then conditional ECD'],
 ['X01','crossed B caller/input/constructor, A bridge, C getter/callback','default/error belongs A; hooks C; restore B','same selected trace'],
 ['X02','same/cross-Realm foreign Script/Error constructor missing species','default; do not exempt foreign values','LKS'],
 ['X03','legacy operation, constructor undefined/nonundefined','unchanged default/unsupported; zero S','LK'],
 ['X04','Script operation on legacy-origin data array','Script selection','LK(S)'],
 ['X05','legacy operation on Script-origin data array','legacy selection','LK'],
 ['X06','real foreign intrinsic Array','unrepresentable; explicitly not executed','no fabricated fixture'],
 ['A01','each constructor/species/element/callback hook returns guest/engine/resource/unsupported completion','same record/value/origin/diagnostic identity','no later effects'],
 ['A02','each hook throws host sentinel','exact host identity; finally restoration','no later effects'],
 ['A03','parsed guest constructor/species getter throws payload from original source','exact Value; getter source provenance','no later effects'],
 ['A04','getter evaluates inner Script session normal/throw/host exit','outer frame restoration in finally; BOTH original sessions reusable','separate inner counters'],
 ['A05','same-context nested map inside species getter','shared steps/calls; outer result allocated after inner','frozen N01/N02'],
 ['A06','retained guarded raw callbacks live/finally/idle','denied; zero body effects','guard unchanged'],
 ['D01','result length/elements/holes/prototype/fresh identity','exact descriptors, running Realm, no constructor execution','allocation and definition counters'],
 ['D02','guest global/prototype key inventories','unchanged; no installed species property','zero metadata additions']
].map(([id,setup,outcome,effects])=>({id,setup,outcome,effects,status:'UNEXECUTED'}));
save('matrix.json',{base,status:'UNEXECUTED',dimensions:{selection:['empty','one-element'],realms:['same','crossed'],inputs:['input-a','input-b'],note:'Apply dimensions where meaningful; X06 is unrepresentable, not a pass/skip. L and M rows have their specified lengths.'},rows});
// Effects after each successful tick; these literal vectors are the oracle.
const traces=[
 ['T01','data constructor/species default empty',[1,1,7],['','','LKSA'],'normal []',1,0,1],
 ['T02','data constructor/species default one',[1,1,7,1],['','','LKSA','HECD'],'normal [payload]',1,1,2],
 ['T03','constructor + species builtin getter one',[1,1,7,1],['','','LKGSQA','HECD'],'normal [payload]',1,1,2],
 ['T04','invalid callback',[1,1,7],['','','L'],'callback TypeError',0,0,1],
 ['T05','invalid primitive constructor',[1,1,7],['','','LK'],'language TypeError',0,0,1],
 ['T06','invalid selected species',[1,1,7],['','','LKS'],'language TypeError',0,0,1],
 ['T07','valid custom constructor',[1,1,7],['','','LKS'],'unsupported map-species',0,0,1],
 ['T08','constructor builtin getter abrupt',[1,1,7],['','','LKG'],'exact abrupt',0,0,2],
 ['T09','species builtin getter abrupt',[1,1,7],['','','LKSQ'],'exact abrupt',0,0,2],
 ['T10','ordinary poison constructor one',[1,1,7,1],['','','LA','HECD'],'normal [payload]',1,1,2],
 ['T11','default oversize',[1,1,7],['','','LKS'],'language RangeError',0,0,1],
 ['T12','species getter deletes element',[1,1,7,1],['','','LKSQA','H'],'normal [hole]',1,0,2],
 ['N01','species getter nested empty data-array map',[1,1,7,1],['','','LKSQlkaA','HECD'],'normal [payload]',2,1,2],
 ['N02','species getter nested one data-array map',[1,1,7,1,1],['','','LKSQlka','hecdA','HECD'],'normal [payload]',2,2,3]
].map(([id,setup,columns,effectsAfterTick,terminal,arrays,callbacks,minimumCalls])=>({id,setup,columns,effectsAfterTick,terminal,arrays,callbacks,minimumCalls,status:'UNEXECUTED'}));
save('frozen-traces.json',{base,status:'UNEXECUTED',inputs,traces,innerLegend:'lowercase l/k/a/h/e/c/d are nested map equivalents; nested constructor is undefined; inner callback returns payload; no Script reentry in N rows'});
const controls=[];
for(const t of traces)for(const input of inputs)for(const seed of [0,7])for(let limit=0;limit<=t.columns.length+1;limit++){
 const ok=Math.min(limit,t.columns.length),effects=t.effectsAfterTick.slice(0,ok).join(''),success=limit>=t.columns.length;
 controls.push({trace:t.id,input:input.id,seed,limit:seed+limit,steps:seed+Math.min(limit+1,t.columns.length),effects,
  arrays:[...effects].filter(c=>c==='A'||c==='a').length,callbacks:[...effects].filter(c=>c==='C'||c==='c').length,
  outcome:success?t.terminal.replace('payload',String(input.number)):'resource steps',count:success?null:seed+limit+1,
  loc:success?(t.terminal.startsWith('normal')?null:{line:1,column:1}):{line:1,column:t.columns[limit]},
  realm:success?(t.terminal.startsWith('normal')?null:['T08','T09'].includes(t.id)?'C':'A'):limit<3?'B':t.id==='N02'&&limit===3?'C':'A',source:input.id,
  publication:success&&t.terminal.startsWith('normal')?'fresh outer result':'none',cleanup:'calls0; depth0; active null; original sessions reusable'});
}
save('prefix-controls.json',{status:'UNEXECUTED',controls});
const limited={T02:[4,'LKSAHE','A'],T03:[3,'LK','A'],T08:[3,'LK','A'],T09:[3,'LKS','A'],T10:[4,'LAHE','A'],T12:[3,'LKS','A'],N01:[3,'LKS','A'],N02:[3,'LKS','A']};
const calls=[];
for(const t of traces)for(const input of inputs)for(const seed of [0,7])for(const limit of [0,1,2,3]){
 const failure=limit<t.minimumCalls;
 let tuple=limit===0?[3,'','B']:limit===2&&t.id==='N02'?[4,'LKSQlkahe','C']:limited[t.id];
 if(!failure)tuple=[t.columns.length,t.effectsAfterTick.join(''),t.terminal.startsWith('normal')?null:['T08','T09'].includes(t.id)?'C':'A'];
 assert.ok(tuple);
 calls.push({trace:t.id,input:input.id,seed,limit,steps:seed+tuple[0],effects:tuple[1],realm:tuple[2],source:input.id,loc:failure||!t.terminal.startsWith('normal')?{line:1,column:1}:null,
  outcome:failure?'resource calls':t.terminal.replace('payload',String(input.number)),count:failure?limit:null,
  arrays:[...tuple[1]].filter(c=>c==='A'||c==='a').length,callbacks:[...tuple[1]].filter(c=>c==='C'||c==='c').length,
  publication:!failure&&t.terminal.startsWith('normal')?'fresh outer result':'none',cleanup:'calls0; depth0; active null; original sessions reusable'});
}
save('call-controls.json',{status:'UNEXECUTED',controls:calls});
console.log(JSON.stringify({protected:files.length,consumers:consumers.length,rows:rows.length,traces:traces.length,prefixes:controls.length,oldFiles:1,replacements:1}));
