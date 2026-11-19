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
    'function tag(s){return s}var s=tag`a\\nb`;s[0]==="a\\nb"&&s.raw[0]==="a\\\\nb"&&s.length===1',
    "function tag(s,...v){return v}var o={},s=Symbol();var v=tag`a${o}b${s}c`;v[0]===o&&v[1]===s",
    'function tag(s){return s}var s=tag`\\xG0${1}ok${2}\\8`;s[0]===undefined&&s[1]==="ok"&&s[2]===undefined&&s.raw[0]==="\\\\xG0"&&s.raw[2]==="\\\\8"',
    "function tag(s){return s}var s=tag`a${1}b`;Object.isFrozen(s)&&Object.isFrozen(s.raw)&&Array.isArray(s)&&Array.isArray(s.raw)&&Object.getPrototypeOf(s)===Array.prototype&&Object.getPrototypeOf(s.raw)===Array.prototype",
    'function tag(s){return s}var s=tag`x`;var d=Object.getOwnPropertyDescriptor(s,"0"),r=Object.getOwnPropertyDescriptor(s,"raw"),l=Object.getOwnPropertyDescriptor(s,"length");!d.writable&&d.enumerable&&!d.configurable&&!r.writable&&!r.enumerable&&!r.configurable&&!l.writable&&!l.enumerable&&!l.configurable',
    "function tag(s){return s}function f(){return tag`x`}f()===f()&&tag`x`!==tag`x`",
    "function tag(s){return s}function factory(){return ()=>tag`x`}factory()()===factory()()",
    'function tag(s){return s}function f(){return eval("tag`x`")}f()!==f()',
    'function tag(s){return s}var s=tag``;s.length===1&&s[0]===""&&s.raw[0]===""',
    'var order="",o={get tag(){order+="G";return function(s,v){order+="C";return this===o&&v===7}}};o.tag`${(order+="V",7)}`&&order==="GVC"',
    "var n=0;try{(1)`${n++}`}catch(e){n+=e instanceof TypeError?10:100}n===11",
    "var n=0;try{missing`${n++}`}catch(e){n+=e instanceof ReferenceError?10:100}n===10",
    "var n=0;try{(1)`${(function(){throw 7})()}${n++}`}catch(e){n+=e===7?10:100}n===10",
    "var o={tag(s){return this===o}};(o.tag)`x`&&(o?.tag)`x`",
    'function tag(s){"use strict";return this===undefined}tag`x`',
    "class A{tag(s,x){return this.x+x}}class B extends A{m(){return super.tag`${2}`}}var b=new B();b.x=5;b.m()===7",
    "function tag(s,v){return v}tag`${(1,7)}`===7",
    "function tag(s){return function C(){this.value=7}}new tag`x`().value===7",
    "function tag(s){return class{constructor(v){this.value=v}}}new tag`x`(7).value===7",
    "function tag(s){return x=>x}tag`x`(7)===7",
    "function tag(s){return tag}tag`x``y`===tag",
    'String.raw`a\\nb${7}c`==="a\\\\nb7c"',
    'var saved;function tag(s){saved=s;return s}function f(){return tag`x`}var s=f();s[0]="y";s.raw[0]="z";f()===s&&s[0]==="x"&&s.raw[0]==="x"',
    'function tag(s){return s}var s=tag`\\u{110000}`;s[0]===undefined&&s.raw[0]==="\\\\u{110000}"',
    "var o={toString(){throw 7}};function tag(s,v){return v===o}tag`${o}`",
    "function tag(s,x){return x}function* f(){return tag`a${yield 1}b`}var g=f();g.next().value===1&&g.next(7).value===7",
    'function tag(s){return s[0]}function* f(){return (yield 1)`x`}var g=f();g.next().value===1&&g.next(tag).value==="x"',
    'var o={tag(s,x){return this===o&&x===7}};function* f(){return o[yield 1]`${yield 2}`}var g=f();g.next();g.next("tag").value===2&&g.next(7).value===true',
    "var seen;function tag(s,x){if(seen&&seen!==s)throw 7;seen=s;return x}function* f(){for(var i=0;i<2;i++)yield tag`${yield i}`}var g=f();g.next().value===0&&g.next(7).value===7&&g.next().value===1&&g.next(8).value===8",
    "var called=0;function tag(){called++}function* f(){try{return tag`${yield 1}`}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8&&called===0",
    'class A{tag(s,x){return this.x+x}}class B extends A{*m(){return super[yield 1]`${yield 2}`}}var b=new B();b.x=5;var g=b.m();g.next();g.next("tag").value===2&&g.next(2).value===7',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "tagged template case " + i,
    );
}
for (const text of [
    "tag?.x`x`",
    "tag?.()`x`",
    "tag`${...x}`",
    "tag`${}`",
    "tag`x`=7",
    "tag`\\x``${`\\8`}`",
]) {
    check(
        prepareBoundedScript(
            { id: "tagged-negative", text },
            new Realm((_line: string) => {}, "script"),
        ).kind === "blocked",
        "invalid tagged syntax " + text,
    );
}
for (const body of [
    "async function f(){return tag`${await 7}`}f().then(v=>out=v)",
    "async function* f(){yield tag`${await 7}`}f().next().then(r=>out=r.value)",
    "var f=async()=>tag`${await 7}`;f().then(v=>out=v)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(
        run("var out=0;function tag(s,v){return v}" + body, realm, session).type === "normal",
        "async setup",
    );
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async tagged call",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "function tag(s){return s}function f(){return tag`x`}function* h(){return tag`${yield 1}`}var g=h();g.next();var original=f();",
    A,
    creator,
);
define(B, "f", own(A, "f"));
define(B, "g", own(A, "g"));
define(B, "original", own(A, "original"));
const steps = creator.inspect().steps,
    result = run("f()===original&&Object.getPrototypeOf(original)!==Array.prototype", B);
check(
    result.type === "normal" && result.value.kind === "boolean" && result.value.value,
    "template creation Realm and site",
);
const resumed = run("g.next(7).value", B);
check(
    resumed.type === "normal" &&
        resumed.value.kind === "object" &&
        resumed.value.object.getPrototypeOf() === A.arrayPrototype,
    "suspended template Realm",
);
check(creator.inspect().steps === steps, "creator session untouched");
for (let maxSteps = 0; maxSteps < 50; maxSteps++) {
    const result = run(
        "function tag(s){return s.length}tag`a${1}b${2}c`",
        new Realm((_line: string) => {}, "script"),
        createScriptSession({ maxSteps, maxCalls: 64 }),
    );
    check(
        result.type === "normal"
            ? result.value.kind === "number" && result.value.value === 3
            : result.origin.kind === "resource-limit",
        "tagged template budget",
    );
}
console.log("tagged templates passed");
