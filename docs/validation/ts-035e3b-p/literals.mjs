// Literal authoring only. Expected children are future requirements, not runs.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=new URL('./',import.meta.url),save=(n,v)=>writeFileSync(new URL(n,here),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const limits={sourceUnits:100000,parseDepth:128,steps:100000,calls:64,evaluationDepth:256,wallMs:10000,outputBytes:1048576};
const sha='a'.repeat(64),rows=[];
for(const lane of ['node','native'])for(const mode of ['script-observation','conformance'])for(const variant of ['raw','non-strict','strict'])for(const action of ['execute','parse-only'])for(const harness of [false,true]){
 if(variant==='raw'&&harness)continue;
 const units=(harness?[{id:'u0',role:'harness',text:'0;'}]:[]);
 units.push({id:'u'+units.length,role:'test',text:(variant==='strict'?'"use strict";\n':'')+'0;'});
 const request={mode,variant,action,nonce:'future',requestSha256:sha,preflightId:variant==='raw'?null:'future-preflight-data',limits,units};
 const argv=mode==='conformance'?[mode,variant,action,request.nonce,sha,request.preflightId??'-','RESULT',...Object.values(limits).map(String)]:[mode,action,request.nonce,sha,request.preflightId??'-','RESULT',String(limits.steps),String(limits.calls)];
 argv.push(...units.flatMap(u=>[u.id,u.role,'SOURCE-'+u.id]));
 const expected={driverVersion:2,nonce:'future',requestSha256:sha,mode,
 operation:{stage:'test',phase:action==='execute'?'body':'parse',unitId:units.at(-1).id,realmId:'test'},source:null,
 testBodyEvaluated:action==='execute',harnessValidated:request.preflightId!==null,preflightId:request.preflightId,
 completedUnits:units.slice(0,-1).map(u=>u.id),inspection:null,result:{kind:'normal'}};
 rows.push({id:[lane,mode,variant,action,harness?'harness':'test'].join('/'),provenance:'unexecuted future synthetic producer requirement; not admitted',lane,request,argv,expected});
}
save('future-producer-literals.json',rows);
const raw=rows.find(r=>r.lane==='node'&&r.request.mode==='conformance'&&r.request.variant==='raw'&&r.request.action==='execute');
const negatives=[];
function bad(id,edit,error){const argv=structuredClone(raw.argv);edit(argv);negatives.push({id,argv,error:'script-producer/'+error,expectedReads:[],expectedRealmCreations:0,expectedResultFile:false});}
bad('short',a=>a.pop(),'argc');bad('extra',a=>a.push('extra'),'argc');bad('mode',a=>a[0]='observation','mode');bad('variant',a=>a[1]='module','variant');bad('action',a=>a[2]='control','action');bad('nonce',a=>a[3]='','nonce');bad('hash',a=>a[4]='A'.repeat(64),'request-hash');bad('preflight-ascii',a=>a[5]='a b','preflight');bad('result-path',a=>a[6]='','result-path');
for(let i=7;i<14;i++)for(const value of ['','-1','1.5','NaN','9007199254740992'])bad('number-'+i+'-'+value,a=>a[i]=value,'limit');
for(const i of [7,8,11])bad('fixed-'+i,a=>a[i]='0','fixed-limit');
bad('wall-overflow',a=>a[12]='2147483648','wall-limit');bad('ordinal',a=>a[14]='u1','unit');bad('role',a=>a[15]='harness','unit');bad('source-path',a=>a[16]='','unit');bad('raw-preflight',a=>a[5]='fake','variant-preflight');bad('nonraw-no-preflight',a=>a[1]='non-strict','variant-preflight');
bad('raw-extra-harness',a=>a.splice(14,3,'u0','harness','SOURCE-u0','u1','test','SOURCE-u1'),'variant-preflight');
bad('late-role-before-read',a=>{a.splice(14,3,'u0','harness','MISSING-u0','u1','bad','MISSING-u1');a[1]='strict';a[5]='preflight';},'unit');
bad('late-role-beats-fixed',a=>{a[7]='0';a[15]='bad';},'unit');
bad('numeric-before-late-role',a=>{a[7]='-1';a[15]='bad';},'limit');
save('argv-negatives.json',negatives);
const retained=JSON.parse(readFileSync(new URL('../../../test/fixtures/script-observation-serialization/frozen.json',here)));
save('retained-codec-literals.json',{provenance:'unchanged A synthetic serializer fixtures, not producer execution or admitted results',source:'typescript/test/fixtures/script-observation-serialization/frozen.json',sha256:createHash('sha256').update(readFileSync(new URL('../../../test/fixtures/script-observation-serialization/frozen.json',here))).digest('hex'),rows:retained});
console.log(JSON.stringify({futureProducer:rows.length,argvNegatives:negatives.length,retainedCodec:retained.length}));
