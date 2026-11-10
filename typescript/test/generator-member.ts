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
  "function* f(){return (yield 1).x}var g=f();g.next().value===1&&g.next({x:7}).value===7",
  "var o={x:7};function* f(){return o[yield 1]}var g=f();g.next();g.next(\"x\").value===7",
  "function* f(){return (yield 1)[yield 2]}var g=f();g.next().value===1&&g.next({x:7}).value===2&&g.next(\"x\").value===7",
  "function* f(){return (yield 1).x.y}var g=f();g.next();g.next({x:{y:7}}).value===7",
  "function* f(){yield (yield 1).x}var g=f();g.next();g.next({x:7}).value===7&&g.next().done",
  "var log=\"\",o={get x(){log+=\"g\";return this.y},y:7};function base(){log+=\"b\";return o}function* f(){return base()[yield 1]}var g=f();g.next();var before=log;g.next({toString(){log+=\"k\";return \"x\"}}).value===7&&before===\"b\"&&log===\"bkg\"",
  "var o={x:7};function* f(){return o[yield 1]}var g=f();g.next();o={x:8};g.next(\"x\").value===7",
  "var o={x:7};function* f(){return o[yield 1]}var g=f();g.next();o.x=8;g.next(\"x\").value===8",
  "var log=\"\";function key(){log+=\"k\";return {toString(){log+=\"c\";return \"x\"}}}function* f(){try{return (yield 1)[key()]}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(null).value===true&&log===\"k\"",
  "var s=Symbol(),o={[s]:7};function* f(){return o[yield 1]}var g=f();g.next();g.next(s).value===7",
  "function* f(){return (yield 1).length}var g=f();g.next();g.next(\"abc\").value===3",
  "Object.defineProperty(Number.prototype,\"x\",{get(){\"use strict\";return typeof this}});function* f(){return (yield 1).x}var g=f();g.next();g.next(7).value===\"number\"",
  "var n=0,o={get x(){n++;return 7}};function* f(){try{return o[yield 1]}catch(e){return e}}var g=f();g.next();g.throw(8).value===8&&n===0",
  "var n=0,o={get x(){n++;return 7}};function* f(){try{return o[yield 1]}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8&&n===0",
  "var o={get x(){throw 7}};function* f(){try{return o[yield 1]}catch(e){return e}}var g=f();g.next();g.next(\"x\").value===7",
  "var o={x:7};function* f(){try{return o[yield 1]}catch(e){return e}}var g=f();g.next();g.next({toString(){throw 8}}).value===8",
  "function* f(){return 1+(yield 1).x}var g=f();g.next();g.next({x:7}).value===8",
  "function* f(){return typeof (yield 1).x}var g=f();g.next();g.next({x:7}).value===\"number\"",
  "function* f(){return delete ((yield 1).x,7)}var g=f();g.next();g.next({x:8}).value===true",
  "function* inner(){yield 1;return {x:7}}function* f(){return (yield* inner()).x}var g=f();g.next().value===1&&g.next().value===7"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"member case "+i);}
for(const source of ['function* f(){return (yield 1)?.x}'])check(prepareBoundedScript({id:'boundary',text:source},new Realm((_line:string)=>{},'script')).kind==='blocked','member boundary '+source);
for(const source of ['async function f(){return (await Promise.resolve({x:7})).x}f().then(x=>out=x)', 'var o={x:7};async function f(){return o[await Promise.resolve("x")]}f().then(x=>out=x)', 'async function* f(){yield (await Promise.resolve({x:7})).x}f().next().then(r=>out=r.value)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async member result');
}
const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('function* f(){return (yield 1).x}var g=f();g.next();',A,creator);define(B,'g',own(A,'g'));const steps=creator.inspect().steps,session=createScriptSession();const result=run('g.next(null)',B,session);check(result.type==='throw'&&result.value.kind==='object'&&result.value.object.getPrototypeOf()===A.getErrorPrototype("TypeError"),'owner error prototype');check(creator.inspect().steps===steps,'current session budget');
{const realm=new Realm((_line:string)=>{},'script');const result=run('var out=0;function* f(){(yield 1).x()}var g=f();g.next();g.next({x(){out=7}}).done&&out===7',realm);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'original member call boundary');}
{const realm=new Realm((_line:string)=>{},'script');const result=run('function* f(){delete (yield 1).x}var o={x:7},g=f();g.next();g.next(o).done&&!Object.hasOwn(o,"x")',realm);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'original member delete boundary');}
{const realm=new Realm((_line:string)=>{},'script');const result=run('var o={};function* f(){(yield 1).x=7}var g=f();g.next();g.next(o).done&&o.x===7',realm);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'original member assignment boundary');}
console.log('generator member passed');
