import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import {
    auditBoundedScriptNumericAssignments,
    auditBoundedScriptNumericSeparators,
} from "../src/parser.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, steps = 100000, realm = new Realm((_line: string) => {}, "script")) {
    const prepared = prepareBoundedScript({ id: "base-class", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function expect(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    "class aw\\u0061it{m(){return await}}new await().m()===await&&await.name==='await'",
    "var C=class aw\\u{61}it{m(){return await}};new C().m()===C&&C.name==='await'&&typeof await==='undefined'",
    "'use strict';class \\u0043{};C.name==='C'&&new C() instanceof C",
    "var C=class \\u{10400}{};C.name==='\\u{10400}'&&C.toString()==='class \\\\u{10400}{}'",
    "class C{};var c=new C();c instanceof C&&Object.getPrototypeOf(C)===Function.prototype&&Object.getPrototypeOf(C.prototype)===Object.prototype",
    "class C{constructor(x){this.x=x}get value(){return this.x}set value(x){this.x=x*2}static make(){return new C(7)}}var c=C.make();c.value=4;c.value===8",
    "var C=class Named{read(){return Named}};var D=C;C=7;new D().read()===D&&typeof Named==='undefined'",
    "class C{read(){return C}}var D=C;C=7;new D().read()===D",
    "class C{m(){return this}}var m=C.prototype.m;m()===undefined",
    "class C{constructor(){return 7}}new C() instanceof C",
    "var o={};class C{constructor(){return o}}new C()===o",
    "class C{};var ok=false;try{C()}catch(e){ok=e instanceof TypeError}ok",
    "class C{constructor(){}}var ok=false;try{C.call({})}catch(e){ok=e instanceof TypeError}ok",
    "class C{m(){}}var ok=false;try{new C.prototype.m()}catch(e){ok=e instanceof TypeError}ok",
    "class C{};var p=Object.getOwnPropertyDescriptor(C,'prototype'),c=Object.getOwnPropertyDescriptor(C.prototype,'constructor');!p.writable&&!p.enumerable&&!p.configurable&&c.value===C&&c.writable&&!c.enumerable&&c.configurable",
    "class C{m(){}static s(){}get x(){return 7}}var m=Object.getOwnPropertyDescriptor(C.prototype,'m'),g=Object.getOwnPropertyDescriptor(C.prototype,'x');m.writable&&!m.enumerable&&m.configurable&&!g.enumerable&&g.configurable&&C.s.name==='s'&&g.get.name==='get x'",
    "var log='';function k(s){log+=s;return s}class C{[k('a')](){return 1}static [k('b')](){return 2}}log==='ab'&&new C().a()===1&&C.b()===2",
    "var s=Symbol('x');class C{[s](){return 7}}new C()[s]()===7&&C.prototype[s].name==='[x]'",
    "class C{get(){return 1}set(){return 2}static(){return 3}static static(){return 4}}var c=new C();c.get()===1&&c.set()===2&&c.static()===3&&C.static()===4",
    "var ok=false;try{C;class C{}}catch(e){ok=e instanceof ReferenceError}ok",
    "var ok=false;try{class C{[C](){}}}catch(e){ok=e instanceof ReferenceError}ok",
    "var ok=false;try{class C{static ['prototype'](){}}}catch(e){ok=e instanceof TypeError}ok",
    "var C=class{};var o={x:class{}};var a;[a=class{}]=[];C.name==='C'&&o.x.name==='x'&&a.name==='a'",
    "class C{constructor(a,b=1,c){}}C.length===1",
    "class C { constructor() {} m() {} }C.toString()==='class C { constructor() {} m() {} }'&&C.prototype.m.toString()==='m() {}'",
    "var C=class { m() {} };C.toString()==='class { m() {} }'",
    "function f(x){class C{[arguments[0]](){return 7}}return new C().m()}f('m')===7",
    "class C{constructor(x){this.x=x}m(a=()=>this.x){return a()}}new C(7).m()===7",
]) {
    expect(text);
}
for (const text of [
    "class C{m(){return eval('C')}}new C().m()===C",
    "var ok=false;try{class C{[(missing=1)](){}}}catch(e){ok=e instanceof ReferenceError}ok&&typeof missing==='undefined'",
    "class C{m(){var ok=false;try{C=1}catch(e){ok=e instanceof TypeError}return ok}}new C().m()",
    "class C{get x(){return 1}set x(v){this.y=v}get x(){return 2}}var c=new C();c.x=7;c.x===2&&c.y===7",
    "class C{__proto__(){return 7}}new C().__proto__()===7&&Object.getPrototypeOf(C.prototype)===Object.prototype",
    "class C{['constructor'](){return 7}}new C() instanceof C&&C.prototype.constructor()===7",
    "var leak;try{class C{[(leak=()=>C,(()=>{throw 7})())](){}}}catch(e){}var ok=false;try{leak()}catch(e){ok=e instanceof ReferenceError}ok",
    "var ok=false;try{class C{constructor(){leaked=1}}new C()}catch(e){ok=e instanceof ReferenceError}ok",
    "function f(){class C{}return C}var A=f(),B=f();A!==B&&A.prototype!==B.prototype",
    "var C;{class C{m(){return 7}}var D=C}C===undefined&&new D().m()===7",
]) {
    expect(text);
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const foreign = run("class C{constructor(x){this.x=x}m(){return this.x}}C", 100000, owner);
if (foreign.type !== "normal") {
    throw new Error("class setup");
}
caller.defineScriptGlobal("Foreign", { value: foreign.value });
const instance = run("new Foreign(7)", 100000, caller);
check(
    instance.type === "normal" &&
        instance.value.kind === "object" &&
        instance.value.object.getPrototypeOf()?.getPrototypeOf() === owner.objectPrototype,
    "class defining Realm allocation",
);
const error = run("Foreign()", 100000, caller);
check(
    error.type === "throw" &&
        error.value.kind === "object" &&
        error.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
    "class defining Realm error",
);
for (const text of [
    "class C extends B{}",
    "class C{field=1}",
    "class C{static{}}",
    "class C{#x}",
    "class C{async m(){}}",
    "class C{*m(){}}",
    "class C{m(){super.x}}",
    "class C{constructor(){super()}}",
    "class C{constructor(){}constructor(){}}",
    "class C{get constructor(){}}",
    "class C{static prototype(){}}",
    "class C{m(eval){}}",
    "class C{m(){delete x}}",
    "class C{m(){var arguments}}",
    "class C{}var C",
    "if(true)class C{}",
    "label:class C{}",
]) {
    const prepared = prepareBoundedScript(
        { id: "invalid-class", text },
        new Realm((_line: string) => {}, "script"),
    );
    if (text === "class C extends B{}") {
        check(prepared.kind === "ready", "default derived preparation is inert");
        const missing = run(text);
        check(
            missing.type === "throw" && missing.diagnostic.name === "ReferenceError",
            "original heritage lookup occurs during execution",
        );
    } else if (text === "class C{m(){super.x}}") {
        check(
            prepared.kind === "ready" && run(text).type === "normal",
            "super property class method declaration",
        );
    } else if (text === "class C{async m(){}}") {
        check(prepared.kind === "ready", "async class preparation is inert");
        expect(text + ";new C().m() instanceof Promise;");
    } else if (text === "class C{*m(){}}") {
        check(prepared.kind === "ready", "generator class preparation is inert");
        const result = run(text + ";new C().m().next().done;");
        check(
            result.type === "normal" && result.value.kind === "boolean" && result.value.value,
            "original generator class executes",
        );
    } else if (text === "class C{field=1}") {
        check(prepared.kind === "ready", "field initializer preparation is inert");
        expect(text + ";new C().field===1;");
    } else if (text === "class C{#x}") {
        check(
            prepared.kind === "ready" && run(text).type === "normal",
            "original private field declaration executes",
        );
    } else if (text === "class C{static{}}") {
        check(
            prepared.kind === "ready" && run(text).type === "normal",
            "original static block executes",
        );
    } else {
        check(prepared.kind !== "ready", "reject " + text);
    }
}
check(
    auditBoundedScriptNumericAssignments("1=2;class C{field=1}").kind === "eligible",
    "field initializer permits assignment certification",
);
check(
    auditBoundedScriptNumericAssignments("1=2;class C{static{}}").kind === "eligible",
    "static block permits assignment certification",
);
check(
    auditBoundedScriptNumericAssignments("1=2;class C{#x}").kind === "eligible",
    "private field permits assignment certification",
);
check(
    auditBoundedScriptNumericSeparators("1_;class C extends B{}").kind === "eligible",
    "default inheritance permits numeric certification",
);
const limitedRealm = new Realm((_line: string) => {}, "script");
run("var caught=false;", 100000, limitedRealm);
const limited = run(
    "try{class C{[(()=>{while(true){}})()](){}}}catch(e){caught=true}",
    100,
    limitedRealm,
);
check(limited.type === "throw" && limited.origin.kind === "resource-limit", "computed key budget");
const caught = run("caught", 100000, limitedRealm);
check(
    caught.type === "normal" && caught.value.kind === "boolean" && !caught.value.value,
    "class fatal limit bypasses catch",
);
console.log("Base classes passed");
