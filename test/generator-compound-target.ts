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
    "var o={x:6};function* f(){return ((yield 1).x+=2)}var g=f();g.next();g.next(o).value===8&&o.x===8",
    "var o={x:6};function* f(){return ((yield 1).x-=2)}var g=f();g.next();g.next(o).value===4&&o.x===4",
    "var o={x:6};function* f(){return ((yield 1).x*=2)}var g=f();g.next();g.next(o).value===12&&o.x===12",
    "var o={x:6};function* f(){return ((yield 1).x/=2)}var g=f();g.next();g.next(o).value===3&&o.x===3",
    "var o={x:6};function* f(){return ((yield 1).x%=2)}var g=f();g.next();g.next(o).value===0&&o.x===0",
    "var o={x:6};function* f(){return ((yield 1).x**=2)}var g=f();g.next();g.next(o).value===36&&o.x===36",
    "var o={x:6};function* f(){return ((yield 1).x&=2)}var g=f();g.next();g.next(o).value===2&&o.x===2",
    "var o={x:6};function* f(){return ((yield 1).x|=2)}var g=f();g.next();g.next(o).value===6&&o.x===6",
    "var o={x:6};function* f(){return ((yield 1).x^=2)}var g=f();g.next();g.next(o).value===4&&o.x===4",
    "var o={x:6};function* f(){return ((yield 1).x<<=2)}var g=f();g.next();g.next(o).value===24&&o.x===24",
    "var o={x:6};function* f(){return ((yield 1).x>>=2)}var g=f();g.next();g.next(o).value===1&&o.x===1",
    "var o={x:6};function* f(){return ((yield 1).x>>>=2)}var g=f();g.next();g.next(o).value===1&&o.x===1",
    'var o={x:3};function* f(){return ((yield 1)[yield 2]+=yield 3)}var g=f();g.next();g.next(o).value===2&&g.next("x").value===3&&g.next(4).value===7&&o.x===7',
    'var o={x:3};function* f(){return (o[yield 1]+=yield 2)}var g=f();g.next();g.next("x");o.x=100;g.next(4).value===7&&o.x===7',
    'var o={x:3},old=o;function* f(){return (o[yield 1]+=4)}var g=f();g.next();o={x:100};g.next("x").value===7&&old.x===7&&o.x===100',
    'var log="",key={toString(){log+="k";return "x"}},o={get x(){log+="g";return {valueOf(){log+="l";return 3}}},set x(v){log+="s"+v}};function rhs(){log+="r";return 4}function* f(){return (o[yield 1]+=rhs())}var g=f();g.next();g.next(key).value===7&&log==="kgrls7"',
    'var n=0,key={toString(){n++;return "x"}},o={x:3,y:8};function* f(){return (o[yield 1]+=yield 2)}var g=f();g.next();g.next(key);key.toString=function(){n++;return "y"};g.next(4).value===7&&o.x===7&&o.y===8&&n===1',
    "var n=0;function rhs(){n++;return 4}function* f(){try{return ((yield 1).x+=rhs())}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(null).value===true&&n===0",
    'var n=0,o={get x(){throw 7}};function rhs(){n++;return 4}function* f(){try{return (o[yield 1]+=rhs())}catch(e){return e}}var g=f();g.next();g.next("x").value===7&&n===0',
    "var o={get x(){return 3},set x(v){this.y=v}};function* f(){return ((yield 1).x+=4)}var g=f();g.next();g.next(o).value===7&&o.y===7",
    'var o={};Object.defineProperty(o,"x",{value:3});function* f(){"use strict";try{return ((yield 1).x+=4)}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(o).value===true&&o.x===3',
    "var s=Symbol(),o={[s]:3};function* f(){return (o[yield 1]+=4)}var g=f();g.next();g.next(s).value===7&&o[s]===7",
    'function* f(){return ((yield 1).length+=4)}var g=f();g.next();g.next("abc").value===7',
    "var n=0,o={get x(){n++;return 3}};function* f(){try{return ((yield 1).x+=4)}finally{yield 2}}var g=f();g.next();g.return(7).value===2&&g.next().value===7&&n===0",
    "var o={x:3};function* f(){try{return (o[yield 1]+=4)}catch(e){return e}}var g=f();g.next();g.throw(7).value===7&&o.x===3",
    "var o={x:3};function* f(){return [((yield 1).x+=4)][0]}var g=f();g.next();g.next(o).value===7&&o.x===7",
    "var o={x:3};function* f(){(yield 1).x+=4;return o.x}var g=f();g.next();g.next(o).value===7",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "compound target case " + i,
    );
}
for (const source of [
    'async function f(){var o={x:3};return (o[await Promise.resolve("x")]+=4)}f().then(v=>out=v)',
    "async function* f(){var o={x:3};yield ((await Promise.resolve(o)).x+=await Promise.resolve(4))}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async compound target result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run("function* f(){return ((yield 1).x+=4)}var g=f();g.next();var h=f();h.next();", A, creator);
define(B, "g", own(A, "g"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run("g.next(null)", B, session);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "compound target error Realm",
);
const stopped = run(
    "h.next({get x(){while(true){}}})",
    B,
    createScriptSession({ maxSteps: 100, maxCalls: 16 }),
);
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "compound target getter current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator compound target passed");
