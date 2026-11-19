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
    'var base={x:3},o={__proto__:base,*g(){return super[yield 1]++}};var g=o.g();g.next();g.next("x").value===3&&o.x===4&&base.x===3',
    'var base={x:3},o={__proto__:base,*g(){return ++super[yield 1]}};var g=o.g();g.next();g.next("x").value===4&&o.x===4&&base.x===3',
    'var base={x:3},o={__proto__:base,*g(){return super[yield 1]--}};var g=o.g();g.next();g.next("x").value===3&&o.x===2&&base.x===3',
    'var base={x:3},o={__proto__:base,*g(){return --super[yield 1]}};var g=o.g();g.next();g.next("x").value===2&&o.x===2&&base.x===3',
    'var log="",key={toString(){log+="k";return "x"}},old={valueOf(){log+="v";return 3}},base={get x(){log+="g";return old},set x(v){log+="s"+v}},o={__proto__:base,*g(){return super[yield 1]++}};var g=o.g();g.next();g.next(key).value===3&&log==="kgvs4"',
    'var base={get x(){return this.y},set x(v){this.y=v}},o={__proto__:base,*g(){return ++super[yield 1]}},other={y:3};var g=o.g.call(other);g.next();g.next("x").value===4&&other.y===4&&!Object.hasOwn(o,"y")',
    'var base={x:3},o={__proto__:base,*g(){return ++super[yield 1]}};var g=o.g();g.next();Object.setPrototypeOf(o,{x:5});g.next("x").value===6&&o.x===6',
    'var base={get x(){Object.setPrototypeOf(o,{set x(v){this.y=99}});return 3},set x(v){this.y=v}},o={__proto__:base,*g(){return ++super[yield 1]}};var g=o.g();g.next();g.next("x").value===4&&o.y===4',
    'var n=0,key={toString(){n++;return "x"}},base={get x(){key.toString=function(){throw 9};return 3},set x(v){this.y=v}},o={__proto__:base,*g(){return ++super[yield 1]}};var g=o.g();g.next();g.next(key).value===4&&n===1&&o.y===4',
    'var base={get x(){Object.defineProperty(base,"x",{set(v){this.y=v+1}});return 3},set x(v){this.y=v}},o={__proto__:base,*g(){return ++super[yield 1]}};var g=o.g();g.next();g.next("x").value===4&&o.y===5',
    'var n=0,o={__proto__:null,*g(){try{return ++super[yield 1]}catch(e){return e instanceof TypeError}}},key={toString(){n++;return "x"}};var g=o.g();g.next();g.next(key).value===true&&n===0',
    'var n=0,o={__proto__:{get x(){throw 8},set x(v){n++}},*g(){try{return ++super[yield 1]}catch(e){return e}}};var g=o.g();g.next();g.next("x").value===8&&n===0',
    'var n=0,o={__proto__:{get x(){return {valueOf(){throw 8}}},set x(v){n++}},*g(){try{return ++super[yield 1]}catch(e){return e}}};var g=o.g();g.next();g.next("x").value===8&&n===0',
    'var base={};Object.defineProperty(base,"x",{value:3});var o={__proto__:base,*g(){"use strict";try{return ++super[yield 1]}catch(e){return e instanceof TypeError}}};var g=o.g();g.next();g.next("x").value===true&&!Object.hasOwn(o,"x")',
    "var s=Symbol(),o={__proto__:{[s]:3},*g(){return ++super[yield 1]}};var g=o.g();g.next();g.next(s).value===4&&o[s]===4",
    'var o={__proto__:{x:"3"},*g(){return super[yield 1]++}};var g=o.g();g.next();g.next("x").value===3&&o.x===4',
    'var o={__proto__:{x:-0},*g(){return super[yield 1]++}};var g=o.g();g.next();Object.is(g.next("x").value,-0)&&o.x===1',
    "var n=0,o={__proto__:{get x(){n++;return 3}},*g(){try{return ++super[yield 1]}finally{yield 2}}};var g=o.g();g.next();g.return(8).value===2&&g.next().value===8&&n===0",
    'var o={__proto__:{x:3},*g(){super[yield 1]++;return this.x}};var g=o.g();g.next();g.next("x").value===4',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "super update case " + i,
    );
}
for (const source of [
    'var o={__proto__:{x:3},async f(){return ++super[await Promise.resolve("x")]}};o.f().then(v=>out=v)',
    'var o={__proto__:{x:3},async *f(){yield ++super[await Promise.resolve("x")]}};o.f().next().then(r=>out=r.value)',
    'var o={__proto__:{x:3},f(){return async ()=>++super[await Promise.resolve("x")]}};o.f()().then(v=>out=v)',
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===4", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async super update result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "var o={__proto__:null,*f(){return ++super[yield 1]}},p={__proto__:{get x(){return 3},set x(v){while(true){}}},*f(){return ++super[yield 1]}};var g=o.f(),h=p.f();g.next();h.next();",
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
    "super update error Realm",
);
const stopped = run('h.next("x")', B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "super update current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator super update passed");
