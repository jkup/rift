import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
    type ScriptSession,
} from "../src/script-execution.js";
import { type Value, type ValueCompletion } from "../src/runtime.js";
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
    'var o={__proto__:{x:7},*g(){return super[yield 1]}};var g=o.g();g.next();g.next("x").value===7',
    'var base={get x(){return this.v}},o={__proto__:base,v:7,*g(){return super[yield 1]}};var g=o.g();g.next();g.next("x").value===7',
    'var base={get x(){return this.v}},o={__proto__:base,*g(){return super[yield 1]}},other={v:7};var g=o.g.call(other);g.next();g.next("x").value===7',
    'var o={__proto__:{x:3},*g(){return super[yield 1]}};var g=o.g();g.next();Object.setPrototypeOf(o,{x:7});g.next("x").value===7',
    'var base={x:3},o={__proto__:base,*g(){return super[yield 1]}},key={toString(){Object.setPrototypeOf(o,{x:7});return "x"}};var g=o.g();g.next();g.next(key).value===3&&Object.getPrototypeOf(o).x===7',
    'var n=0,key={toString(){n++;return "x"}},o={__proto__:{x:7},*g(){return super[yield 1]}};var g=o.g();g.next();g.next(key).value===7&&n===1',
    "var s=Symbol(),o={__proto__:{[s]:7},*g(){return super[yield 1]}};var g=o.g();g.next();g.next(s).value===7",
    "var o={__proto__:{null:7},*g(){return super[yield 1]}};var g=o.g();g.next();g.next(null).value===7",
    'class A{get x(){return this.v}}class B extends A{constructor(){super();this.v=7}*g(){return super[yield 1]}}var g=new B().g();g.next();g.next("x").value===7',
    'class A{}A.x=7;class B extends A{static *g(){return super[yield 1]}}var g=B.g();g.next();g.next("x").value===7',
    'var o={__proto__:{get x(){return this.v}},*g(){return super[yield 1]}},child=Object.create(o);child.v=7;var g=child.g();g.next();g.next("x").value===7',
    'var o={__proto__:{x:7},*g(){return 1+super[yield 1]}};var g=o.g();g.next();g.next("x").value===8',
    'var o={__proto__:{x:{v:7,m(){return this.v}}},*g(){return super[yield 1].m()}};var g=o.g();g.next();g.next("x").value===7',
    'var o={__proto__:{m(){"use strict";return this===undefined}},*g(){return (0,super[yield 1])()}};var g=o.g();g.next();g.next("m").value===true',
    'function C(){this.x=7}var o={__proto__:{C},*g(){return new super[yield 1]()}};var g=o.g();g.next();g.next("C").value.x===7',
    'var n=0,key={toString(){n++;return "x"}},o={__proto__:null,*g(){try{return super[yield 1]}catch(e){return e instanceof TypeError}}};var g=o.g();g.next();g.next(key).value===true&&n===0',
    'var o={__proto__:{get x(){throw 7}},*g(){try{return super[yield 1]}catch(e){return e}}};var g=o.g();g.next();g.next("x").value===7',
    'var n=0,key={toString(){n++;return "x"}},o={__proto__:{get x(){n++;return 7}},*g(){try{return super[yield 1]}finally{yield 2}}};var g=o.g();g.next();g.return(key).value===2&&g.next().value===key&&n===0',
    "var n=0,o={__proto__:{get x(){n++;return 7}},*g(){try{return super[yield 1]}catch(e){return e}}};var g=o.g();g.next();g.throw(7).value===7&&n===0",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "super member case " + i,
    );
}
for (const source of [
    'var o={__proto__:{x:7},async f(){return super[await Promise.resolve("x")]}};o.f().then(v=>out=v)',
    'var o={__proto__:{x:7},async *f(){yield super[await Promise.resolve("x")]}};o.f().next().then(r=>out=r.value)',
    'var o={__proto__:{x:7},f(){return async ()=>super[await Promise.resolve("x")]}};o.f()().then(v=>out=v)',
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async super member result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "var o={__proto__:null,*f(){return super[yield 1]}},p={__proto__:{get x(){while(true){}}},*f(){return super[yield 1]}};var g=o.f(),h=p.f();g.next();h.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run('g.next("x")', B, session);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "super error Realm",
);
const stopped = run('h.next("x")', B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "super getter current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
{
    const result = run(
        'var o={*g(){delete super[yield 1]}};var g=o.g();g.next();var ok=false;try{g.next("x")}catch(e){ok=e instanceof ReferenceError}ok',
        new Realm((_line: string) => {}, "script"),
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original super delete boundary",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        'var o={*g(){return super[yield 1]()}};Object.setPrototypeOf(o,{m(){return 7}});var g=o.g();g.next();g.next("m").value===7',
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original super method boundary",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        'var o={*g(){super[yield 1]=7}};var g=o.g();g.next();g.next("x").done&&o.x===7',
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original super assignment boundary",
    );
}
{
    const result = run(
        'var o={*g(){super[yield 1]+=7}};var g=o.g();g.next();g.next("x").done&&Number.isNaN(o.x)',
        new Realm((_line: string) => {}, "script"),
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original super compound boundary",
    );
}
{
    const result = run(
        'var o={*g(){super[yield 1]++}};var g=o.g();g.next();g.next("x").done&&Number.isNaN(o.x)',
        new Realm((_line: string) => {}, "script"),
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original super update boundary",
    );
}
console.log("generator super member passed");
