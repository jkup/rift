// Authoring recipe: consumes original bytes and a manual source-site table,
// never calls a producer, parser, engine or proposed implementation for oracles.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,root=resolve(here,'../../../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const save=(p,x)=>writeFileSync(resolve(here,p),JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const sha=x=>createHash('sha256').update(x).digest('hex');
const blob=x=>createHash('sha1').update('blob '+Buffer.byteLength(x)+'\0').update(x).digest('hex');
const assertText=read('test/fixtures/harness-bundle/assert.js'),sta=read('test/fixtures/harness-bundle/sta.js');
assert.equal(sha(assertText),'206e274ca325eb8a652e3911c3fbd090e2480d11ed7579dc17a5d17a2360ed48');
assert.equal(sha(sta),'1930c54af79455c484799f43e9a28e2b2f15c40d0917c9941ca54e26db243f35');
const frozen=JSON.parse(read('test/fixtures/script-observation/frozen.json'));
const sites={B02:[0,61,3],B03:[0,61,3],B04:[0,92,3],B06:[0,144,3],B07:[0,129,7],B08:[0,138,7],B09:[0,138,7],B10:[0,114,5],B12:[1,23,3],B13:[0,80,5],B14:[0,61,3],B15:[0,92,3],B16:[0,49,5],N02:[0,108,3]};
const normals=['B01','B05','B11','N01'];
const limits={sourceUnits:100000,parseDepth:128,steps:100000,calls:64,evaluationDepth:256,wallMs:10000,outputBytes:1048576};
const rows=[];
for(const lane of ['node','native'])for(const input of ['alpha','beta'])for(const repeated of [false,true])for(const control of [...frozen.h7,{id:'I01',source:frozen.preflightInput.sources[input==='alpha'?0:1]}]){
 const id=control.id,paths=['harness/assert.js','harness/sta.js',...(repeated?['harness/sta.js']:[]),'harness/control-'+id+'.js','test/preflight-'+id+'.js'];
 const originalTexts=[assertText,sta,...(repeated?[sta]:[]),control.source,''];
 const sourceTexts=[...originalTexts.slice(0,-1),'"use strict";\n'];
 const units=sourceTexts.map((text,n)=>({id:'u'+n,ordinal:n,role:n===sourceTexts.length-1?'test':'harness',path:paths[n],blob:blob(originalTexts[n]),sourceSha256:sha(originalTexts[n]),transformedSha256:sha(text),byteLength:Buffer.byteLength(originalTexts[n]),sourceUnits:text.length}));
 const realms=[{id:'test',profile:'script'},...(id==='B09'?[{id:'other',profile:'script'}]:[])];
 const nonce='preflight-'+lane+'-'+input+'-'+(repeated?'repeat':'original')+'-'+id;
 const request={requestVersion:2,nonce,mode:'conformance',variant:'strict',units,realms,limits,preflightId:null,action:'execute'};
 const binding={nonce,requestSha256:sha(JSON.stringify(request)),mode:'conformance',variant:'strict',units,realms,preflightId:null,action:'execute',limits,sources:sourceTexts.map((transformedText,n)=>({unitId:'u'+n,transformedText}))};
 const terminal=units.length-2,normal=normals.includes(id),number=id==='B16'||id==='I01';
 let source=null,result={kind:'normal'};
 if(!normal){
  const s=id==='I01'?[terminal,1,input==='alpha'?35:37]:sites[id];
  const unit=id==='B12'&&repeated?2:s[0];
  source={unitId:'u'+unit,realmId:'test',location:{line:s[1],column:s[2]}};
  const line=sourceTexts[unit].split('\n')[s[1]-1];assert.equal(line.slice(s[2]-1,s[2]+4),'throw',id);
  result={kind:'throw',phase:'runtime',original:{valueKind:number?'number':'object',origin:'guest',site:source},constructor:number?{outcome:'absent',name:null,realmId:null,secondary:null}:{outcome:'available',name:'Test262Error',realmId:'test',secondary:null}};
 }
 const child={driverVersion:2,nonce,requestSha256:binding.requestSha256,mode:'conformance',operation:{stage:'harness',phase:'body',unitId:'u'+terminal,realmId:'test'},source,testBodyEvaluated:false,harnessValidated:false,preflightId:null,completedUnits:units.slice(0,terminal+(normal?1:0)).map(x=>x.id),inspection:null,result};
 const report={version:1,nonce,control:id,input,passed:true,observed:id==='I01'?[input==='alpha'?7:11]:[],effects:''};
 const argv=['conformance-preflight-v1',id,input,'conformance','strict','execute',nonce,binding.requestSha256,'-','RESULT',...Object.values(limits).map(String),...units.flatMap((u,n)=>[u.id,u.role,'SOURCE-'+n])];
 rows.push({id:lane+'/'+input+'/'+(repeated?'repeat':'original')+'/'+id,lane,input,control:id,repeated,purpose:'conformance-preflight-v1',originalTexts,sourceTexts,request,binding,argv,expected:{child,report},process:{status:0,signal:null,stdout:'',stderr:''},provenance:'Unexecuted independently authored future child/report; original pinned bytes and source throw sites, not engine output.'});
}
for(const base of rows.filter(r=>r.control==='B01'&&r.input==='alpha'))for(const kind of ['steps','calls']){
 const r=structuredClone(base);r.id+='/zero-'+kind;r.scenario='zero-'+kind;r.binding.limits[kind]=0;r.request.limits[kind]=0;
 r.binding.requestSha256=sha(JSON.stringify(r.request));r.argv[7]=r.binding.requestSha256;r.argv[kind==='steps'?12:13]='0';
 const c=r.expected.child;c.requestSha256=r.binding.requestSha256;c.completedUnits=kind==='steps'?[]:r.binding.units.slice(0,-2).map(u=>u.id);
 c.operation={stage:'harness',phase:kind==='steps'?'instantiation':'body',unitId:kind==='steps'?'u0':'u'+(r.binding.units.length-2),realmId:'test'};
 c.source={unitId:c.operation.unitId,realmId:'test',location:{line:kind==='steps'?16:1,column:kind==='steps'?10:15}};
 c.result={kind:'resource-limit',guardCode:kind,count:kind==='steps'?1:0,limit:0};r.expected.report.passed=false;rows.push(r);
}
save('future-literals.json',rows);
const base=rows[0],negatives=[];
const add=(id,index,value,error)=>{const argv=[...base.argv];argv[index]=value;negatives.push({id,argv,error:'script-preflight/'+error});};
for(const [i,v,e] of [[0,'conformance','purpose'],[1,'loop','control'],[1,'B00','control'],[2,'gamma','input'],[3,'script-observation','mode'],[4,'raw','variant'],[4,'non-strict','variant'],[5,'parse-only','action'],[6,'','nonce'],[6,'bad nonce','nonce'],[7,'A'.repeat(64),'request-hash'],[8,'fabricated-ID','preflight'],[9,'','result-path'],[10,'1','fixed-limit'],[11,'1','fixed-limit'],[14,'1','fixed-limit'],[15,'2147483648','wall-limit']])add('field-'+i+'-'+v,i,v,e);
for(let i=10;i<=16;i++)for(const v of ['','-1','1.5','9007199254740992'])add('decimal-'+i+'-'+v,i,v,'limit');
for(let i=17;i<base.argv.length;i+=3){add('unit-id-'+i,i,'u99','unit');add('unit-role-'+i,i+1,base.argv[i+1]==='test'?'harness':'test','unit');add('unit-path-'+i,i+2,'','unit');}
for(const n of [0,17,26,28,30,35])negatives.push({id:'argc-'+n,argv:Array(n).fill('x'),error:'script-preflight/argc'});
const compound=[...base.argv];compound[10]='1';compound[base.argv.length-2]='harness';negatives.push({id:'late-role-before-fixed',argv:compound,error:'script-preflight/unit'});
save('argv-negatives.json',negatives);
const sourceNegatives=[];
for(let i=0;i<base.sourceTexts.length;i++){
 const texts=[...base.sourceTexts];texts[i]+=' ';sourceNegatives.push({id:'changed-source-'+i,argv:base.argv,sourceTexts:texts,error:'script-preflight/'+(i<2?'harness-source':i===2?'control-source':'test-source')});
}
for(const [id,control,input] of [['control-source-relabel','B02','alpha'],['input-source-relabel','I01','beta']]){
 const r=id==='input-source-relabel'?rows.find(r=>r.control==='I01'&&r.input==='alpha'&&!r.repeated):base;
 const argv=[...r.argv];argv[1]=control;argv[2]=input;sourceNegatives.push({id,argv,sourceTexts:r.sourceTexts,error:'script-preflight/control-source'});
}
sourceNegatives.push({id:'swapped-originals',argv:base.argv,sourceTexts:[base.sourceTexts[1],base.sourceTexts[0],...base.sourceTexts.slice(2)],error:'script-preflight/harness-source'});
save('source-negatives.json',sourceNegatives);
save('literal-sites.json',{normalControls:normals,sites,notes:'Manual table corroborated by pinned throw statements; I01 columns35/37; B12 repeated uses occurrence2.'});
console.log(JSON.stringify({literals:rows.length,argvNegatives:negatives.length,sourceNegatives:sourceNegatives.length}));
