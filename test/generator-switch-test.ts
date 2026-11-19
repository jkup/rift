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
  "function* f(){switch(yield 1){case 2:return 7;default:return 8}}var g=f();g.next().value===1&&g.next(2).value===7",
  "function* f(){switch(yield 1){case 2:return 7;default:return 8}}var g=f();g.next();g.next(3).value===8",
  "let x=7;function* f(){switch(yield x){case 1:let x=8;return x}}var g=f();g.next().value===7&&g.next(1).value===8",
  "function* f(){try{switch(yield 1){case x:let x=7;}}catch(e){return e instanceof ReferenceError}}var g=f();g.next();g.next(7).value===true",
  "var log=\"\";function key(x){log+=x;return x}function* f(){switch(yield 1){case key(2):log+=\"a\";break;default:log+=\"d\";case key(3):log+=\"b\"}return log}var g=f();g.next();var before=log;g.next(2).value===\"2a\"&&before===\"\"",
  "var log=\"\";function key(x){log+=x;return x}function* f(){switch(yield 1){case key(2):log+=\"a\";break;default:log+=\"d\";case key(3):log+=\"b\"}return log}var g=f();g.next();g.next(4).value===\"23db\"",
  "function* f(){switch(yield 1){case 2:yield 7;case 3:yield 8;break;default:yield 9}return 10}var g=f();g.next();g.next(2).value===7&&g.next().value===8&&g.next().value===10",
  "function* f(){switch(yield 1){}return 7}var g=f();g.next();g.next(2).value===7",
  "function* f(){outer:switch(yield 1){case 2:yield 7;break outer;default:yield 8}return 9}var g=f();g.next();g.next(2).value===7&&g.next().value===9",
  "var n=0;function* f(){outer:for(var i=0;i<2;i++){switch(yield i){case 1:n++;continue outer;default:break}}return n}var g=f();g.next();g.next(1).value===1&&g.next(1).value===2",
  "var n=0;function key(){n++;return 7}function* f(){try{switch(yield 1){case key():n+=10}}finally{yield n}}var g=f();g.next();g.return(8).value===0&&g.next().value===8&&n===0",
  "var n=0;function key(){n++;return 7}function* f(){try{switch(yield 1){case key():n+=10}}catch(e){return e}}var g=f();g.next();g.throw(8).value===8&&n===0",
  "function* f(){try{switch(yield 1){case null.x:return 2}}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(7).value===true",
  "function* f(){switch(yield 1){case typeof h: function h(){} return 7;default:return 8}}var g=f();g.next();g.next(\"function\").value===7",
  "var n=0,o={valueOf(){n++;return 7}};function* f(){switch(yield 1){case 7:return 8;case o:return 9}}var g=f();g.next();g.next(o).value===9&&n===0",
  "function* f(){switch((yield 1).x){case 7:return 8}}var g=f();g.next();g.next({x:7}).value===8"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"switch test case "+i);}
for(const source of ['async function f(){switch(await Promise.resolve(1)){case 1:out=7;break;default:out=8}}f()', 'async function* f(){switch(await Promise.resolve(1)){case 1:yield 7}}f().next().then(r=>out=r.value)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async switch result');
}
const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('function* f(){switch(yield 1){case null.x:return 7}}var g=f();g.next();',A,creator);define(B,'g',own(A,'g'));const steps=creator.inspect().steps,session=createScriptSession();const result=run('g.next(7)',B,session);check(result.type==='throw'&&result.value.kind==='object'&&result.value.object.getPrototypeOf()===A.getErrorPrototype('TypeError'),'switch owner error');check(creator.inspect().steps===steps,'current switch session');
console.log('generator switch test passed');
