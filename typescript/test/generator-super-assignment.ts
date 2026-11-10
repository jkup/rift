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
  "var base={x:3},o={__proto__:base,*g(){return (super[yield 1]=7)}};var g=o.g();g.next();g.next(\"x\").value===7&&o.x===7&&base.x===3",
  "var base={set x(v){this.y=v}},o={__proto__:base,*g(){return (super[yield 1]=7)}};var g=o.g();g.next();g.next(\"x\").value===7&&o.y===7&&!Object.hasOwn(o,\"x\")",
  "var base={get x(){throw 8},set x(v){this.y=v}},o={__proto__:base,*g(){return (super[yield 1]=7)}};var g=o.g();g.next();g.next(\"x\").value===7&&o.y===7",
  "var base={set x(v){this.y=v}},o={__proto__:base,*g(){return (super[yield 1]=7)}},other={};var g=o.g.call(other);g.next();g.next(\"x\").value===7&&other.y===7&&!Object.hasOwn(o,\"y\")",
  "var o={__proto__:{set x(v){this.y=v}},*g(){return (super[yield 1]=yield 2)}};var g=o.g();g.next();g.next(\"x\").value===2&&g.next(7).value===7&&o.y===7",
  "var o={__proto__:{set x(v){this.y=v}},*g(){return (super[yield 1]=7)}};var g=o.g();g.next();Object.setPrototypeOf(o,{set x(v){this.y=v+1}});g.next(\"x\").value===7&&o.y===8",
  "var base={set x(v){this.y=v}},o={__proto__:base,*g(){return (super[yield 1]=yield 2)}};var g=o.g();g.next();g.next(\"x\");Object.setPrototypeOf(o,{set x(v){this.y=99}});g.next(7).value===7&&o.y===7",
  "var base={set x(v){this.y=v}},o={__proto__:base,*g(){return (super[yield 1]=yield 2)}};var g=o.g();g.next();g.next(\"x\");Object.defineProperty(base,\"x\",{set(v){this.y=v+1}});g.next(6).value===6&&o.y===7",
  "var log=\"\",key={toString(){log+=\"k\";return \"x\"}},o={__proto__:{set x(v){log+=\"s\"+v}},*g(){return (super[yield 1]=rhs())}};function rhs(){log+=\"r\";return 7}var g=o.g();g.next();g.next(key).value===7&&log===\"rks7\"",
  "var log=\"\",key={toString(){log+=\"k\";return \"x\"}},o={__proto__:null,*g(){try{return (super[yield 1]=rhs())}catch(e){return e instanceof TypeError}}};function rhs(){log+=\"r\";return 7}var g=o.g();g.next();g.next(key).value===true&&log===\"r\"",
  "var base={};Object.defineProperty(base,\"x\",{value:3});var o={__proto__:base,*g(){\"use strict\";try{return (super[yield 1]=7)}catch(e){return e instanceof TypeError}}};var g=o.g();g.next();g.next(\"x\").value===true&&!Object.hasOwn(o,\"x\")",
  "var s=Symbol(),base={[s]:3},o={__proto__:base,*g(){return (super[yield 1]=7)}};var g=o.g();g.next();g.next(s).value===7&&o[s]===7&&base[s]===3",
  "class A{set x(v){this.y=v}}class B extends A{*g(){return (super[yield 1]=7)}}var o=new B(),g=o.g();g.next();g.next(\"x\").value===7&&o.y===7",
  "var n=0,o={__proto__:{set x(v){n++}},*g(){try{return (super[yield 1]=7)}finally{yield 2}}};var g=o.g();g.next();g.return(8).value===2&&g.next().value===8&&n===0",
  "var n=0,o={__proto__:{set x(v){n++}},*g(){try{return (super[yield 1]=7)}catch(e){return e}}};var g=o.g();g.next();g.throw(8).value===8&&n===0",
  "var o={__proto__:{},*g(){return (super[yield 1]=function(){}).name}};var g=o.g();g.next();g.next(\"x\").value===\"\"&&o.x.name===\"\"",
  "var o={__proto__:{},*g(){super[yield 1]=7;return this.x}};var g=o.g();g.next();g.next(\"x\").value===7"
];
for(let i=0;i<cases.length;i++){const result=run(cases[i],new Realm((_line:string)=>{},"script"));check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"super assignment case "+i);}
for(const source of ['var o={__proto__:{},async f(){return (super[await Promise.resolve("x")]=7)}};o.f().then(v=>out=v)', 'var o={__proto__:{},async *f(){yield (super[await Promise.resolve("x")]=await Promise.resolve(7))}};o.f().next().then(r=>out=r.value)', 'var o={__proto__:{},f(){return async ()=>super[await Promise.resolve("x")]=7}};o.f()().then(v=>out=v)']){
 const realm=new Realm((_line:string)=>{},'script'),session=createScriptSession();check(run('var out=0;'+source,realm,session).type==='normal','async setup');const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,'async jobs');const result=run('out===7',realm,session);check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'async super assignment result');
}
const A=new Realm((_line:string)=>{},'script'),B=new Realm((_line:string)=>{},'script'),creator=createScriptSession();run('var o={__proto__:null,*f(){return (super[yield 1]=7)}},p={__proto__:{set x(v){while(true){}}},*f(){return (super[yield 1]=7)}};var g=o.f(),h=p.f();g.next();h.next();',A,creator);define(B,'g',own(A,'g'));define(B,'h',own(A,'h'));const steps=creator.inspect().steps,session=createScriptSession();const result=run('g.next("x")',B,session);check(result.type==='throw'&&result.value.kind==='object'&&result.value.object.getPrototypeOf()===A.getErrorPrototype('TypeError'),'super assignment error Realm');const stopped=run('h.next("x")',B,createScriptSession({maxSteps:100,maxCalls:16}));check(stopped.type==='throw'&&stopped.origin.kind==='resource-limit','super setter current budget');check(creator.inspect().steps===steps,'creator session untouched');
console.log('generator super assignment passed');
