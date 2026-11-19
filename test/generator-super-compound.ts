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
    'var base={x:3},o={__proto__:base,*g(){return (super[yield 1]+=7)}};var g=o.g();g.next();g.next("x").value===10&&o.x===10&&base.x===3',
    'var log="",base={get x(){log+="g";return this.y},set x(v){log+="s";this.y=v}},o={__proto__:base,y:3,*g(){return (super[yield 1]+=yield 2)}};var g=o.g();g.next();var a=g.next("x");log==="g"&&a.value===2&&g.next(7).value===10&&o.y===10&&log==="gs"',
    'var key={toString(){n++;return "x"}},n=0,base={x:3},o={__proto__:base,*g(){return (super[yield 1]+=yield 2)}};var g=o.g();g.next();g.next(key);key.toString=function(){throw 9};g.next(7).value===10&&o.x===10&&n===1',
    'var base={get x(){return this.y},set x(v){this.y=v}},o={__proto__:base,*g(){return (super[yield 1]+=7)}},other={y:3};var g=o.g.call(other);g.next();g.next("x").value===10&&other.y===10&&!Object.hasOwn(o,"y")',
    'var base={x:3},o={__proto__:base,*g(){return (super[yield 1]+=7)}};var g=o.g();g.next();Object.setPrototypeOf(o,{x:5});g.next("x").value===12&&o.x===12',
    'var base={get x(){return 3},set x(v){this.y=v}},o={__proto__:base,*g(){return (super[yield 1]+=yield 2)}};var g=o.g();g.next();g.next("x");Object.setPrototypeOf(o,{set x(v){this.y=99}});g.next(7).value===10&&o.y===10',
    'var base={get x(){return 3},set x(v){this.y=v}},o={__proto__:base,*g(){return (super[yield 1]+=yield 2)}};var g=o.g();g.next();g.next("x");Object.defineProperty(base,"x",{set(v){this.y=v+1}});g.next(7).value===10&&o.y===11',
    'var log="",key={toString(){log+="k";return "x"}},old={valueOf(){log+="v";return 3}},base={get x(){log+="g";return old},set x(v){log+="s"}},o={__proto__:base,*g(){return (super[yield 1]+=rhs())}};function rhs(){log+="r";return 7}var g=o.g();g.next();g.next(key).value===10&&log==="kgrvs"',
    'var n=0,o={__proto__:null,*g(){try{return (super[yield 1]+=rhs())}catch(e){return e instanceof TypeError}}};function rhs(){n++;return 7}var g=o.g();g.next();g.next("x").value===true&&n===0',
    'var n=0,o={__proto__:{get x(){throw 8}},*g(){try{return (super[yield 1]+=rhs())}catch(e){return e}}};function rhs(){n++;return 7}var g=o.g();g.next();g.next("x").value===8&&n===0',
    'var base={};Object.defineProperty(base,"x",{value:3});var o={__proto__:base,*g(){"use strict";try{return (super[yield 1]+=7)}catch(e){return e instanceof TypeError}}};var g=o.g();g.next();g.next("x").value===true&&!Object.hasOwn(o,"x")',
    "var s=Symbol(),base={[s]:3},o={__proto__:base,*g(){return (super[yield 1]+=7)}};var g=o.g();g.next();g.next(s).value===10&&o[s]===10&&base[s]===3",
    'class A{get x(){return 3}set x(v){this.y=v}}class B extends A{*g(){return (super[yield 1]+=7)}}var o=new B(),g=o.g();g.next();g.next("x").value===10&&o.y===10',
    'var n=0,o={__proto__:{get x(){n++;return 3},set x(v){n+=10}},*g(){try{return (super[yield 1]+=yield 2)}finally{yield 4}}};var g=o.g();g.next();g.next("x");g.return(8).value===4&&g.next().value===8&&n===1',
    'var o={__proto__:{x:"a"},*g(){return (super[yield 1]+=7)}};var g=o.g();g.next();g.next("x").value==="a7"&&o.x==="a7"',
    'var o={__proto__:{x:3},*g(){super[yield 1]+=7;return this.x}};var g=o.g();g.next();g.next("x").value===10',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]-=7)}};var g=o.g();g.next();g.next("x").value===-4&&o.x===-4',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]*=7)}};var g=o.g();g.next();g.next("x").value===21&&o.x===21',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]/=7)}};var g=o.g();g.next();g.next("x").value===0.42857142857142855&&o.x===0.42857142857142855',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]%=7)}};var g=o.g();g.next();g.next("x").value===3&&o.x===3',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]**=7)}};var g=o.g();g.next();g.next("x").value===2187&&o.x===2187',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]<<=7)}};var g=o.g();g.next();g.next("x").value===384&&o.x===384',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]>>=7)}};var g=o.g();g.next();g.next("x").value===0&&o.x===0',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]>>>=7)}};var g=o.g();g.next();g.next("x").value===0&&o.x===0',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]&=7)}};var g=o.g();g.next();g.next("x").value===3&&o.x===3',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]|=7)}};var g=o.g();g.next();g.next("x").value===7&&o.x===7',
    'var o={__proto__:{x:3},*g(){return (super[yield 1]^=7)}};var g=o.g();g.next();g.next("x").value===4&&o.x===4',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "super compound case " + i,
    );
}
for (const source of [
    'var o={__proto__:{x:3},async f(){return (super[await Promise.resolve("x")]+=7)}};o.f().then(v=>out=v)',
    'var o={__proto__:{x:3},async *f(){yield (super[await Promise.resolve("x")]+=await Promise.resolve(7))}};o.f().next().then(r=>out=r.value)',
    'var o={__proto__:{x:3},f(){return async ()=>super[await Promise.resolve("x")]+=7}};o.f()().then(v=>out=v)',
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===10", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async super compound result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "var o={__proto__:null,*f(){return (super[yield 1]+=7)}},p={__proto__:{get x(){while(true){}}},*f(){return (super[yield 1]+=7)}};var g=o.f(),h=p.f();g.next();h.next();",
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
    "super compound error Realm",
);
const stopped = run('h.next("x")', B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "super getter current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator super compound passed");
