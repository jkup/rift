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
  "var o={};function* f(){return ((yield 1).x=7)}var g=f();g.next();g.next(o).value===7&&o.x===7",
  "var o={};function* f(){return (o[yield 1]=7)}var g=f();g.next();g.next(\"x\").value===7&&o.x===7",
  "var o={};function* f(){return ((yield 1)[yield 2]=yield 3)}var g=f();g.next();g.next(o).value===2&&g.next(\"x\").value===3&&!Object.hasOwn(o,\"x\")&&g.next(7).value===7&&o.x===7",
  "var o={},old=o;function* f(){return (o[yield 1]=7)}var g=f();g.next();o={};g.next(\"x\").value===7&&old.x===7&&!Object.hasOwn(o,\"x\")",
  "var log=\"\",key={toString(){log+=\"k\";return \"x\"}},o={set x(v){log+=\"s\"+v}};function rhs(){log+=\"r\";return 7}function* f(){return (o[yield 1]=rhs())}var g=f();g.next();g.next(key).value===7&&log===\"rks7\"",
  "var log=\"\",key={toString(){log+=\"k\";return \"x\"}};function rhs(){log+=\"r\";return 7}function* f(){try{return ((yield 1)[yield 2]=rhs())}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(null).value===2&&g.next(key).value===true&&log===\"r\"",
  "var o={get x(){throw 8},set x(v){this.y=v}};function* f(){return (o[yield 1]=7)}var g=f();g.next();g.next(\"x\").value===7&&o.y===7",
  "var o={},key={toString(){return \"x\"}};function* f(){return (o[yield 1]=yield 2)}var g=f();g.next();g.next(key);key.toString=function(){return \"y\"};g.next(7).value===7&&o.y===7&&!Object.hasOwn(o,\"x\")",
  "var n=0,o={set x(v){n=v}};function* f(){return ((yield 1).x=yield 2)}var g=f();g.next();g.next(o);Object.defineProperty(o,\"x\",{set(v){n=v+1}});g.next(6).value===6&&n===7",
  "var o={};Object.defineProperty(o,\"x\",{value:1});function* f(){\"use strict\";try{return (o[yield 1]=7)}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(\"x\").value===true&&o.x===1",
  "var o={};Object.defineProperty(o,\"x\",{value:1});function* f(){return (o[yield 1]=7)}var g=f();g.next();g.next(\"x\").value===7&&o.x===1",
  "var s=Symbol(),o={};function* f(){return (o[yield 1]=7)}var g=f();g.next();g.next(s).value===7&&o[s]===7",
  "function* f(){return ((yield 1).x=7)}var g=f();g.next();g.next(3).value===7",
  "function* f(){\"use strict\";try{return ((yield 1).x=7)}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(3).value===true",
  "var n=0;function rhs(){n++;return 7}function* f(){try{return ((yield 1).x=rhs())}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8&&n===0",
  "var n=0,o={};function rhs(){n++;return 7}function* f(){try{return (o[yield 1]=rhs())}catch(e){return e}}var g=f();g.next();g.throw(8).value===8&&n===0&&!Object.hasOwn(o,\"x\")",
  "var o={};function* f(){return (o[yield 1]=function(){}).name}var g=f();g.next();g.next(\"x\").value===\"\"&&o.x.name===\"\"",
  "var o={};function* f(){return ((yield 1).x=7)+1}var g=f();g.next();g.next(o).value===8&&o.x===7",
  "var o={},x=0;function* f(){return (x=((yield 1).x=7))}var g=f();g.next();g.next(o).value===7&&x===7&&o.x===7",
  "var o={};function* f(){(yield 1).x=7;return o.x}var g=f();g.next();g.next(o).value===7",
  "var o={};function* f(){return ((yield 1).x=(yield 2).x=7)}var g=f();g.next();g.next(o);var p={};g.next(p).value===7&&o.x===7&&p.x===7"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"assignment target case "+i);}
for(const source of ['async function f(){var o={};return (o[await Promise.resolve("x")]=7)}f().then(v=>out=v)', 'async function* f(){var o={};yield ((await Promise.resolve(o)).x=await Promise.resolve(7))}f().next().then(r=>out=r.value)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async assignment target result');
}
const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('function* f(){"use strict";return ((yield 1).x=7)}var g=f();g.next();function* slow(){return ((yield 1).x=7)}var h=slow();h.next();',A,creator);define(B,'g',own(A,'g'));define(B,'h',own(A,'h'));const steps=creator.inspect().steps,session=createScriptSession();const result=run('g.next(null)',B,session);check(result.type==='throw'&&result.value.kind==='object'&&result.value.object.getPrototypeOf()===A.getErrorPrototype('TypeError'),'target error Realm');const stopped=run('h.next({set x(v){while(true){}}})',B,createScriptSession({maxSteps:100,maxCalls:16}));check(stopped.type==='throw'&&stopped.origin.kind==='resource-limit','target setter current budget');check(creator.inspect().steps===steps,'creator session untouched');
for(const source of ['function* f(){return (yield 1).x++}'])check(prepareBoundedScript({id:'boundary',text:source},new Realm((_line:string)=>{},'script')).kind==='blocked','remaining target boundary');
{const realm=new Realm((_line:string)=>{},'script');const result=run('function* f(){return ((yield 1).x+=7)}var o={x:0},g=f();g.next();g.next(o).value===7&&o.x===7',realm);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'original compound target boundary');}
console.log('generator assignment target passed');
