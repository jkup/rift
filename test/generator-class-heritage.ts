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
    'class A{}function* f(){return class extends (yield 1){m(){return 7}}}var g=f();g.next();var C=g.next(A).value;new C() instanceof A&&new C().m()===7&&C.name===""',
    'class A{}function* f(){class C extends (yield 1){}return C}var g=f();g.next();var C=g.next(A).value;C.name==="C"&&new C() instanceof A',
    'class A{}function* f(){var C=class extends (yield 1){};return C.name}var g=f();g.next();g.next(A).value==="C"',
    'class A{}function* f(){let C=class extends (yield 1){};return C.name}var g=f();g.next();g.next(A).value==="C"',
    'class A{}function* f(){const C=class extends (yield 1){};return C.name}var g=f();g.next();g.next(A).value==="C"',
    'class A{}function* f(){var C;return (C=class extends (yield 1){}).name}var g=f();g.next();g.next(A).value==="C"',
    'class A{}function* f(){var C;return (C||=class extends (yield 1){}).name}var g=f();g.next();g.next(A).value==="C"',
    'class A{}function* f(){return {C:class extends (yield 1){}}.C.name}var g=f();g.next();g.next(A).value==="C"',
    'class A{}function* f(){var C=true?class extends (yield 1){}:null;return C.name}var g=f();g.next();g.next(A).value===""',
    'class A{}var read;function* f(){return class Inner extends (read=()=>Inner,yield 1){m(){return Inner}}}var g=f();g.next();var tdz=false;try{read()}catch(e){tdz=e instanceof ReferenceError}var C=g.next(A).value;tdz&&read()===C&&new C().m()===C&&typeof Inner==="undefined"',
    "var Inner=7;function* f(){try{return class Inner extends ((yield 1),Inner){}}catch(e){return e instanceof ReferenceError&&Inner===7}}var g=f();g.next();g.next(1).value===true",
    'class A{}function* f(){try{return class extends ((yield 1),missing=7,A){}}catch(e){afterHeritage=8;return e instanceof ReferenceError}}var g=f();g.next();g.next(1).value===true&&globalThis.afterHeritage===8&&typeof missing==="undefined"',
    "var read,Outer=7;function* f(){try{return class Inner extends (read=()=>Inner,yield 1){}}finally{yield Outer}}var g=f();g.next();var a=g.return(8);var tdz=false;try{read()}catch(e){tdz=e instanceof ReferenceError}a.value===7&&g.next().value===8&&tdz",
    'var Outer=7;function* f(){try{return class Inner extends (yield 1){}}catch(e){return e===8&&Outer===7&&typeof Inner==="undefined"}}var g=f();g.next();g.throw(8).value===true',
    "class A{}function* base(){yield 1;return A}function* f(){return class C extends (yield* base()){}}var g=f();g.next().value===1&&new (g.next().value)() instanceof A",
    "var closed=0,it={next(){return {value:1,done:false}},return(v){closed++;return {value:v,done:true}},[Symbol.iterator](){return this}};function* f(){try{return class extends (yield* it){}}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8&&closed===1",
    "class A{}class B{}var reads=[];function* f(i){return class Inner extends (reads[i]=()=>Inner,yield i){}}var a=f(0),b=f(1);a.next();b.next();var X=a.next(A).value,Y=b.next(B).value;reads[0]()===X&&reads[1]()===Y&&X!==Y&&new X() instanceof A&&new Y() instanceof B",
    "function* f(){return class extends (yield 1){constructor(){return Object.create(new.target.prototype)}}}var g=f();g.next();var C=g.next(null).value;Object.getPrototypeOf(C.prototype)===null&&new C() instanceof C",
    "function* f(){try{return class extends (yield 1){}}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(7).value===true",
    "class A{}var read;function* f(){return class Outer extends (yield class Inner extends (yield 1){}){m(){return Outer}}}var g=f();g.next();var a=g.next(A);var C=g.next(a.value).value;new C() instanceof A&&new C().m()===C",
    "class A{}var o={A,*f(){return class extends ((yield 1),this.A){}}};var g=o.f();g.next();new (g.next().value)() instanceof A",
    'class A{}var C;function* f(){for(C=class extends (yield 1){};false;){}return C.name}var g=f();g.next();g.next(A).value==="C"',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "class heritage case " + i,
    );
}
for (const source of [
    "class A{}async function f(){let C=class extends(await A){};return C.name}f().then(v=>out=v)",
    "class A{}async function* f(){class C extends(await A){};yield C.name}f().next().then(r=>out=r.value)",
    "class A{}var f=async()=>{let C=class extends(await A){};return C.name};f().then(v=>out=v)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run('var out="";' + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run('out==="C"', realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async class heritage",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        'function* f(){return class{[yield 1](){}}}var g=f();g.next();typeof g.next("m").value.prototype.m==="function"',
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "historical generator key input",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    run(
        'async function f(){return class{[await 1](){}}}var out=false;f().then(C=>out=typeof C.prototype[1]==="function")',
        realm,
        session,
    );
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "historical async key jobs");
    const result = run("out", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "historical async key input",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "function* f(){return class extends(yield 1){}}function* h(){return class extends(yield 1){[(function(){while(true){}})()](){}}}var g=f(),slow=h();g.next();slow.next();",
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
    "heritage error Realm",
);
const stopped = run(
    "slow.next(function(){})",
    B,
    createScriptSession({ maxSteps: 100, maxCalls: 16 }),
);
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "class heritage current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator class heritage passed");
