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
    "function* f(){var a=yield 1,b=a+1;return a+b}var g=f();g.next().value===1&&g.next(3).value===7",
    "function* f(){var a=yield 1,b=yield 2;return a+b}var g=f();g.next().value===1&&g.next(3).value===2&&g.next(4).value===7",
    "function* f(){var a=yield (()=>b),b=7;return a+b}var g=f(),read=g.next().value;read()===undefined&&g.next(0).value===7&&read()===7",
    "var n=0;function init(x){n++;return x}function* f(){var a=init(yield 1),b=init(yield 2),c=init(3);return a+b+c}var g=f();g.next();g.next(1);g.next(3).value===7&&n===3",
    "function* f(){var a=1;var x=yield 1,a,b=yield 2;return a+x+b}var g=f();g.next();g.next(2);g.next(4).value===7",
    "function* f(){var x=yield 1,x=yield 2;return x}var g=f();g.next();g.next(3).value===2&&g.next(7).value===7",
    'var n=0;function side(){n++;return 9}function* f(){var a=0,b=0;try{var a=yield 1,b=yield 2,c=side()}finally{yield a+":"+b}}var g=f();g.next();g.next(3);g.return(7).value==="3:0"&&g.next().value===7&&n===0',
    "var n=0;function side(){n++;return 9}function* f(){var a=0,b=0;try{var a=yield 1,b=yield 2,c=side()}catch(e){return a+b+e}}var g=f();g.next();g.next(3);g.throw(4).value===7&&n===0",
    "var n=0;function fail(){throw 4}function side(){n++}function* f(){var a=0;try{var a=yield 1,b=fail(),c=side()}catch(e){return a+e}}var g=f();g.next();g.next(3).value===7&&n===0",
    "function* f(){for(var a=yield 1,b=yield 2;a<2;a++)yield a+b;return a+b}var g=f();g.next();g.next(0).value===2&&g.next(5).value===5&&g.next().value===6&&g.next().value===7",
    "var n=0;function init(x){n++;return x}function* f(){outer:for(var a=init(yield 1),b=init(7);a<2;a++){yield b;continue outer}return n}var g=f();g.next();g.next(0);g.next();g.next().value===2&&n===2",
    "function* f(){var x=[];for(var a=yield 1,b=7;a<2;a++)x.push(()=>a+b);return x[0]()===9&&x[1]()===9}var g=f();g.next();g.next(0).value===true",
    "function* inner(){yield 1;return 3}function* f(){var a=yield* inner(),b=4;return a+b}var g=f();g.next().value===1&&g.next().value===7",
    'function* f(){var a=yield 1,fn=function(){};return fn.name}var g=f();g.next();g.next(7).value==="fn"',
    'function* f(){var fn=yield 1,a=7;return fn.name}var g=f();g.next();g.next(function(){}).value===""',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "var list case " + i,
    );
}
for (const source of [
    "async function f(){var a=await Promise.resolve(3),b=await Promise.resolve(4);return a+b}f().then(v=>out=v)",
    "async function* f(){for(var a=await Promise.resolve(3),b=await Promise.resolve(4);;){yield a+b;break}}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async var list result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "function* f(){var a=yield 1,b=4;return a+b}var g=f();g.next();function spin(){while(true){}}function* slow(){var a=yield 1,b=spin()}var h=slow();h.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run("g.next(3).value===7", B, session);
check(
    result.type === "normal" && result.value.kind === "boolean" && result.value.value,
    "var list cross-Realm",
);
const stopped = run("h.next(7)", B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "var list current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator var list passed");
