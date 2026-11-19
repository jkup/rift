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
    'var base={x:3},o={__proto__:base,*g(){try{return delete super[yield 1]}catch(e){return e instanceof ReferenceError}}};var g=o.g();g.next().value===1&&g.next("x").value===true&&base.x===3',
    "var n=0,key={toString(){n++;throw 8}},o={__proto__:{get x(){n++;throw 9}},*g(){try{return delete super[yield 1]}catch(e){return e instanceof ReferenceError}}};var g=o.g();g.next();g.next(key).value===true&&n===0",
    'var n=0,key={toString(){n++;return "x"}},o={__proto__:null,*g(){try{return delete super[yield 1]}catch(e){return e instanceof ReferenceError}}};var g=o.g();g.next();g.next(key).value===true&&n===0',
    'var o={*g(){"use strict";try{return delete super[yield 1]}catch(e){return e instanceof ReferenceError}}};var g=o.g();g.next();g.next("x").value===true',
    'var log="",o={*g(){try{return delete super[(log+="a",yield 1)]}catch(e){log+="e";return e instanceof ReferenceError}}};var g=o.g();g.next();log==="a"&&g.next("x").value===true&&log==="ae"',
    "var o={*g(){try{return delete super[yield 1]}catch(e){return e}}};var g=o.g();g.next();g.throw(8).value===8",
    "var n=0,o={*g(){try{return delete super[yield 1]}catch(e){n++}finally{yield 2}}};var g=o.g();g.next();g.return(8).value===2&&g.next().value===8&&n===0",
    "var o={*g(){try{return delete super[yield* [1,2]]}catch(e){return e instanceof ReferenceError}}};var g=o.g();g.next().value===1&&g.next().value===2&&g.next().value===true",
    'var o={*g(){try{return delete super[yield 1]}finally{yield 2}}};var g=o.g();g.next();var a=g.next("x");var caught=false;try{g.next()}catch(e){caught=e instanceof ReferenceError}a.value===2&&caught',
    "var base={x:3},o={__proto__:base,*g(){try{return delete super[yield 1]}catch(e){return e instanceof ReferenceError}}};var g=o.g.call(null);g.next();g.next(Symbol()).value===true&&base.x===3",
    'class A{}class B extends A{*g(){try{return delete super[yield 1]}catch(e){return e instanceof ReferenceError}}}var g=new B().g();g.next();g.next("x").value===true',
    'var o={*g(){delete super[yield 1]}};var g=o.g();g.next();var ok=false;try{g.next("x")}catch(e){ok=e instanceof ReferenceError}ok&&g.next().done',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "super delete case " + i,
    );
}
for (const source of [
    'var o={async f(){return delete super[await Promise.resolve("x")]}};o.f().then(v=>out=false,e=>out=e instanceof ReferenceError)',
    'var o={async *f(){yield delete super[await Promise.resolve("x")]}};o.f().next().then(v=>out=false,e=>out=e instanceof ReferenceError)',
    'var o={f(){return async ()=>delete super[await Promise.resolve("x")]}};o.f()().then(v=>out=false,e=>out=e instanceof ReferenceError)',
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=false;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===true", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async super delete result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "var o={*f(){return delete super[yield 1]},*h(){return delete super[(yield 1,spin())]}};function spin(){while(true){}}var g=o.f(),h=o.h();g.next();h.next();",
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
        result.value.object.getPrototypeOf() === A.getErrorPrototype("ReferenceError"),
    "super delete error Realm",
);
const stopped = run('h.next("x")', B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "super delete key current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator super delete passed");
