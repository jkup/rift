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
  "function* f(){for(yield 1;;){yield 7;break}return 8}var g=f();g.next().value===1&&g.next().value===7&&g.next().value===8",
  "var n=0;function init(x){n++;return x}function* f(){for(init(yield 1);false;){}return n}var g=f();g.next();g.next(7).value===1&&n===1",
  "var trace=\"\",i=0;function init(){trace+=\"i\"}function test(){trace+=\"t\";return i<2}function update(){trace+=\"u\";i++}function* f(){for((init(),yield 1);test();update()){trace+=\"b\";yield i}return trace}var g=f();g.next();g.next().value===0&&g.next().value===1&&g.next().value===\"itbutbut\"",
  "var i=0,n=0;function init(){n++}function* f(){outer:for((init(),yield 1);i<2;i++){yield i;continue outer}return n}var g=f();g.next();g.next().value===0&&g.next().value===1&&g.next().value===1",
  "function* f(){outer:for(yield 1;;){for(;;){yield 2;break outer}}return 7}var g=f();g.next();g.next().value===2&&g.next().value===7",
  "var n=0;function test(){n++;return true}function* f(){try{for(yield 1;test();){yield 9}}finally{yield 2}}var g=f();g.next();g.return(7).value===2&&g.next().value===7&&n===0",
  "var n=0;function test(){n++;return true}function* f(){try{for(yield 1;test();){yield 9}}catch(e){return e}}var g=f();g.next();g.throw(7).value===7&&n===0",
  "function fail(){throw 7}function* f(){try{for(fail(yield 1);;){yield 9}}catch(e){return e}}var g=f();g.next();g.next().value===7",
  "function* f(){var i=0;for(yield 1;yield 2;yield 3){yield 4;if(++i===2)break}return 7}var g=f();g.next().value===1&&g.next().value===2&&g.next(true).value===4&&g.next().value===3&&g.next().value===2&&g.next(true).value===4&&g.next().value===7",
  "function* f(){var out=\"\";for(yield 1;false;){}out+=\"a\";for(yield 2;false;){}return out+\"b\"}var g=f();g.next();g.next().value===2&&g.next().value===\"ab\"",
  "function* inner(){yield 1;return 7}function* f(){for(yield* inner();false;){}return 8}var g=f();g.next().value===1&&g.next().value===8"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"for initializer case "+i);}
for(const source of ['async function f(){for(await Promise.resolve(1);false;){}return 7}f().then(v=>out=v)', 'async function* f(){for(await Promise.resolve(1);;){yield 7;break}}f().next().then(r=>out=r.value)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async initializer result');
}
const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('function* f(){for(yield 1;false;){}return 7}var g=f();g.next();function* slow(){for(yield 1;;){}}var h=slow();h.next();',A,creator);define(B,'g',own(A,'g'));define(B,'h',own(A,'h'));const steps=creator.inspect().steps,session=createScriptSession();const result=run('g.next().value===7',B,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'cross-Realm initializer');const stopped=run('h.next()',B,createScriptSession({maxSteps:100,maxCalls:16}));check(stopped.type==='throw'&&stopped.origin.kind==='resource-limit','initializer current budget');check(creator.inspect().steps===steps,'creator session untouched');
for(const source of ['function* f(){for(let i=yield 1;;){}}'])check(prepareBoundedScript({id:'declaration-boundary',text:source},new Realm((_line:string)=>{},'script')).kind==='blocked','declaration initializer boundary');
{const realm=new Realm((_line:string)=>{},'script');const result=run('function* f(){for(var i=yield 1;;){}}var g=f();g.next().value===1&&g.return(7).value===7',realm);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'original var initializer boundary');}
console.log('generator for initializer passed');
