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
    "class A{constructor(x){this.x=x}}class B extends A{constructor(){return (async()=>super(await 7))()}}new B().then(v=>out=v.x===7&&v instanceof B)",
    "class A{constructor(a,b,c){this.x=a+b+c}}class B extends A{constructor(){return (async()=>super(await 1,await 2,await 4))()}}new B().then(v=>out=v.x===7)",
    "class A{constructor(a,b,c){this.x=a+b+c}}class B extends A{constructor(){return (async()=>super(...await [1,2],await 4))()}}new B().then(v=>out=v.x===7)",
    'var log="";class A{constructor(a,b){log+="c";this.x=a+b}}class B extends A{constructor(){return (async()=>super((log+="a",await 3),(log+="b",await 4)))()}}var p=new B();log+="s";p.then(v=>out=v.x===7&&log==="asbc")',
    "class A{constructor(x){this.x=x}}class C{constructor(x){this.x=99}}class B extends A{constructor(){return (async()=>super(await 7))()}}var p=new B();Object.setPrototypeOf(B,C);p.then(v=>out=v.x===7&&v instanceof B)",
    "class A{constructor(){this.target=new.target}}class B extends A{constructor(){return (async()=>super(await 7))()}}class C extends B{}new C().then(v=>out=v.target===C&&v instanceof C)",
    "class A{constructor(x){this.x=x}}class B extends A{constructor(){return (async()=>{super(await 7);return this})()}}new B().then(v=>out=v.x===7)",
    "var calls=0;class A{constructor(){calls++}}class B extends A{constructor(){super();return (async()=>super(await 7))()}}new B().then(v=>out=false,e=>out=e instanceof ReferenceError&&calls===2)",
    "var calls=0;class A{constructor(){calls++}}class B extends A{constructor(){return (async()=>super(await Promise.reject(8)))()}}new B().then(v=>out=false,e=>out=e===8&&calls===0)",
    "class A{constructor(){throw 8}}class B extends A{constructor(){return (async()=>super(await 7))()}}new B().then(v=>out=false,e=>out=e===8)",
    "class A{constructor(){return {x:7}}}class B extends A{constructor(){return (async()=>super(await 1))()}}new B().then(v=>out=v.x===7&&!(v instanceof B))",
    "var calls=0;class A{constructor(){calls++}}class B extends A{constructor(){return (async()=>super(await this))()}}new B().then(v=>out=false,e=>out=e instanceof ReferenceError&&calls===0)",
    "var n=0;class B extends null{constructor(){return (async()=>super((n++,await 7)))()}}new B().then(v=>out=false,e=>out=e instanceof TypeError&&n===1)",
    "class B extends null{constructor(){return (async()=>super(await Promise.reject(8)))()}}new B().then(v=>out=false,e=>out=e===8)",
    'var log="";var iterable={[Symbol.iterator](){log+="i";return {next(){log+="n";throw 8}}}};class A{}class B extends A{constructor(){return (async()=>super(...await iterable,(log+="later",7)))()}}new B().then(v=>out=false,e=>out=e===8&&log==="in")',
    "var f;class A{constructor(x){this.x=x}}class B extends A{constructor(){f=async()=>super(await 7);return {}}}new B();f().then(v=>out=v.x===7&&v instanceof B)",
    "class A{constructor(a,b){this.x=a+b}}class B extends A{constructor(){return (async()=>{try{return super(await 3,await 4)}finally{await 1}})()}}new B().then(v=>out=v.x===7)",
];
for (let i = 0; i < cases.length; i++) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(
        run("var out=false;" + cases[i], realm, session).type === "normal",
        "super constructor setup " + i,
    );
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "super constructor jobs " + i);
    const result = run("out", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "super constructor case " + i,
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
check(
    run(
        "var f;class C extends null{constructor(){f=async()=>super(await 1);return {}}}new C();",
        A,
        creator,
    ).type === "normal",
    "foreign arrow setup",
);
define(B, "f", own(A, "f"));
const session = createScriptSession();
run("var error;f().then(v=>{},e=>error=e)", B, session);
const jobs = drainScriptJobs(session);
check(!jobs.fatal && jobs.failures.length === 0, "foreign jobs");
const error = own(B, "error");
check(
    error.kind === "object" && error.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "super constructor error Realm",
);
const limited = createScriptSession({ maxSteps: 200, maxCalls: 32 }),
    realm = new Realm((_line: string) => {}, "script");
check(
    run(
        "class A{constructor(){while(true){}}}class B extends A{constructor(){return (async()=>super(await 1))()}}new B()",
        realm,
        limited,
    ).type === "normal",
    "limited setup",
);
const stopped = drainScriptJobs(limited);
check(
    stopped.fatal &&
        stopped.failures.length === 1 &&
        stopped.failures[0].completion.origin.kind === "resource-limit",
    "super constructor job budget",
);
console.log("async super constructor passed");
