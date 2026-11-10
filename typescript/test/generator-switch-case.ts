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
const cases: string[] = [
  "function* f(){switch(7){case yield 1:return 8;default:return 9}}var g=f();g.next().value===1&&g.next(7).value===8",
  "function* f(){switch(7){case yield 1:return 8;case yield 2:return 9;default:return 10}}var g=f();g.next();g.next(0).value===2&&g.next(7).value===9",
  "function* f(){switch(7){case yield 1:return 8;default:return 9;case yield 2:return 10}}var g=f();g.next();g.next(0).value===2&&g.next(7).value===10",
  "var out=\"\";function* f(){switch(7){case yield 1:out+=\"a\";default:out+=\"d\";case yield 2:out+=\"b\"}return out}var g=f();g.next();g.next(7).value===\"adb\"",
  "var out=\"\";function* f(){switch(7){case yield 1:out+=\"a\";default:out+=\"d\";case yield 2:out+=\"b\"}return out}var g=f();g.next();g.next(0).value===2&&g.next(0).value===\"db\"",
  "function* f(){switch(yield 1){case yield 2:return 7;default:return 8}}var g=f();g.next();g.next(3).value===2&&g.next(3).value===7",
  "function* f(){switch(7){case yield 1:return 8;default:return 9}}var g=f();g.next();g.next(\"7\").value===9",
  "function* f(){switch(NaN){case yield 1:return 8;default:return 9}}var g=f();g.next();g.next(NaN).value===9",
  "function* f(){try{switch(7){case (yield 1,x):let x=7;}}catch(e){return e instanceof ReferenceError}}var g=f();g.next();g.next(0).value===true",
  "function* f(){switch(\"function\"){case (yield 1,typeof h):function h(){}return 7;default:return 8}}var g=f();g.next();g.next().value===7",
  "var saved;function* f(){switch(7){case (saved=()=>x,yield 1):return 8;case yield 2:let x=9;return saved()}}var g=f();g.next();var caught=false;try{saved()}catch(e){caught=e instanceof ReferenceError}g.next(0).value===2&&g.next(7).value===9&&caught",
  "function* f(){outer:switch(7){case yield 1:yield 2;break outer;default:yield 3}return 8}var g=f();g.next();g.next(7).value===2&&g.next().value===8",
  "var n=0;function side(){n++;return 7}function* f(){try{switch(7){case yield 1:return 8;case side():return 9}}catch(e){return e}}var g=f();g.next();g.throw(6).value===6&&n===0",
  "var n=0;function side(){n++;return 7}function* f(){try{switch(7){case yield 1:return 8;case side():return 9}}finally{yield n}}var g=f();g.next();g.return(6).value===0&&g.next().value===6&&n===0",
  "var n=0,o={valueOf(){n++;return 7}};function* f(){switch(o){case yield 1:return 8;default:return 9}}var g=f();g.next();g.next(o).value===8&&n===0",
  "function* f(){try{switch(7){case (yield 1).x:return 8}}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(null).value===true",
  "function* f(){switch(7){case yield 1:yield 2;case yield 3:yield 4;}return 8}var g=f();g.next();g.next(7).value===2&&g.next().value===4&&g.next().value===8"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"switch case "+i);}
for(const source of ['async function f(){switch(1){case await Promise.resolve(1):out=7;break;default:out=8}}f()', 'async function* f(){switch(1){case await Promise.resolve(1):yield 7}}f().next().then(r=>out=r.value)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async selector result');
}
{
 const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('function* f(){switch(7){case (yield 1).x:return 8}}var g=f();g.next();',A,creator);define(B,'g',own(A,'g'));const steps=creator.inspect().steps,session=createScriptSession();const result=run('g.next(null)',B,session);check(result.type==='throw'&&result.value.kind==='object'&&result.value.object.getPrototypeOf()===A.getErrorPrototype('TypeError'),'selector owner error');check(creator.inspect().steps===steps,'current selector session');
}
{
 const realm=new Realm((_line:string)=>{},'script');run('var cleaned=false;function spin(x){while(true){}}function* f(){try{switch(7){case spin(yield 1):return 8}}finally{cleaned=true}}var g=f();g.next();',realm);const result=run('g.next(7)',realm,createScriptSession({maxSteps:100,maxCalls:16}));check(result.type==='throw'&&result.origin.kind==='resource-limit','selector current budget');const clean=run('cleaned',realm);check(clean.type==='normal'&&clean.value.kind==='boolean'&&!clean.value.value,'fatal selector cleanup');
}
console.log('generator switch case passed');
