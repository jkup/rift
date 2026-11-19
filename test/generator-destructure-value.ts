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
    "var x,input=[7];function* f(){return [x]=yield 1}var g=f();g.next();g.next(input).value===input&&x===7",
    "var x,input={x:7};function* f(){return ({x}=yield 1)}var g=f();g.next();g.next(input).value===input&&x===7",
    "var x;function* f(){return ([x]=yield 1)[0]+x}var g=f();g.next();g.next([7]).value===14",
    "var x;function sum(a,b){return a[0]+b}function* f(){return sum([x]=yield 1,x)}var g=f();g.next();g.next([7]).value===14",
    "var x;function* f(){return {v:([x]=yield 1),x}}var g=f();g.next();var r=g.next([7]).value;r.v[0]===7&&r.x===7",
    "var x,y;function* f(){return [y]=([x]=yield 1)}var g=f();g.next();var input=[7];g.next(input).value===input&&x===7&&y===7",
    'var log="",o={set x(v){log+="s"+v}},input={get x(){log+="g";return 7}};function target(){log+="t";return o}function key(){log+="k";return "x"}function* f(){return ({[key()]:target().x}=yield 1)}var g=f();g.next();log===""&&g.next(input).value===input&&log==="ktgs7"',
    "var x=0,n=3;function* f(){return [x=n]=yield 1}var g=f();g.next();n=7;var input=[];g.next(input).value===input&&x===7",
    "var o={},replacement={};function* f(){return [o.x]=yield 1}var g=f();g.next();o=replacement;g.next([7]);replacement.x===7",
    'var x,rest;function* f(){return [x,...rest]=yield 1}var g=f();g.next();var input=[1,2,3];g.next(input).value===input&&x===1&&rest.join() === "2,3"',
    'var x,rest;function* f(){return ({x,...rest}=yield 1)}var g=f();g.next();var input={x:1,y:2};g.next(input).value===input&&x===1&&rest.y===2&&!Object.hasOwn(rest,"x")',
    "var x,closed=0,it={next(){return {done:false,value:7}},return(){closed++;return {}},[Symbol.iterator](){return this}};function* f(){return [x]=yield 1}var g=f();g.next();g.next(it).value===it&&x===7&&closed===1",
    "var closed=0,o={set x(v){throw 8}},it={next(){return {done:false,value:7}},return(){closed++;throw 9},[Symbol.iterator](){return this}};function* f(){try{return [o.x]=yield 1}catch(e){return e}}var g=f();g.next();g.next(it).value===8&&closed===1",
    'function* f(){"use strict";try{return [missing]=yield 1}catch(e){return e instanceof ReferenceError}}var g=f();g.next();g.next([7]).value===true',
    "var x;function* f(){try{return [x]=yield 1}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(null).value===true",
    "var x=0;function* f(){try{return [x]=yield 1}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8&&x===0",
    "var x;function* inner(){yield 1;return [7]}function* f(){return ([x]=yield* inner())[0]}var g=f();g.next();g.next().value===7&&x===7",
    "var x;function* f(){for(var i=([x]=yield 1)[0];i<8;i++){return x}}var g=f();g.next();g.next([7]).value===7",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "destructure value case " + i,
    );
}
for (const source of [
    "var x;async function f(){return ([x]=await [7])[0]}f().then(v=>out=v)",
    "var x;async function* f(){yield ([x]=await [7])[0]}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async destructure value",
    );
}
for (const source of [
    "function* f(){return [x=yield 1]=[]}",
    "function* f(){return ({[yield 1]:x}={})}",
]) {
    const realm = new Realm((_line: string) => {}, "script");
    check(
        prepareBoundedScript({ id: "pattern-boundary", text: source }, realm).kind === "ready",
        "original nested assignment admitted",
    );
    check(run(source, realm).type === "normal", "original nested assignment definition");
    const program = source.includes("return [")
        ? "var x,iter=f();var first=iter.next();var last=iter.next(7);first.value===1&&!first.done&&last.done&&x===7&&Array.isArray(last.value)&&last.value.length===0;"
        : 'var x=3,iter=f();var first=iter.next();var last=iter.next("key");first.value===1&&!first.done&&last.done&&x===undefined&&typeof last.value==="object"&&!Array.isArray(last.value);';
    const result = run(program, realm);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original nested assignment result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "var x,o={set x(v){while(true){}}};function* f(){return [x]=yield 1}function* h(){return [o.x]=yield 1}var g=f(),slow=h();g.next();slow.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "slow", own(A, "slow"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run("g.next(null)", B, session);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "destructure error Realm",
);
const stopped = run("slow.next([7])", B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "destructure current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator destructure value passed");
