import {readFileSync,writeFileSync} from 'node:fs';
const here=new URL('./',import.meta.url),read=n=>JSON.parse(readFileSync(new URL(n,here))),save=(n,v)=>writeFileSync(new URL(n,here),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const basics=read('future-producer-literals.json'),rows=[];
for(const lane of ['node','native'])for(const action of ['execute','parse-only'])for(const role of ['test','harness'])for(const scenario of ['source-limit','zero-steps','source-before-steps','harness-steps-before-later-source']){
 if(scenario==='harness-steps-before-later-source'&&role!=='harness')continue;
 if(scenario==='zero-steps'&&role==='test'&&action==='parse-only')continue;
 const r=structuredClone(basics.find(r=>r.lane===lane&&r.request.mode==='conformance'&&r.request.variant===(role==='test'?'raw':'non-strict')&&r.request.action===action&&r.request.units.length===(role==='test'?1:2)));
 r.id=[lane,action,role,scenario].join('/');
 if(scenario!=='source-limit')r.request.limits.steps=0;
 const source=scenario==='source-limit'||scenario==='source-before-steps';
 if(source)r.request.units[0].text=' '.repeat(100001);
 if(scenario==='harness-steps-before-later-source')r.request.units[1].text=' '.repeat(100001);
 r.argv[9]=String(r.request.limits.steps);
 r.expected.operation={stage:role,phase:source?'parse':'body',unitId:'u0',realmId:'test'};
 r.expected.source={unitId:'u0',realmId:'test',location:{line:1,column:1}};
 r.expected.testBodyEvaluated=role==='test'&&!source;
 r.expected.completedUnits=[];
 r.expected.result={kind:'resource-limit',guardCode:source?'source-units':'steps',count:source?100001:1,limit:source?100000:0};
 rows.push(r);
}
const io=[];
for(const lane of ['node','native'])for(const scenario of ['late-source-missing','strict-transform-late','result-write-failure','result-exists']){
 const r=structuredClone(basics.find(r=>r.lane===lane&&r.request.mode==='conformance'&&r.request.variant==='strict'&&r.request.action==='execute'&&r.request.units.length===2));
 r.id=lane+'/'+scenario;r.scenario=scenario;
 if(scenario==='strict-transform-late')r.request.units[1].text='0;';
 r.expected={exitCode:70,stdout:'',stderr:'Script observation driver fault\n',child:null,processStarted:true,testBodyEvaluated:null};
 if(scenario==='result-exists')r.expected.existingResult='original';
 r.claim='future driver failure requirement; no parent terminal/receipt; body unknown for write failure';
 io.push(r);
}
save('future-resource-literals.json',rows);save('future-late-failures.json',io);
console.log(JSON.stringify({resources:rows.length,lateFailures:io.length}));
