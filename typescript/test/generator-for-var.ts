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
  "function* f(){for(var i=yield 1;i<3;i++)yield i;return i}var g=f();g.next().value===1&&g.next(2).value===2&&g.next().value===3",
  "function* f(){var before=i;for(var i=yield 1;false;){}return before===undefined&&i===7}var g=f();g.next();g.next(7).value===true",
  "function* f(){var i=3;for(var i=yield i;false;){}return i}var g=f();g.next().value===3&&g.next(7).value===7",
  "var n=0;function init(x){n++;return x}function* f(){for(var i=init(yield 1);i<2;i++)yield i;return n}var g=f();g.next();g.next(0).value===0&&g.next().value===1&&g.next().value===1",
  "function* f(){outer:for(var i=yield 1;i<2;i++){yield i;continue outer}return i}var g=f();g.next();g.next(0).value===0&&g.next().value===1&&g.next().value===2",
  "function* f(){outer:for(var i=yield 1;;){for(;;){yield i;break outer}}return i+1}var g=f();g.next();g.next(6).value===6&&g.next().value===7",
  "function* f(){var i=3;try{for(var i=yield 1;;){yield 9}}finally{yield i}}var g=f();g.next();g.return(7).value===3&&g.next().value===7",
  "function* f(){var i=3;try{for(var i=yield 1;;){yield 9}}catch(e){return i+e}}var g=f();g.next();g.throw(4).value===7",
  "var n=0;function test(){n++;return false}function fail(){throw 7}function* f(){try{for(var i=fail(yield 1);test();){} }catch(e){return e}}var g=f();g.next();g.next().value===7&&n===0",
  "function* f(){var a=[];for(var i=yield 1;i<2;i++)a.push(()=>i);return a[0]()===2&&a[1]()===2}var g=f();g.next();g.next(0).value===true",
  "function* inner(){yield 1;return 7}function* f(){for(var i=yield* inner();false;){}return i}var g=f();g.next().value===1&&g.next().value===7",
  "function* f(){for(var i=yield 1;yield 2;yield 3){yield i;break}return i}var g=f();g.next();g.next(7).value===2&&g.next(true).value===7&&g.next().value===7",
  "function* f(){var out=0;for(var i=yield 1;false;){}for(var j=yield 2;false;){}return i+j}var g=f();g.next();g.next(3).value===2&&g.next(4).value===7"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"for var case "+i);}
for(const source of ['async function f(){for(var x=await Promise.resolve(7);false;){}return x}f().then(v=>out=v)', 'async function* f(){for(var x=await Promise.resolve(7);;){yield x;break}}f().next().then(r=>out=r.value)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async var initializer result');
}
const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('function* f(){for(var x=yield 1;false;){}return x}var g=f();g.next();function* slow(){for(var x=yield 1;;){}}var h=slow();h.next();',A,creator);define(B,'g',own(A,'g'));define(B,'h',own(A,'h'));const steps=creator.inspect().steps,session=createScriptSession();const result=run('g.next(7).value===7',B,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'cross-Realm var initializer');const stopped=run('h.next(7)',B,createScriptSession({maxSteps:100,maxCalls:16}));check(stopped.type==='throw'&&stopped.origin.kind==='resource-limit','var initializer current budget');check(creator.inspect().steps===steps,'creator session untouched');
for(const source of ['function* f(){for(var i=yield 1,j=2;;){}}'])check(prepareBoundedScript({id:'declaration-boundary',text:source},new Realm((_line:string)=>{},'script')).kind==='blocked','remaining declaration boundary');
console.log('generator for var passed');
