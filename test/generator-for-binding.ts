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
    "function* f(){for(let i=yield 1;i<2;i++)yield i;return 7}var g=f();g.next().value===1&&g.next(0).value===0&&g.next().value===1&&g.next().value===7",
    "var i=7;function* f(){for(let i=yield 1;false;){}return i}var g=f();g.next();g.next(0).value===7&&i===7",
    "function* f(){try{for(let i=yield i;;){}}catch(e){return e instanceof ReferenceError}}f().next().value===true",
    "function* f(){for(let i=yield (()=>i);i<2;i++)yield ()=>i}var g=f(),initial=g.next().value,tdz=false;try{initial()}catch(e){tdz=e instanceof ReferenceError}var a=g.next(0).value,b=g.next().value;g.next().done&&tdz&&initial()===0&&a()===0&&b()===1",
    "function* f(){for(const i=yield 1;;){yield i;break}return 8}var g=f();g.next();g.next(7).value===7&&g.next().value===8",
    "function* f(){try{for(const i=yield 1;;i++){yield i}}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(7).value===7&&g.next().value===true",
    "function* f(){for(const i=yield (()=>i);;){yield ()=>i;break}}var g=f(),a=g.next().value,b=g.next(7).value;g.next().done&&a()===7&&b()===7",
    "var n=0;function init(x){n++;return x}function* f(){for(let i=init(yield 1);i<2;i++)yield i;return n}var g=f();g.next();g.next(0);g.next();g.next().value===1&&n===1",
    "function* f(){outer:for(let i=yield 1;i<2;i++){yield i;continue outer}return 7}var g=f();g.next();g.next(0).value===0&&g.next().value===1&&g.next().value===7",
    "var i=7;function* f(){try{for(let i=yield 1;;){yield 9}}finally{yield i}}var g=f();g.next();g.return(8).value===7&&g.next().value===8",
    "var i=3;function* f(){try{for(let i=yield 1;;){yield 9}}catch(e){return i+e}}var g=f();g.next();g.throw(4).value===7",
    "var saved;function* f(){try{for(let i=yield (()=>i);;){}}finally{yield 2}}var g=f();saved=g.next().value;g.return(7);g.next();var tdz=false;try{saved()}catch(e){tdz=e instanceof ReferenceError}tdz",
    "function* inner(){yield 1;return 7}function* f(){for(let i=yield* inner();;){yield i;break}}var g=f();g.next().value===1&&g.next().value===7&&g.next().done",
    "function* f(){for(let i=yield 1;yield 2;yield 3){yield i;break}return 8}var g=f();g.next();g.next(7).value===2&&g.next(true).value===7&&g.next().value===8",
    'function* f(){for(let fn=yield 1;;){return fn.name}}var g=f();g.next();g.next(function(){}).value===""',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "for binding case " + i,
    );
}
for (const source of [
    "async function f(){for(let x=await Promise.resolve(7);;){return x}}f().then(v=>out=v)",
    "async function* f(){for(const x=await Promise.resolve(7);;){yield x;break}}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async lexical initializer result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "function* f(){for(let x=yield 1;;){return x}}var g=f();g.next();function* slow(){for(let x=yield 1;;){}}var h=slow();h.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run("g.next(7).value===7", B, session);
check(
    result.type === "normal" && result.value.kind === "boolean" && result.value.value,
    "cross-Realm lexical initializer",
);
const stopped = run("h.next(7)", B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "lexical initializer current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator for binding passed");
