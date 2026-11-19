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
    "var x=0;function* f(){return (x=yield 1)}var g=f();g.next();g.next(7).value===7&&x===7",
    "var x=0,y=0;function* f(){return (x=(y=yield 1))+1}var g=f();g.next();g.next(7).value===8&&x===7&&y===7",
    "var x=0;function id(v){return v}function* f(){return id(x=yield 1)}var g=f();g.next();g.next(7).value===7&&x===7",
    "var x=0;function* f(){return [x=yield 1][0]}var g=f();g.next();g.next(7).value===7&&x===7",
    "var x=0;function* f(){return {a:x=yield 1}.a}var g=f();g.next();g.next(7).value===7&&x===7",
    "var o={x:0},old=o;function* f(){return (o.x=yield 1)}var g=f();g.next();o={x:8};g.next(7).value===7&&old.x===7&&o.x===8",
    'var log="",key={toString(){log+="k";return "x"}},o={set x(v){log+=v}};function* f(){return (o[key]=yield 1)}var g=f();g.next();log===""&&g.next(7).value===7&&log==="k7"',
    "var n=0,o={get x(){throw 8},set x(v){n=v}};function* f(){return (o.x=yield 1)}var g=f();g.next();g.next(7).value===7&&n===7",
    'var n=0,o={set x(v){n=v}};function* f(){return (o.x=yield 1)}var g=f();g.next();Object.defineProperty(o,"x",{set(v){n=v+1}});g.next(6).value===6&&n===7',
    "function* f(){const x=1;try{return (x=yield 1)}catch(e){return e instanceof TypeError}}var g=f();g.next().value===1&&g.next(7).value===true",
    'var o={};Object.defineProperty(o,"x",{value:1});function* f(){"use strict";try{return (o.x=yield 1)}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(7).value===true&&o.x===1',
    'var o={};Object.defineProperty(o,"x",{value:1});function* f(){return (o.x=yield 1)}var g=f();g.next();g.next(7).value===7&&o.x===1',
    "var x=0;function* f(){try{return (x=yield 1)}finally{yield 2}}var g=f();g.next();g.return(7).value===2&&g.next().value===7&&x===0",
    "var x=0;function* f(){try{return (x=yield 1)}catch(e){return e}}var g=f();g.next();g.throw(7).value===7&&x===0",
    "var o={set x(v){throw 7}};function* f(){try{return (o.x=yield 1)}catch(e){return e}}var g=f();g.next();g.next(8).value===7",
    'var x;function* f(){return (x=yield 1).name}var g=f();g.next();g.next(function(){}).value===""',
    'var o={};function* f(){return (o.m=yield 1)()}var g=f();g.next();g.next(function(){"use strict";return this===undefined}).value===true',
    "function* f(){var i=0;for(;i<2;i=yield 1){yield i}return i}var g=f();g.next().value===0&&g.next().value===1&&g.next(2).value===2",
    "function* f(){var i;for(i=yield 1;i<2;i++)yield i;return i}var g=f();g.next();g.next(1).value===1&&g.next().value===2",
    "var x=0;function* f(){return false&&(x=yield 1)}f().next().value===false&&x===0",
    "var x=0;function* f(){return (true?(x=yield 1):8)}var g=f();g.next();g.next(7).value===7&&x===7",
    "var x=0;function* inner(){yield 1;return 7}function* f(){return (x=yield* inner())}var g=f();g.next().value===1&&g.next().value===7&&x===7",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "assignment value case " + i,
    );
}
for (const source of [
    "async function f(){var x;return (x=await Promise.resolve(7))}f().then(v=>out=v)",
    "async function* f(){var x;yield (x=await Promise.resolve(7))}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async assignment result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "function* f(){const x=1;return (x=yield 1)}var g=f();g.next();var o={set x(v){while(true){}}};function* slow(){return (o.x=yield 1)}var h=slow();h.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run("g.next(7)", B, session);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "assignment error Realm",
);
const stopped = run("h.next(7)", B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "assignment setter current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        "function* f(){return ((yield 1).x=7)}var o={},g=f();g.next();g.next(o).value===7&&o.x===7",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original target expression boundary",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        "function* f(){var x=0;return (x+=yield 1)}var g=f();g.next();g.next(7).value===7",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original compound expression boundary",
    );
}
console.log("generator assignment value passed");
