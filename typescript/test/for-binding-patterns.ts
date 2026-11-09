import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse, parseDeclarationPlan } from "../src/parser.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, steps = 100000, realm = new Realm((_line: string) => {}, "script")) {
    const prepared = prepareBoundedScript({ id: "array-pattern", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function expect(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for(const text of [
  "var sum=0;for(let [a,b] of [[1,2],[3,4]]){sum+=a+b}sum===10",
  "var names='';for(const {name} of [{name:'a'},{name:'b'}]){names+=name}names==='ab'",
  "var sum=0;for(var [a,...rest] of [[1,2,3],[4,5]]){sum+=a+rest.length}sum===8&&a===4&&rest[0]===5",
  "var sum=0;for(let [a,b=a+1] of [[1],[3]]){sum+=b}sum===6",
  "var values=[];for(let [a,f=()=>a] of [[1],[2]]){values.push(f)}values[0]()===1&&values[1]()===2",
  "var values=[];for(var [a,f=()=>a] of [[1],[2]]){values.push(f)}values[0]()===2&&values[1]()===2",
  "var values=[];for(const {a,f=()=>a} of [{a:1},{a:2}]){values.push(f)}values[0]()===1&&values[1]()===2",
  "var a=7;var ok=false;try{for(let [a,b] of [b]){}}catch(e){ok=e instanceof ReferenceError}ok&&a===7",
  "var a=7;for(let [a] of [[1]]){}a===7",
  "for(var [a] of []){}a===undefined",
  "var n=0;for(let [] of [[],[]]){n++}n===2",
  "var n=0;for(const {} of [1,'x',true]){n++}n===3",
  "var keys='';for(let [first] in {ab:1,cd:2}){keys+=first}keys==='ac'",
  "var n=0;for(const {length} in {ab:1,cde:2}){n+=length}n===5",
  "var result='';for(let {a:[b],...rest} of [{a:[1],x:2},{a:[3],x:4}]){result+=b+rest.x}result==='37'",
  "var sum=0;outer:for(let [a] of [[1],[2],[3]]){if(a===2)continue outer;sum+=a}sum===4",
  "var ok=false;for(const [a] of [[1]]){try{a=2}catch(e){ok=e instanceof TypeError}}ok",
  "var trace='';var inner={};inner[Symbol.iterator]=function(){return {next(){return {done:false,value:undefined}},return(){trace+='i';throw 8}}};var outer={};outer[Symbol.iterator]=function(){return {next(){return {done:false,value:inner}},return(){trace+='o';throw 9}}};function fail(){throw 7}var ok=false;try{for(let [a=fail()] of outer){}}catch(e){ok=e===7}ok&&trace==='io'",
  "var trace='';var outer={};outer[Symbol.iterator]=function(){return {next(){return {done:false,value:null}},return(){trace+='o';return {}}}};var ok=false;try{for(let {} of outer){}}catch(e){ok=e instanceof TypeError}ok&&trace==='o'",
  "var trace='';var outer={};outer[Symbol.iterator]=function(){return {next(){return {done:false,value:[1]}},return(){trace+='o';return {}}}};for(let [a] of outer){break}trace==='o'"
]) expect(text);
for(const text of [
    "for(let [a,a] of []){}", "for(const {a:x,b:x} of []){}", "for(let [a] of []){var a;}",
    "for(let [a]=[] of []){}", "for(var [a]=[] in {}){}", "for(let [a],b of []){}",
    "for(let [a];false;){}", "for([a] of []){}", "'use strict';for(let [eval] of []){}"
]) {
    if(text === "for([a] of []){}") check(run(text).type==='normal','original empty assignment loop admitted');
    else check(prepareBoundedScript({id:'invalid-for-pattern',text},new Realm((_line:string)=>{},'script')).kind!=='ready','reject '+text);
}
check(parse('for(let [a] of []){}').error!==null,'legacy loop parser boundary');
const plan=parseDeclarationPlan({id:'loop-pattern-plan',text:'for(let [first,second=()=>first] of [[1]]){}'});
check(plan.kind==='complete','pattern loop declaration plan');
if(plan.kind==='complete') {
    check(plan.scopes[1].kind==='for-of'&&plan.scopes[1].lexicalNames.join(',')==='first,second','all loop names retained');
    check(plan.functions.length===1&&plan.scopes[plan.functions[0].scope].parent===1,'default arrow belongs to iteration scope');
}
const owner=new Realm((_line:string)=>{},'script'),caller=new Realm((_line:string)=>{},'script');
const foreign=run('function f(){for(const [a] of [[1]])return ()=>{a=2}}f()',100000,owner);
if(foreign.type!=='normal')throw new Error('foreign setup');
caller.defineScriptGlobal('foreign',{value:foreign.value});
const error=run('foreign()',100000,caller);
check(error.type==='throw'&&error.value.kind==='object'&&error.value.object.getPrototypeOf()===owner.getErrorPrototype('TypeError'),'iteration const error defining Realm');
const limitedRealm=new Realm((_line:string)=>{},'script');
run("var closed=0;var caught=false;var xs={};xs[Symbol.iterator]=function(){return {next(){return {done:false,value:[1]}},return(){closed++;return {}}}};",100000,limitedRealm);
const limited=run('try{for(let [a] of xs){}}catch(e){caught=true}',200,limitedRealm);
check(limited.type==='throw'&&limited.origin.kind==='resource-limit','iteration resource bound');
const untouched=run('closed===0&&!caught',100000,limitedRealm);
check(untouched.type==='normal'&&untouched.value.kind==='boolean'&&untouched.value.value,'fatal iteration skips guest cleanup');
console.log("For binding patterns passed");
