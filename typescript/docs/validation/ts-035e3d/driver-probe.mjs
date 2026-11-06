// Inert IO-order reduction of the exact proposed executable branch. These fake
// local operations never enter the public API or execute guest source.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const here=import.meta.dirname,proposal=readFileSync("C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3d-implementation-MFU5dA\\test\\script-observation.ts",'utf8');
const branch=proposal.slice(proposal.indexOf('    if (process.argv[2] === "conformance-preflight-v1")'),proposal.indexOf('    const control = process.argv[2];'));
const source=`let scenario="",trace:string[]=[],process={argv:[] as string[]};
function validateConformancePreflightArguments(_args:string[]){trace.push("validate");if(scenario==="invalid")throw Error("script-preflight/variant");}
function readFileSync(path:string,_encoding:string){trace.push("read:"+path);if(scenario==="missing"&&path==="SOURCE-3")throw Error("ENOENT");return path;}
function produceConformancePreflightControl(_args:string[],texts:string[]){trace.push("produce:"+texts.join(","));if(scenario==="source")throw Error("script-preflight/harness-source");return {child:{kind:"data-only"},report:{passed:false}};}
function scriptObservationJSONRecord(_child:any){trace.push("serialize");return "child";}
function writeFileSync(path:string,_text:string,options:any){trace.push("write:"+path+":"+options.flag);if(scenario==="child-write"&&path==="RESULT")throw Error("EEXIST");if(scenario==="report-write"&&path==="RESULT.control.json")throw Error("EEXIST");}
function main(){
${branch}
throw Error("unexpected observation branch");}
export function exercise(name:string,args:string[]){scenario=name;trace=[];process.argv=["node","driver",...args];let error:string|null=null;try{main();}catch(e){if(!(e instanceof Error))throw e;error=e.message;}return {trace,error};}
`;
const argv=JSON.parse(readFileSync(join(here,'future-literals.json')))[0].argv;
const reads=['validate','read:SOURCE-0','read:SOURCE-1','read:SOURCE-2','read:SOURCE-3'];
const produced=[...reads,'produce:SOURCE-0,SOURCE-1,SOURCE-2,SOURCE-3'];
const literals=[
 ['invalid',{trace:['validate'],error:'script-preflight/variant'}],
 ['missing',{trace:reads,error:'ENOENT'}],
 ['source',{trace:produced,error:'script-preflight/harness-source'}],
 ['normal',{trace:[...produced,'serialize','write:RESULT:wx','write:RESULT.control.json:wx'],error:null}],
 ['child-write',{trace:[...produced,'serialize','write:RESULT:wx'],error:'EEXIST'}],
 ['report-write',{trace:[...produced,'serialize','write:RESULT:wx','write:RESULT.control.json:wx'],error:'EEXIST'}],
];
const directory=mkdtempSync(join(here,'driver-'));
async function load(text,name){const path=join(directory,name+'.mts');writeFileSync(path,text,{flag:'wx'});return import(pathToFileURL(path));}
function check(api){for(const [name,expected] of literals)assert.deepEqual(api.exercise(name,argv),expected,name);}
check(await load(source,'baseline'));
const mutations=[['read-before-validate','        validateConformancePreflightArguments(args);','        readFileSync("SOURCE-0", "utf8"); validateConformancePreflightArguments(args);'],['omit-last-read','n < args.length; n += 3','n < args.length - 3; n += 3'],['nonexclusive','flag: "wx"','flag: "w"']];
for(const [name,from,to] of mutations){assert(source.includes(from));const api=await load(source.replace(from,to),name);assert.throws(()=>check(api),name);}
writeFileSync(join(directory,'result.json'),JSON.stringify({kind:'inert-driver-order',argv,literals,mutantsRejected:mutations.map(x=>x[0]),engineExecutions:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({directory,literals:literals.length,mutantsRejected:mutations.length,engineExecutions:0}));
