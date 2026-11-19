import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    type ScriptSession,
} from "../src/script-execution.js";
import { type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    source: string,
    realm: Realm,
    session: ScriptSession = createScriptSession(),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "generator-start", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + prepared.kind + ": " + source);
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller state restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("missing " + name);
    }
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
const cases: string[] = [
    'var read;function f({[(read=()=>a,"x")]:a}){var a=2;return read();}f({x:7})===7;',
    "var read;function f([a=(read=()=>a,7)]){var a=2;return read();}f([])===7;",
    "function f([a=arguments[0]]){return a;}var x=[];f(x)===x;",
    "function f([a=arguments.length]){function arguments(){}return a;}f([])===1;",
    'function f({["x"]:a}){var a;return a;}f({x:7})===7;',
    'function f({[(eval("var z=7"),"x")]:a}){return z+a;}f({x:2})===9;',
    'function f({["x"]:a}){return function(){return a;};}var h=f({x:7});h()===7;',
    'var trace="";class B{}class C extends B{constructor([a=(trace+="A",7)]){super();this.a=a;}}new C([]).a===7&&trace==="A";',
    "var o={set x({}){this.ok=true;}};o.x={};o.ok;",
    "var x=3;function f([a=()=>x]){function x(){}return a();}f([])===3;",
    "function f([a=()=>b],b=1){var b=7;return a();}f([])===1;",
    "var closed=0;function f([a]){}var it={next(){throw 7;},return(){closed++;return {};},[Symbol.iterator](){return this;}};var caught;try{f(it);}catch(e){caught=e;}caught===7&&closed===0;",
    "function f([a,b],{c}){return a+b+c;}f([1,2],{c:3})===6&&f.length===2;",
    "function f({},[]){return arguments.length;}f({},[])===2&&f.length===2;",
    "function f([a,[b]],{c:{d}}){return a+b+d;}f([1,[2]],{c:{d:3}})===6;",
    "function f([a=2,...rest]=[]){return a+rest.length;}f()===2&&f([3,4,5])===5&&f.length===0;",
    "function f(a,{b=2},c=3){}f.length===2;",
    "function f(...[a,b,...rest]){return a+b+rest.length;}f(2,3,4,5)===7&&f.length===0;",
    "function f(...{length:n,0:a}){return n+a;}f(3,4)===5;",
    "function f({a,...rest}){return a+rest.b;}f({a:2,b:3})===5;",
    "function f(a,[b]){a=7;arguments[1]=[9];return arguments[0]===1&&b===2;}f(1,[2]);",
    "function f([arguments]){return arguments;}f([7])===7;",
    "function f([a]){var a;return a;}f([7])===7;",
    "function f([a]){function a(){return 9;}return a();}f([7])===9;",
    "var x=9;function f([a=()=>x]){var x=2;return a();}f([])===9;",
    'var x=9;function f({["a"]:a}){var a=2;return a;}f({a:7})===2;',
    "function f([a=()=>b],b=7){return a();}f([])===7;",
    "function f([a=b],b=7){}var caught=false;try{f([]);}catch(e){caught=e instanceof ReferenceError;}caught;",
    'var trace="";function f({[trace+="K"]:a=(trace+="D",2)}){trace+="B";return a;}f({})===2&&trace==="KDB";',
    'function f([a=function(){}],{b=()=>0}){return a.name+b.name;}f([],{})==="ab";',
    "var n=0;function* f([a=(n++,7)]){n+=10;yield a;}var g=f([]);var before=n;before===1&&g.next().value===7&&n===11;",
    "var entered=false;function* f([a]){entered=true;yield a;}var caught=false;try{f(null);}catch(e){caught=e instanceof TypeError;}caught&&!entered;",
    "var o={m([a]){return a;},*g({a}){yield a;},set x([a,b]){this.v=a+b;}};o.x=[2,3];o.m([7])===7&&o.g({a:8}).next().value===8&&o.v===5;",
    "class C{constructor([a]){this.a=a;}m({b}){return this.a+b;}*g([x]){yield x;}}var c=new C([2]);c.m({b:3})===5&&c.g([7]).next().value===7;",
    'var F=Function("[a]","{b}","return a+b;");F([2],{b:3})===5&&F.length===2;',
    'function* empty(){}var G=Object.getPrototypeOf(empty).constructor,F=G("[a]","yield a;");F([7]).next().value===7;',
    "var closed=0,it={next(){return {done:false,value:7};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function f([a]){return a;}f(it)===7&&closed===1;",
    "var marker={},closed=0,it={next(){return {done:false,value:undefined};},return(){closed++;throw 9;},[Symbol.iterator](){return this;}};function boom(){throw marker;}function f([a=boom()]){}var caught;try{f(it);}catch(e){caught=e;}caught===marker&&closed===1;",
    'var k="x";function f({[k]:a=()=>a}){var a=2;return a;}f({x:7})===2;',
    'function f([a=eval("var z=7; z")]){return a+z;}f([])===14;',
    "function f([a=()=>a]){var a=7;return a;}f([])===7;",
    'function f([a]){"x";return a;}f([7])===7;',
    "function f([a],b){return arguments.callee;}var caught=false;try{f([1],2);}catch(e){caught=e instanceof TypeError;}caught;",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "formal case " + i,
    );
}
for (const source of [
    "function f([a],a){}",
    "function f({a},[a]){}",
    "function f([a]){let a;}",
    'function f({}){"use strict";}',
    "function f(...[a]=[]){}",
    "function f(...[a],b){}",
    "var o={get x([a]){}};",
    "var o={set x({},a){}};",
    "function* f([a=yield 1]){}",
]) {
    check(
        prepareBoundedScript(
            { id: "boundary", text: source },
            new Realm((_line: string): void => {}, "script"),
        ).kind !== "ready",
        "formal boundary " + source,
    );
}
const A = new Realm((_line: string): void => {}, "script"),
    B = new Realm((_line: string): void => {}, "script");
const creator = createScriptSession();
run(
    "function* f([a]){yield a;}function work([a=spin()]){}function spin(){while(true){}}",
    A,
    creator,
);
define(B, "f", own(A, "f"));
define(B, "work", own(A, "work"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const failed = run("f(null);", B, session);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "formal error Realm",
);
check(creator.inspect().steps === steps && session.inspect().steps > 0, "formal current session");
const stopped = run("work([]);", B, createScriptSession({ maxSteps: 80, maxCalls: 16 }));
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "formal resource stop");
const arrow = run("var f=([a])=>a;f([7])===7;", new Realm((_line: string): void => {}, "script"));
check(
    arrow.type === "normal" && arrow.value.kind === "boolean" && arrow.value.value,
    "preserved arrow formal input",
);
console.log("formal pattern passed");
