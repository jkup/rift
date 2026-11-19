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
    "function* f(){for(var i=0;i<2;yield i++){}return i}var g=f();g.next().value===0&&g.next().value===1&&g.next().value===2",
    "function* f(){for(let i=0;i<2;yield i++){}return 7}var g=f();g.next().value===0&&g.next().value===1&&g.next().value===7",
    'var log="";function* f(){for(let i=0;(log+="t",i<2);(log+="u",yield i++)){log+="b"}return log}var g=f();g.next();var first=log;g.next();var second=log;g.next().value==="tbutbut"&&first==="tbu"&&second==="tbutbu"',
    'var a=[];function* f(){for(let i=0;i<2;yield i++){a.push(()=>i)}return a[0]()+":"+a[1]()}var g=f();g.next();g.next();g.next().value==="0:1"',
    'var a=[];function* f(){for(let i=0;i<2;(a.push(()=>i),yield i++)){}return a[0]()+":"+a[1]()}var g=f();g.next();g.next();g.next().value==="1:2"',
    "var n=0;function* f(){for(var i=0;i<2;yield i++){n++;continue}return n}var g=f();g.next();g.next();g.next().value===2",
    "var n=0;function* f(){for(var i=0;i<2;yield n++){break}return n}var r=f().next();r.done&&r.value===0",
    "var n=0;function* f(){outer:for(var i=0;i<2;yield i++){for(;;){n++;continue outer}}return n}var g=f();g.next().value===0&&g.next().value===1&&g.next().value===2",
    "function* f(){for(let i=0;yield i;yield ++i){}return 7}var g=f();g.next().value===0&&g.next(true).value===1&&g.next().value===1&&g.next(false).value===7",
    "var n=0;function* f(){try{for(var i=0;i<2;(yield 1,n++)){}}finally{yield n}}var g=f();g.next();g.return(7).value===0&&g.next().value===7&&n===0",
    "var n=0;function* f(){try{for(var i=0;i<2;(yield 1,n++)){}}catch(e){return e}}var g=f();g.next();g.throw(7).value===7&&n===0",
    "var n=0;function step(x){n+=x}function* f(){for(;n<2;step(yield 1)){}return n}var g=f();g.next();g.next(1);g.next(1).value===2",
    "function* f(){for(var i=0;i<1;((yield 1),(yield 2),i++)){}return i}var g=f();g.next().value===1&&g.next().value===2&&g.next().value===1",
    "function* inner(){yield 1;return 7}function* f(){for(var i=0;i<1;(yield* inner(),i++)){}return i}var g=f();g.next().value===1&&g.next().value===1",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "for update case " + i,
    );
}
for (const source of [
    "async function f(){for(let i=0;i<2;await i++)out+=i}f()",
    "async function* f(){for(let i=0;i<2;await i++)yield i}var g=f();g.next().then(r=>out+=r.value);g.next().then(r=>out+=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run('var out="";' + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run('out==="01"', realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async update result",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        "function* f(){for(var i=0;i<2;i=yield 1){}}var g=f();g.next().value===1&&g.next(2).done",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original assignment update boundary",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        "function* f(){for(let i=yield 1;;){}}var g=f();g.next().value===1&&g.return(7).value===7",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original lexical initializer boundary",
    );
}
{
    const A = new Realm((_line: string) => {}, "script"),
        B = new Realm((_line: string) => {}, "script"),
        creator = createScriptSession();
    run("function* f(){for(let i=0;i<1;(yield 1).x){i++}}var g=f();g.next();", A, creator);
    define(B, "g", own(A, "g"));
    const steps = creator.inspect().steps,
        session = createScriptSession();
    const result = run("g.next(null)", B, session);
    check(
        result.type === "throw" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
        "update owner error",
    );
    check(creator.inspect().steps === steps, "current update session");
}
{
    const realm = new Realm((_line: string) => {}, "script");
    run(
        "var cleaned=false;function spin(x){while(true){}}function* f(){try{for(var i=0;i<1;spin(yield 1)){i++}}finally{cleaned=true}}var g=f();g.next();",
        realm,
    );
    const result = run("g.next(7)", realm, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "update current budget",
    );
    const clean = run("cleaned", realm);
    check(
        clean.type === "normal" && clean.value.kind === "boolean" && !clean.value.value,
        "fatal update cleanup",
    );
}
console.log("generator for update passed");
