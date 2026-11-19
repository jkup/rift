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
  "function* f(){return {x:yield 1}}var g=f();g.next();g.next(7).value.x===7",
  "function* f(){return {[yield 1]:7}}var g=f();g.next();g.next(\"x\").value.x===7",
  "var log=\"\",key={toString(){log+=\"k\";return \"x\"}};function* f(){return {[yield 1]:yield 2}}var g=f();g.next();g.next(key).value===2&&log===\"k\"&&g.next(7).value.x===7",
  "function* f(){return {a:yield 1,f:function(){}}}var g=f();g.next();g.next(7).value.f.name===\"f\"",
  "function* f(){return {[yield 1]:function(){}}}var g=f();g.next();g.next(\"x\").value.x.name===\"x\"",
  "var s=Symbol(\"x\");function* f(){return {[yield 1]:function(){}}}var g=f();g.next();g.next(s).value[s].name===\"[x]\"",
  "function* f(){return {a:yield 1,__proto__:function(){}}}var g=f();g.next();var o=g.next(7).value;Object.getPrototypeOf(o).name===\"\"&&!Object.hasOwn(o,\"__proto__\")",
  "function* f(){return {[yield 1]:7}}var g=f();g.next();var o=g.next(\"__proto__\").value;Object.getPrototypeOf(o)===Object.prototype&&Object.hasOwn(o,\"__proto__\")&&o.__proto__===7",
  "function* f(){return {__proto__:{x:7},a:yield 1,m(){return super.x}}}var g=f();g.next();g.next(2).value.m()===7",
  "function* f(){return {[yield 1](){return super.x},__proto__:{x:7}}}var g=f();g.next();var o=g.next(\"m\").value;o.m()===7&&o.m.name===\"m\"",
  "function* f(){return {a:yield 1,get x(){return this.a},set x(v){this.a=v}}}var g=f();g.next();var o=g.next(7).value;var before=o.x;o.x=8;before===7&&o.x===8&&Object.getOwnPropertyDescriptor(o,\"x\").get.name===\"get x\"",
  "function* f(){return {get [yield 1](){return 7}}}var g=f();g.next();var o=g.next(\"x\").value;o.x===7&&Object.getOwnPropertyDescriptor(o,\"x\").get.name===\"get x\"",
  "function* f(){return {a:1,...(yield 2),b:3}}var g=f();g.next();var o=g.next({a:4,x:7}).value;o.a===4&&o.x===7&&o.b===3&&Object.keys(o).join(\":\")===\"a:x:b\"",
  "var n=0,o={get x(){n++;return 7}};function* f(){return {...(yield 1)}}var g=f();g.next();var r=g.next(o).value;r.x===7&&n===1&&Object.getOwnPropertyDescriptor(r,\"x\").get===undefined",
  "var s=Symbol(),o={[s]:7};Object.defineProperty(o,\"hidden\",{value:8});function* f(){return {...(yield 1)}}var g=f();g.next();var r=g.next(o).value;r[s]===7&&!Object.hasOwn(r,\"hidden\")",
  "var n=0,p={set x(v){n++}};function* f(){return {__proto__:yield 1,x:7}}var g=f();g.next();var o=g.next(p).value;Object.getPrototypeOf(o)===p&&o.x===7&&n===0",
  "function* f(){return {a:{b:yield 1},[yield 2]:8}}var g=f();g.next();g.next(7);var o=g.next(\"x\").value;o.a.b===7&&o.x===8",
  "var n=0,key={toString(){n++;return \"x\"}};function* f(){try{return {[yield 1]:7}}finally{yield 2}}var g=f();g.next();g.return(key).value===2&&g.next().value===key&&n===0",
  "var n=0;function side(){n++;return 7}function* f(){try{return {[yield 1]:side()}}catch(e){return e}}var g=f();g.next();g.throw(8).value===8&&n===0",
  "var n=0;function side(){n++;return 7}function* f(){try{return {[yield 1]:side()}}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next({[Symbol.toPrimitive](){return {}}}).value===true&&n===0",
  "function* f(){return {[yield 1]:7}}var g=f();g.next();g.next(null).value.null===7",
  "function* f(){return {a:yield 1,C:class{}}}var g=f();g.next();g.next(7).value.C.name===\"C\"",
  "function* f(){return {x:yield 1}}var g=f();g.next();g.next(function(){}).value.x.name===\"\"",
  "var o={};Object.defineProperty(o,\"__proto__\",{value:7,enumerable:true});function* f(){return {...(yield 1)}}var g=f();g.next();var r=g.next(o).value;Object.getPrototypeOf(r)===Object.prototype&&r.__proto__===7",
  "function* f(){try{return {...(yield 1)}}catch(e){return e}}var g=f();g.next();g.next({get x(){throw 7}}).value===7"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"object case "+i);}
for(const source of ['async function f(){return {x:await Promise.resolve(7)}}f().then(o=>out=o.x)', 'async function f(){return {[await Promise.resolve("x")]:7}}f().then(o=>out=o.x)', 'async function* f(){yield {...(await Promise.resolve({x:7}))}}f().next().then(r=>out=r.value.x)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async object result');
}
const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('function* f(){return {x:yield 1}}var g=f();g.next();',A,creator);define(B,'g',own(A,'g'));define(B,'ownerPrototype',{kind:'object',object:A.objectPrototype});const steps=creator.inspect().steps,session=createScriptSession();const result=run('var o=g.next(7).value;o.x===7&&Object.getPrototypeOf(o)===ownerPrototype',B,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'object owner prototype');check(creator.inspect().steps===steps,'current object session');
console.log('generator object passed');
