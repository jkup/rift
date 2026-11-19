// Exact proposed run method in an inert orchestration reduction. No real AST,
// Realm, parser, guest evaluator or production module is loaded or injected.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const here=import.meta.dirname,source=readFileSync(join(here,'proposals/script-observation.ts'),'utf8');
const run=source.slice(source.indexOf('    run(): ChildV2 {'),source.indexOf('    // Registered controls have fixed setup here'));
const prelude=`type ChildV2 = any; type ObservedScriptEvaluation = any;
let current:any; const sentinel=new Error("host sentinel");
function check(ok:boolean,label:string){if(!ok)throw Error(label);}
function own(){throw Error("unreachable guest setup");} function object(){throw Error("unreachable guest setup");}
function createScriptSession(_limits:any){return {inspect(){current.trace.push("cleanup");return {active:null,calls:0,depth:0,steps:current.ticks,lastAbrupt:current.history};}};}
function prepareBoundedScript(unit:any,realm:any){current.trace.push("prepare:"+unit.id);if(current.preflightControl&&unit.id==="u3")throw Error("trailing test prepared");if(current.scenario==="prepare"&&unit.id==="u0")return {kind:"rejected"};return {kind:"ready",record:{unitId:unit.id,realm}};}
function evaluateScriptObserved(_session:any,record:any){current.trace.push("evaluate:"+record.unitId);current.ticks++;
 if(current.scenario==="host"&&record.unitId==="u2")throw sentinel;
 const fault=(current.scenario==="early"&&record.unitId==="u0")||(["throw","resource","unsupported"].includes(current.scenario)&&record.unitId==="u2");
 const snapshot=fault?{record,realm:record.realm,unitId:record.unitId,loc:{line:1,column:1}}:null;current.history=snapshot;
 return {source:snapshot,evaluation:{phase:"body",completion:fault?{type:"throw",origin:{kind:current.scenario==="resource"?"resource-limit":current.scenario==="unsupported"?"unsupported-operation":"guest"}}:{type:"normal"}}};}
class Harness {
 request={steps:100,calls:64,units:[{id:"u0",role:"harness",text:"a"},{id:"u1",role:"harness",text:"b"},{id:"u2",role:"harness",text:"control"},{id:"u3",role:"test",text:"poison"}],action:"execute"};
 trace:string[]=[]; ticks=0; history:any=null; records=new Map(); session:any=null; control="B01"; target=null; realm={}; completed:string[]=[]; verified=false;
 scenario="";preflightControl=true;
 realmFor(_u:any){return this.realm;}
 rejected(u:any,_p:any){this.trace.push("reject:"+u.id);return {terminal:u.id,kind:"prepare",completed:[]};}
 verifyControl(_o:any){this.trace.push("verify");this.verified=!["false","throw","resource","unsupported"].includes(this.scenario);}
 observed(u:any,o:any){this.trace.push("project:"+u.id);if(o.evaluation.completion.type==="normal"&&u.role==="harness")this.completed.push(u.id);return {terminal:u.id,result:{kind:o.evaluation.completion.type},completed:this.completed.slice()};}
 envelope(){throw Error("unexpected parse-only");}
`;
const end=`}
export function exercise(scenario:string,preflight:boolean){const h=new Harness();h.scenario=scenario;h.preflightControl=preflight;current=h;let result:any=null,error:string|null=null;try{result=h.run();}catch(e){if(e!==sentinel)throw e;error="same-host-sentinel";}return {result,error,verified:h.verified,trace:h.trace};}
`;
const prefix=['prepare:u0','evaluate:u0','cleanup','project:u0','prepare:u1','evaluate:u1','cleanup','project:u1'];
const body=['prepare:u2','evaluate:u2','cleanup','verify','project:u2'];
const normal={terminal:'u2',result:{kind:'normal'},completed:['u0','u1','u2']};
const literals=[
 {scenario:'normal',preflight:true,expected:{result:normal,error:null,verified:true,trace:[...prefix,...body]}},
 {scenario:'false',preflight:true,expected:{result:normal,error:null,verified:false,trace:[...prefix,...body]}},
 ...['throw','resource','unsupported'].map(scenario=>({scenario,preflight:true,expected:{result:{terminal:'u2',result:{kind:'throw'},completed:['u0','u1']},error:null,verified:false,trace:[...prefix,'prepare:u2','evaluate:u2','cleanup','cleanup','verify','project:u2']}})),
 {scenario:'early',preflight:true,expected:{result:{terminal:'u0',result:{kind:'throw'},completed:[]},error:null,verified:false,trace:['prepare:u0','evaluate:u0','cleanup','cleanup','project:u0']}},
 {scenario:'prepare',preflight:true,expected:{result:{terminal:'u0',kind:'prepare',completed:[]},error:null,verified:false,trace:['prepare:u0','reject:u0']}},
 {scenario:'host',preflight:true,expected:{result:null,error:'same-host-sentinel',verified:false,trace:[...prefix,'prepare:u2','evaluate:u2','cleanup']}},
 {scenario:'normal',preflight:false,expected:{result:{terminal:'u3',result:{kind:'normal'},completed:['u0','u1','u2']},error:null,verified:true,trace:[...prefix,...body,'prepare:u3','evaluate:u3','cleanup','project:u3']}},
];
const directory=mkdtempSync(join(here,'dispatch-'));
async function load(text,name){const path=join(directory,name+'.mts');writeFileSync(path,prelude+text+end,{flag:'wx'});return import(pathToFileURL(path));}
function checkLiterals(api){for(const row of literals)assert.deepEqual(api.exercise(row.scenario,row.preflight),row.expected,row.scenario);}
checkLiterals(await load(run,'baseline'));
const stop='if (this.preflightControl && unit.id === "u" + (this.request.units.length - 2)) return answer;';
const mutants=[['no-stop',stop,''],['only-verified',stop,stop.replace('this.preflightControl','this.preflightControl && this.verified')],['first-harness',stop,stop.replace('unit.id === "u" + (this.request.units.length - 2)','unit.role === "harness"')],['omit-verification','this.verifyControl(observed);','void observed;'],['omit-cleanup','const state = session.inspect();','const state = {active:null,calls:0,depth:0,steps:0};']];
const rejected=[];
for(const [name,from,to] of mutants){assert.equal(run.split(from).length,2,name);const api=await load(run.replace(from,to),name);assert.throws(()=>checkLiterals(api),name);rejected.push(name);}
const result={kind:'inert-exact-run-orchestration',engineExecutions:0,literals,mutantsRejected:rejected,directory};
writeFileSync(join(directory,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({directory,literals:literals.length,mutantsRejected:rejected,engineExecutions:0}));
