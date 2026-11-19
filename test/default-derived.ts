import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const p = prepareBoundedScript({ id: "default-derived", text }, realm);
    if (p.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: 20000, maxCalls: 32 }), p.record)
        .completion;
}
function truth(text: string, realm = new Realm((_line: string) => {}, "script")): void {
    const r = run(text, realm);
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, text);
}
for (const text of [
    "class B{constructor(a,b){this.v=a+b}get x(){return this.v}}class D extends B{}var d=new D(3,4);d.x===7&&d instanceof B&&d instanceof D",
    "class B{}class D extends B{}Object.getPrototypeOf(D)===B&&Object.getPrototypeOf(D.prototype)===B.prototype&&D.length===0&&D.name==='D'",
    "class B{static get x(){return this.name}static m(){return this}}class D extends B{}D.x==='D'&&D.m()===D",
    "class B{constructor(){return new.target}}class D extends B{}class E extends D{}new E()===E",
    "class B{constructor(a,b){this.v=a+b}}class D extends B{}Array.prototype[Symbol.iterator]=function(){throw 7};new D(3,4).v===7",
    "var marker={};class B{constructor(){return marker}}class D extends B{}new D()===marker",
    "class B{constructor(){this.v=1}}class C{constructor(){this.v=2}}class D extends B{}Object.setPrototypeOf(D,C);new D().v===2",
    "class B{}class D extends B{}Object.setPrototypeOf(D,null);var caught=false;try{new D()}catch(e){caught=e instanceof TypeError}caught",
    "var B=function(){this.v=1};class D extends B{}B=function(){this.v=2};new D().v===1",
    "function B(){}B.prototype=null;class D extends B{}Object.getPrototypeOf(D.prototype)===null&&Object.getPrototypeOf(new D())===D.prototype",
    "class D extends null{}Object.getPrototypeOf(D)===Function.prototype&&Object.getPrototypeOf(D.prototype)===null",
    "class D extends null{}var caught=false;try{new D()}catch(e){caught=e instanceof TypeError}caught",
    "class B{}class D extends B{}var caught=false;try{D()}catch(e){caught=e instanceof TypeError}caught",
    "var caught=0;for(var base of [undefined,false,0,{},()=>{}]){try{var D=class extends base{}}catch(e){if(e instanceof TypeError)caught++}}caught===5",
    "function B(){}B.prototype=7;var caught=false;try{class D extends B{}}catch(e){caught=e instanceof TypeError}caught",
    "var caught=false;try{class D extends D{}}catch(e){caught=e instanceof ReferenceError}caught",
    "class B{}var caught=false;try{var D=class D extends D{}}catch(e){caught=e instanceof ReferenceError}caught",
    "class B{}class D extends (function(){if(this!==undefined)throw 7;return B})(){}new D() instanceof B",
    "var trace='',B=(function(){}).bind(null),p={};Object.defineProperty(B,'prototype',{get(){trace+='P';return p}});function heritage(){trace+='H';return B}class D extends heritage(){[(trace+='K','m')](){return 7}}trace==='HPK'&&Object.getPrototypeOf(D.prototype)===p&&new D().m()===7",
    "var token={},B=(function(){}).bind(null),n=0,caught=false;Object.defineProperty(B,'prototype',{get(){throw token}});try{class D extends B{[(n++,'m')](){}}}catch(e){caught=e===token}caught&&n===0",
    "class B{}class D extends B{}D.toString()==='class D extends B{}'",
    "class B{}var D=class extends B{};D.name==='D'&&D.toString()==='class extends B{}'",
    "class B{constructor(a){this.v=a;this.nt=new.target}}var Bound=B.bind(null,7);Bound.prototype=B.prototype;class D extends Bound{}var x=new D();x.v===7&&x.nt===D",
    "class D extends Array{}var x=new D(1,2);Array.isArray(x)&&x.length===2&&x[1]===2&&x instanceof D&&x instanceof Array",
    "class D extends Map{}var x=new D([[1,7]]);x.get(1)===7&&x instanceof D",
    "class D extends Set{}var x=new D([1,2]);x.has(2)&&x.size===2&&x instanceof D",
    "class D extends Number{}var x=new D('7');x.valueOf()===7&&x instanceof D",
    "class D extends String{}var x=new D('ab');x.valueOf()==='ab'&&x.length===2&&x instanceof D",
    "class D extends Boolean{}var x=new D(1);x.valueOf()===true&&x instanceof D",
    "class D extends Error{}var x=new D('message',{cause:7});x.message==='message'&&x.cause===7&&x instanceof D&&x instanceof Error",
    "class D extends Object{}var old={x:7},x=new D(old);x!==old&&x.x===undefined&&x instanceof D",
    "class D extends Function{}var f=new D('x','return x+1');f(6)===7&&f instanceof D&&f instanceof Function",
    "class D extends Symbol{}var caught=false;try{new D()}catch(e){caught=e instanceof TypeError}caught&&Object.getPrototypeOf(D)===Symbol",
    "class B{constructor(){this.nt=new.target}}class D extends B{}function N(){}var x=Reflect.construct(D,[],N);x.nt===N&&x instanceof N",
    "class B{}class D extends (class extends B{}){}new D() instanceof B",
    "class B{}class D extends B{['constructor'](){return 7}}new D().constructor()===7",
]) {
    truth(text);
}
for (const text of [
    "class B{}class D extends B{constructor(){}}",
    "class B{}class D extends B{constructor(){super()}}",
]) {
    check(run(text).type === "normal", "explicit constructor preparation: " + text);
}
check(
    run("class B{}class D extends B{m(){return super.x}}").type === "normal",
    "super property method declaration",
);
for (const text of ["class D extends -1{}", "class D extends (function(){})++{}"]) {
    check(
        prepareBoundedScript(
            { id: "derived-boundary", text },
            new Realm((_line: string) => {}, "script"),
        ).kind !== "ready",
        text,
    );
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
for (const [name, source] of [
    ["Base", "class B{constructor(){this.nt=new.target}}B"],
    ["NullDerived", "class D extends null{}D"],
    ["ForeignTypeError", "TypeError"],
]) {
    const r = run(source, owner);
    if (r.type !== "normal") {
        throw new Error("foreign setup");
    }
    caller.defineScriptGlobal(name, { value: r.value });
}
truth(
    "class D extends Base{}var x=new D();x.nt===D&&Object.getPrototypeOf(x)===D.prototype&&x instanceof Base",
    caller,
);
truth(
    "var caught=false;try{new NullDerived()}catch(e){caught=e instanceof ForeignTypeError&&!(e instanceof TypeError)}caught",
    caller,
);
const limited = run("class B{}var D=B;for(var i=0;i<50;i++){D=class extends D{}}new D()");
check(
    limited.type === "throw" && limited.origin.kind === "resource-limit",
    "derived constructor call budget",
);
console.log("Default derived classes passed");
