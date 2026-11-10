import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs, type ScriptSession } from "../src/script-execution.js";
import { type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(source: string, realm: Realm, session: ScriptSession = createScriptSession()): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "generator-start", text: source }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + ": " + source);
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller state restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") throw new Error("missing " + name);
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
const cases=[
  "function* f(){return (yield 1)()}var g=f();g.next();g.next(function(){return 7}).value===7",
  "function* f(){return (yield 1)(yield 2)}var g=f();g.next();g.next(function(x){return x}).value===2&&g.next(7).value===7",
  "var o={x:7,m(){return this.x}};function* f(){return (yield 1).m()}var g=f();g.next();g.next(o).value===7",
  "var o={x:7,m(){return this.x}};function* f(){return o[yield 1]()}var g=f();g.next();g.next(\"m\").value===7",
  "var o={x:3,m(x){return this.x+x}};function* f(){return (yield 1)[yield 2](yield 3)}var g=f();g.next();g.next(o);g.next(\"m\");g.next(4).value===7",
  "var n=0,o={x:3,get m(){n++;return function(x){return this.x+x}}};function* f(){return (yield 1).m(yield 2)}var g=f();g.next();g.next(o);n===1&&g.next(4).value===7&&n===1",
  "var o={x:3,m(x){return this.x+x}};function* f(){return o[yield 1](yield 2)}var g=f();g.next();g.next(\"m\");o.m=function(){return 99};g.next(4).value===7",
  "var o={x:3,m(x){return this.x+x}};function* f(){return o[yield 1](yield 2)}var g=f();g.next();g.next(\"m\");o.x=4;g.next(3).value===7",
  "var n=0,key={toString(){n++;return \"m\"}},o={m(){return 7}};function* f(){return o[yield 1]()}var g=f();g.next();g.next(key).value===7&&n===1",
  "var n=0,key={toString(){n++;return \"m\"}};function* f(){try{return (yield 1)[yield 2]()}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(null).value===2&&g.next(key).value===true&&n===0",
  "var n=0;function arg(){n++;return 7}function* f(){try{return (yield 1)(arg())}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(0).value===true&&n===1",
  "function arg(){throw 7}function* f(){try{return (yield 1)(arg())}catch(e){return e}}var g=f();g.next();g.next(0).value===7",
  "var n=0,o={get m(){throw 7}};function arg(){n++}function* f(){try{return (yield 1).m(arg())}catch(e){return e}}var g=f();g.next();g.next(o).value===7&&n===0",
  "function strict(){\"use strict\";return this===undefined}function* f(){return (yield 1)()}var g=f();g.next();g.next(strict).value===true",
  "var o={m(){\"use strict\";return this===undefined}};function* f(){return (0,(yield 1).m)()}var g=f();g.next();g.next(o).value===true",
  "function* f(){return (yield 1).slice(1)}var g=f();g.next();g.next(\"abc\").value===\"bc\"",
  "function* f(){return (yield 1)(...[3,4])}var g=f();g.next();g.next(function(a,b){return a+b}).value===7",
  "var x=7;function* f(){var x=99;return (yield 1)(\"x\")}var g=f();g.next();g.next(eval).value===7",
  "var n=0;function arg(){n++}function* f(){try{return (yield 1)(arg())}finally{yield 2}}var g=f();g.next();g.return(7).value===2&&g.next().value===7&&n===0",
  "var n=0;function arg(){n++}function* f(){try{return (yield 1)(arg())}catch(e){return e}}var g=f();g.next();g.throw(7).value===7&&n===0",
  "var s=Symbol(),o={[s](){return 7}};function* f(){return o[yield 1]()}var g=f();g.next();g.next(s).value===7"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"call target case "+i);}
for(const source of ['async function f(){return (await Promise.resolve(o)).m(4)}f().then(v=>out=v)', 'async function* f(){yield o[await Promise.resolve("m")](await Promise.resolve(4))}f().next().then(r=>out=r.value)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0,o={x:3,m(v){return this.x+v}};'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async call target result');
}
const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('function* f(){return (yield 1).m(4)}var g=f();g.next();',A,creator);define(B,'g',own(A,'g'));const steps=creator.inspect().steps,session=createScriptSession();const result=run('var o={x:3,m(v){return this.x+v}};g.next(o).value===7',B,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'supplied method realm');check(creator.inspect().steps===steps,'current call target session');
{
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();
 run('var cleaned=false,o={get m(){while(true){}}};function* f(){try{return (yield 1).m()}finally{cleaned=true}}var g=f();g.next();',realm,session);
 const stopped=run('g.next(o)',realm,createScriptSession({maxSteps:100,maxCalls:16}));check(stopped.type==='throw'&&stopped.origin.kind==='resource-limit','getter current budget');
 const clean=run('cleaned',realm);check(clean.type==='normal'&&clean.value.kind==='boolean'&&!clean.value.value,'fatal skips cleanup');
}
{
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession(),sentinel=new Error('target host fault');
 const fault=realm.createBuiltin('hostFault',0,(_receiver:Value,_args:Value[],_context:OperationContext,_loc:Location):ValueCompletion=>{throw sentinel});define(realm,'hostFault',{kind:'object',object:fault});
 run('function* f(){return (yield 1)()}var g=f();g.next();',realm,session);let caught=false;try{run('g.next(hostFault)',realm,session)}catch(error){if(error instanceof Error)caught=error===sentinel}const state=session.inspect();check(caught&&state.active===null&&state.calls===0&&state.depth===0,'host target fault restored');
}
console.log('generator call target passed');
