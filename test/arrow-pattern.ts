import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
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
    "var f=([a,b],{c})=>a+b+c;f([1,2],{c:3})===6&&f.length===2;",
    "var f=({},[])=>7;f({},[])===7&&f.length===2;",
    "var f=([a=2,...rest]=[])=>a+rest.length;f()===2&&f([3,4,5])===5&&f.length===0;",
    "var f=({a=3})=>a;f({})===3;",
    "var f=({a:{b=3}={}}={})=>b;f()===3;",
    "var f=(...[a,b,...rest])=>a+b+rest.length;f(2,3,4,5)===7&&f.length===0;",
    "var f=(...{length:n,0:a})=>n+a;f(3,4)===5;",
    "var f=({a,...rest})=>a+rest.b;f({a:2,b:3})===5;",
    "var f=([...[a,b]])=>a+b;f([2,3])===5;",
    "var f=([a=function(){}],{b=()=>0})=>a.name+b.name;f([],{})===\"ab\";",
    "var n=0,f=({[(n++,\"x\")]:a})=>a;f({x:7})===7&&n===1;",
    "var read,f=({[(read=()=>a,\"x\")]:a})=>{var a=2;return read();};f({x:7})===7;",
    "var x=9,f=([a=()=>x])=>{var x=2;return a();};f([])===9;",
    "var f=([a=()=>b],b=7)=>a();f([])===7;",
    "var f=([a=b],b=7)=>a,caught=false;try{f([]);}catch(e){caught=e instanceof ReferenceError;}caught;",
    "var o={x:7,m(){return ([a=this.x])=>a;}};o.m()([])===7;",
    "function outer(a){return ([b=arguments[0]])=>b;}outer(7)([])===7;",
    "function C(){this.f=([a=new.target])=>a;}var c=new C();c.f([])===C;",
    "var base={x:7},o={__proto__:base,m(){return ([a=super.x])=>a;}};o.m()([])===7;",
    "var f=([a=eval(\"var z=7; z\")])=>a+z;f([])===14;",
    "var f=([a])=>a;f.toString()===\"([a])=>a\";",
    "var f=([a=({b=7})=>b])=>a({});f([])===7;",
    "var x=2;([x]=[7]);x===7;",
    "var x=2;({x}={x:7});x===7;",
    "var a=[2],o={x:3};(a)[0]+(o).x===5;",
    "var f=({__proto__:a})=>a,o={};Object.defineProperty(o,\"__proto__\",{value:7});f(o)===7;",
    "var closed=0,it={next(){return {done:false,value:7};},return(){closed++;return {};},[Symbol.iterator](){return this;}};(([a])=>a)(it)===7&&closed===1;"
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "arrow pattern case " + i);
}
for (const source of [
    "([a],a)=>0;", "({a},[a])=>0;", "([a])=>{let a;};", "({})=>{\"use strict\";};",
    "(...[a]=[])=>0;", "(...[a],b)=>0;", "([a.b])=>0;", "({a:b.c})=>0;", "([(a)])=>0;",
    "({a:(b)})=>0;", "(([a]))=>0;", "([...[a],])=>0;", "({...a.b})=>0;", "({m(){}})=>0;",
    "({get x(){}})=>0;", "({a=1});", "([a])\n=>a;", "(1)=>0;", "(a.b)=>0;"
]) {
    check(prepareBoundedScript({id: "boundary", text: source}, new Realm((_line: string): void => {}, "script")).kind !== "ready", "arrow pattern boundary " + source);
}
const A = new Realm((_line: string): void => {}, "script"), B = new Realm((_line: string): void => {}, "script");
const creator = createScriptSession();run('var f=([a])=>a;', A, creator);define(B, "f", own(A, "f"));
const steps = creator.inspect().steps, session = createScriptSession();
const failed = run('f(null);', B, session);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"), "arrow pattern Realm");
check(creator.inspect().steps === steps && session.inspect().steps > 0, "arrow pattern current session");
console.log("arrow pattern passed");
