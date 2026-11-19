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
    "function* f(){var x=0;return x&&=yield 1}var g=f(),a=g.next();a.done&&a.value===0",
    'var reads=0,writes=0,o={get x(){reads++;return 0},set x(v){writes++;this.y=v}};function* f(){return o[yield 1]&&=yield 2}var g=f();g.next();var a=g.next("x");reads===1&&a.done&&a.value===0&&writes===0',
    "function* f(){var x=0;return x||=yield 1}var g=f(),a=g.next();a.value===1&&!a.done&&g.next(7).value===7",
    'var reads=0,writes=0,o={get x(){reads++;return 0},set x(v){writes++;this.y=v}};function* f(){return o[yield 1]||=yield 2}var g=f();g.next();var a=g.next("x");reads===1&&a.value===2&&!a.done&&g.next(7).value===7&&writes===1&&o.y===7',
    "function* f(){var x=0;return x??=yield 1}var g=f(),a=g.next();a.done&&a.value===0",
    'var reads=0,writes=0,o={get x(){reads++;return 0},set x(v){writes++;this.y=v}};function* f(){return o[yield 1]??=yield 2}var g=f();g.next();var a=g.next("x");reads===1&&a.done&&a.value===0&&writes===0',
    "function* f(){var x=null;return x&&=yield 1}var g=f(),a=g.next();a.done&&a.value===null",
    'var reads=0,writes=0,o={get x(){reads++;return null},set x(v){writes++;this.y=v}};function* f(){return o[yield 1]&&=yield 2}var g=f();g.next();var a=g.next("x");reads===1&&a.done&&a.value===null&&writes===0',
    "function* f(){var x=null;return x||=yield 1}var g=f(),a=g.next();a.value===1&&!a.done&&g.next(7).value===7",
    'var reads=0,writes=0,o={get x(){reads++;return null},set x(v){writes++;this.y=v}};function* f(){return o[yield 1]||=yield 2}var g=f();g.next();var a=g.next("x");reads===1&&a.value===2&&!a.done&&g.next(7).value===7&&writes===1&&o.y===7',
    "function* f(){var x=null;return x??=yield 1}var g=f(),a=g.next();a.value===1&&!a.done&&g.next(7).value===7",
    'var reads=0,writes=0,o={get x(){reads++;return null},set x(v){writes++;this.y=v}};function* f(){return o[yield 1]??=yield 2}var g=f();g.next();var a=g.next("x");reads===1&&a.value===2&&!a.done&&g.next(7).value===7&&writes===1&&o.y===7',
    "function* f(){var x=1;return x&&=yield 1}var g=f(),a=g.next();a.value===1&&!a.done&&g.next(7).value===7",
    'var reads=0,writes=0,o={get x(){reads++;return 1},set x(v){writes++;this.y=v}};function* f(){return o[yield 1]&&=yield 2}var g=f();g.next();var a=g.next("x");reads===1&&a.value===2&&!a.done&&g.next(7).value===7&&writes===1&&o.y===7',
    "function* f(){var x=1;return x||=yield 1}var g=f(),a=g.next();a.done&&a.value===1",
    'var reads=0,writes=0,o={get x(){reads++;return 1},set x(v){writes++;this.y=v}};function* f(){return o[yield 1]||=yield 2}var g=f();g.next();var a=g.next("x");reads===1&&a.done&&a.value===1&&writes===0',
    "function* f(){var x=1;return x??=yield 1}var g=f(),a=g.next();a.done&&a.value===1",
    'var reads=0,writes=0,o={get x(){reads++;return 1},set x(v){writes++;this.y=v}};function* f(){return o[yield 1]??=yield 2}var g=f();g.next();var a=g.next("x");reads===1&&a.done&&a.value===1&&writes===0',
    'var n=0,key={toString(){n++;return "x"}},o={x:null};function* f(){return o[yield 1]??=yield 2}var g=f();g.next();g.next(key);key.toString=function(){throw 8};g.next(7).value===7&&o.x===7&&n===1',
    'var old={x:0},o=old;function* f(){return o.x||=yield 1}var g=f();g.next();o={};g.next(7).value===7&&old.x===7&&!Object.hasOwn(o,"x")',
    "var o={x:0};function* f(){return o.x||=yield 1}var g=f();g.next();o.x=9;g.next(7).value===7&&o.x===7",
    'var log="",key={toString(){log+="k";return "x"}},o={get x(){log+="g";return null},set x(v){log+="s"+v}};function* f(){return o[yield 1]??=yield 2}var g=f();g.next();g.next(key);log==="kg"&&g.next(7).value===7&&log==="kgs7"',
    'var base={get x(){return this.y},set x(v){this.y=v}},o={__proto__:base,y:0,*g(){return super[yield 1]||=yield 2}};var g=o.g();g.next();g.next("x").value===2&&g.next(7).value===7&&o.y===7',
    'var n=0,o={__proto__:{get x(){return 1},set x(v){n++}},*g(){return super[yield 1]||=yield 2}};var g=o.g();g.next();var r=g.next("x");r.done&&r.value===1&&n===0',
    'var base={get x(){return null},set x(v){this.y=v}},o={__proto__:base,*g(){return super[yield 1]??=yield 2}};var g=o.g();g.next();g.next("x");Object.setPrototypeOf(o,{set x(v){this.y=99}});g.next(7).value===7&&o.y===7',
    "function* f(){const x=1;return x||=yield 1}var r=f().next();r.done&&r.value===1",
    "function* f(){const x=0;try{return x||=yield 1}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(7).value===true",
    "var o={x:0};function* f(){try{return o.x||=yield 1}catch(e){return e}}var g=f();g.next();g.throw(8).value===8&&o.x===0",
    "var o={x:0};function* f(){try{return o.x||=yield 1}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8&&o.x===0",
    'function* f(){var x;return x||=yield 1}var g=f();g.next();var h=function(){};g.next(h).value===h&&h.name==="h"',
    'var o={};function* f(){return o[yield 1]||=function(){}}var g=f();g.next();g.next("x").value.name===""&&o.x.name===""',
    "var x=0;function* f(){return (x||=yield 1)+x}var g=f();g.next();g.next(7).value===14",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "suspended logical assignment case " + i,
    );
}
for (const source of [
    "var x;async function f(){return x??=await 7}f().then(v=>out=v)",
    "var x=7;async function f(){return x||=await Promise.reject(8)}f().then(v=>out=v)",
    'var o={x:0};async function* f(){yield o[await "x"]||=await 7}f().next().then(r=>out=r.value)',
    'var o={__proto__:{x:0},async f(){return super[await "x"]||=await 7}};o.f().then(v=>out=v)',
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async logical assignment",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "var o={get x(){return 0},set x(v){while(true){}}};function* f(){const x=0;return x||=yield 1}function* h(){return o.x||=yield 1}var g=f(),slow=h();g.next();slow.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "slow", own(A, "slow"));
const steps = creator.inspect().steps,
    result = run("g.next(7)", B);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "logical resume error Realm",
);
const stopped = run("slow.next(7)", B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "logical resume current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator logical assignment passed");
