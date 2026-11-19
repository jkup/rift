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
    "var o={*f(){yield* [];}};o.f().next().done;",
    'var o={x:2,*f(){yield this.x;yield this.x+1;}};Array.from(o.f()).join(",")==="2,3";',
    'var key=Symbol("key"),o={*[key](){yield 2;}};o[key].name==="[key]"&&o[key]().next().value===2;',
    'var n=0,o={*[(n++,"f")](){yield n;}};n===1&&o.f().next().value===1;',
    'var o={*f(a,b=2){yield a+b;}};o.f.length===1&&o.f.name==="f"&&o.f.toString()==="*f(a,b=2){yield a+b;}"&&o.f(3).next().value===5;',
    "var o={*get(){yield 1;},*set(){yield 2;},*__proto__(){yield 3;}};o.get().next().value===1&&o.set().next().value===2&&o.__proto__().next().value===3;",
    'var o={*f(){yield 1;}};var d=Object.getOwnPropertyDescriptor(o,"f"),caught=false;try{new o.f();}catch(e){caught=e instanceof TypeError;}d.enumerable&&d.writable&&d.configurable&&caught&&Object.hasOwn(o.f,"prototype");',
    "var base={x:2},o={__proto__:base,*f(){yield super.x;yield super.x;}};var g=o.f(),a=g.next();Object.setPrototypeOf(o,{x:5});a.value===2&&g.next().value===5;",
    'class C{constructor(x){this.x=x;}*f(){yield this.x;yield this.x+1;}}var c=new C(4);Array.from(c.f()).join(",")==="4,5"&&!Object.getOwnPropertyDescriptor(C.prototype,"f").enumerable;',
    'class C{static *range(n){for(let i=0;i<n;i++)yield i;}}Array.from(C.range(3)).join(",")==="0,1,2";',
    'class C{*[Symbol.iterator](){yield 1;yield 2;}}Array.from(new C()).join(",")==="1,2";',
    "class A{f(){return this.x;}}class B extends A{constructor(){super();this.x=7;}*g(){yield super.f();}}new B().g().next().value===7;",
    "class A{static f(){return this.x;}}class B extends A{static *g(){yield super.f();}}B.x=8;B.g().next().value===8;",
    "class C{*f(){yield this;}}var f=C.prototype.f;f().next().value===undefined;",
    "var o={*f(a){arguments[0]=9;yield a;}};o.f(2).next().value===9;",
    "class C{*f(a){arguments[0]=9;yield a;}}new C().f(2).next().value===2;",
];
for (let i = 0; i < cases.length; i++) {
    const r = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, "method case " + i);
}
for (const source of [
    "class C{*constructor(){}}",
    "var o={get *f(){}};",
    "var o={*f:1};",
    "var o={*f(a,a){}};",
    "class C{static *prototype(){}}",
]) {
    check(
        prepareBoundedScript(
            { id: "boundary", text: source },
            new Realm((_line: string): void => {}, "script"),
        ).kind === "blocked",
        "boundary " + source,
    );
}
console.log("generator methods passed");

const asyncMethod = run(
    "var o={async *f(){}};o.f().next() instanceof Promise;",
    new Realm((_line: string): void => {}, "script"),
);
check(
    asyncMethod.type === "normal" &&
        asyncMethod.value.kind === "boolean" &&
        asyncMethod.value.value,
    "original async generator method executes",
);
