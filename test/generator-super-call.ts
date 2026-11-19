import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
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
const cases = [
    'var o={__proto__:{m(){return 7}},*g(){return super[yield 1]()}};var g=o.g();g.next();g.next("m").value===7',
    'var o={__proto__:{m(v){return this.x+v}},x:3,*g(){return super[yield 1](yield 2)}};var g=o.g();g.next();g.next("m").value===2&&g.next(4).value===7',
    'var o={__proto__:{m(){return this.x}},*g(){return super[yield 1]()}},other={x:7};var g=o.g.call(other);g.next();g.next("m").value===7',
    'var n=0,o={__proto__:{get m(){n++;return function(v){return this.x+v}}},x:3,*g(){return super[yield 1](yield 2)}};var g=o.g();g.next();g.next("m");n===1&&g.next(4).value===7&&n===1',
    'var base={m(v){return this.x+v}},o={__proto__:base,x:3,*g(){return super[yield 1](yield 2)}};var g=o.g();g.next();g.next("m");base.m=function(){return 99};g.next(4).value===7',
    'var o={__proto__:{m(){return 3}},*g(){return super[yield 1]()}};var g=o.g();g.next();Object.setPrototypeOf(o,{m(){return 7}});g.next("m").value===7',
    'var o={__proto__:{m(){return 3}},*g(){return super[yield 1]()}},key={toString(){Object.setPrototypeOf(o,{m(){return 7}});return "m"}};var g=o.g();g.next();g.next(key).value===3',
    'var n=0,o={__proto__:{m:3},*g(){try{return super[yield 1](side())}catch(e){return e instanceof TypeError}}};function side(){n++;return 7}var g=o.g();g.next();g.next("m").value===true&&n===1',
    'var n=0,o={__proto__:null,*g(){try{return super[yield 1](side())}catch(e){return e instanceof TypeError}}};function side(){n++;return 7}var g=o.g();g.next();g.next("m").value===true&&n===0',
    'var n=0,o={__proto__:{get m(){throw 7}},*g(){try{return super[yield 1](side())}catch(e){return e}}};function side(){n++;return 8}var g=o.g();g.next();g.next("m").value===7&&n===0',
    'var o={__proto__:{m(a,b){return this.x+a+b}},x:1,*g(){return super[yield 1](...[2,4])}};var g=o.g();g.next();g.next("m").value===7',
    "var s=Symbol(),o={__proto__:{[s](){return this.x}},x:7,*g(){return super[yield 1]()}};var g=o.g();g.next();g.next(s).value===7",
    'class A{m(){return this.x}}class B extends A{constructor(){super();this.x=7}*g(){return super[yield 1]()}}var g=new B().g();g.next();g.next("m").value===7',
    'class A{static m(){return this.x}}class B extends A{static *g(){return super[yield 1]()}}B.x=7;var g=B.g();g.next();g.next("m").value===7',
    'var x=7,o={__proto__:{eval},*g(){var x=99;return super[yield 1]("x")}};var g=o.g();g.next();g.next("eval").value===7',
    "var n=0,o={__proto__:{get m(){n++;return function(){return 7}}},*g(){try{return super[yield 1]()}finally{yield 2}}};var g=o.g();g.next();g.return(8).value===2&&g.next().value===8&&n===0",
    "var n=0,o={__proto__:{get m(){n++;return function(){return 7}}},*g(){try{return super[yield 1]()}catch(e){return e}}};var g=o.g();g.next();g.throw(8).value===8&&n===0",
    'var o={__proto__:{m(){throw 7}},*g(){try{return super[yield 1]()}catch(e){return e}}};var g=o.g();g.next();g.next("m").value===7',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "super call case " + i,
    );
}
for (const source of [
    'var o={__proto__:{m(v){return this.x+v}},x:3,async f(){return super[await Promise.resolve("m")](await Promise.resolve(4))}};o.f().then(v=>out=v)',
    'var o={__proto__:{m(){return this.x}},x:7,async *f(){yield super[await Promise.resolve("m")]()}};o.f().next().then(r=>out=r.value)',
    'var o={__proto__:{m(){return this.x}},x:7,f(){return async ()=>super[await Promise.resolve("m")]()}};o.f()().then(v=>out=v)',
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async super call result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "var o={__proto__:{m:3},*f(){return super[yield 1]()}},p={__proto__:{m(){while(true){}}},*f(){return super[yield 1]()}};var g=o.f(),h=p.f();g.next();h.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run('g.next("m")', B, session);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "super call error Realm",
);
const stopped = run('h.next("m")', B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "super method current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator super call passed");
