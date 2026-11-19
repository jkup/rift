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
const cases: string[] = [
    "function C(x){this.x=x}function* f(){return new C(yield 1)}var g=f();g.next();var o=g.next(7).value;o.x===7&&o instanceof C",
    "function C(a,b){this.x=a+b}function* f(){return new C(yield 1,yield 2)}var g=f();g.next();g.next(3);g.next(4).value.x===7",
    'function C(...x){this.x=x.join(":")}function* f(){return new C(1,...(yield 2),4)}var g=f();g.next();g.next([2,3]).value.x==="1:2:3:4"',
    "function C(x){this.x=x}var old=C;function* f(){return new C(yield 1)}var g=f();g.next();C=function(){this.x=99};var o=g.next(7).value;o.x===7&&o instanceof old",
    "function C(x){this.x=x}function* f(){return new C(yield 1)}var g=f();g.next();var p={};C.prototype=p;Object.getPrototypeOf(g.next(7).value)===p",
    "function C(x){this.x=x;this.target=new.target}function* f(){return new C(yield 1)}var g=f();g.next();g.next(7).value.target===C",
    "function C(a,b){this.x=a+b;this.target=new.target}var B=C.bind({x:99},3);function* f(){return new B(yield 1)}var g=f();g.next();var o=g.next(4).value;o.x===7&&o.target===C",
    "class A{constructor(x){this.x=x}}class B extends A{}function* f(){return new B(yield 1)}var g=f();g.next();var o=g.next(7).value;o.x===7&&o instanceof B",
    "var n=0,C=7;function side(){n++;return 3}function* f(){try{return new C(yield 1,side())}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(2).value===true&&n===1",
    "var C=()=>7;function* f(){try{return new C(yield 1)}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(2).value===true",
    "var marker={};function C(){return marker}function* f(){return new C(yield 1)}var g=f();g.next();g.next(7).value===marker",
    "function C(){throw 8}function* f(){try{return new C(yield 1)}catch(e){return e}}var g=f();g.next();g.next(7).value===8",
    "var n=0;function C(){n++}function* f(){try{return new C(yield 1)}finally{yield 2}}var g=f();g.next();g.return(7).value===2&&g.next().value===7&&n===0",
    "var n=0;function C(){n++}function* f(){try{return new C(yield 1)}catch(e){return e}}var g=f();g.next();g.throw(7).value===7&&n===0",
    "var n=0,o={get C(){n++;return function(x){this.x=x}}};function* f(){return new o.C(yield 1)}var g=f();g.next();g.next(7).value.x===7&&n===1",
    "function C(x){this.x=x}function* f(){return (new C(yield 1)).x}var g=f();g.next();g.next(7).value===7",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "new case " + i,
    );
}
for (const source of [
    "async function f(){return (new C(await Promise.resolve(7))).x}f().then(x=>out=x)",
    "async function* f(){yield (new C(await Promise.resolve(7))).x}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(
        run("var out=0;function C(x){this.x=x}" + source, realm, session).type === "normal",
        "async setup",
    );
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async constructor result",
    );
}
for (const source of [
    "function* f(){return new (yield 1)()}",
    "function* f(){return new (yield 1)(yield 2)}",
]) {
    check(
        prepareBoundedScript(
            { id: "original-boundary", text: source },
            new Realm((_line: string) => {}, "script"),
        ).kind === "ready",
        "original constructor boundary " + source,
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run("function C(x){this.x=x}function* f(){return new C(yield 1)}var g=f();g.next();", A, creator);
define(B, "g", own(A, "g"));
define(B, "C", own(A, "C"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run(
    "var o=g.next(7).value;o.x===7&&Object.getPrototypeOf(o)===C.prototype",
    B,
    session,
);
check(
    result.type === "normal" && result.value.kind === "boolean" && result.value.value,
    "owner constructor prototype",
);
check(creator.inspect().steps === steps, "current constructor session");
console.log("generator new passed");
