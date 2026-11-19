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
    "function C(){this.x=7}function* f(){return new (yield 1)()}var g=f();g.next().value===1&&g.next(C).value.x===7",
    "function C(){this.x=7}function* f(){return new (yield 1)}var g=f();g.next();g.next(C).value.x===7",
    "function C(x){this.x=x}function* f(){return new (yield 1)(yield 2)}var g=f();g.next();g.next(C).value===2&&g.next(7).value.x===7",
    'var log="";function arg(){log+="a";return 7}function C(x){log+="c";this.x=x}function* f(){return new (yield 1)(arg())}var g=f();g.next();log===""&&g.next(C).value.x===7&&log==="ac"',
    'var log="";function arg(){log+="a";return 7}function* f(){try{return new (yield 1)(arg())}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(0).value===true&&log==="a"',
    "function arg(){throw 7}function* f(){try{return new (yield 1)(arg())}catch(e){return e}}var g=f();g.next();g.next(0).value===7",
    "var n=0;function arg(){n++;return 7}function* f(){try{return new (yield 1)(arg())}catch(e){return e}}var g=f();g.next();g.throw(8).value===8&&n===0",
    "var n=0;function arg(){n++;return 7}function* f(){try{return new (yield 1)(arg())}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8&&n===0",
    "var n=0,o={get C(){n++;return function(x){this.x=x}}};function* f(){return new (yield 1).C(yield 2)}var g=f();g.next();g.next(o).value===2&&n===1&&g.next(7).value.x===7&&n===1",
    'var o={C:function(x){this.x=x}};function* f(){return new o[yield 1](yield 2)}var g=f();g.next();g.next("C");g.next(7).value.x===7',
    "function C(a,b){this.x=a+b}function* f(){return new (yield 1)(...[3,4])}var g=f();g.next();g.next(C).value.x===7",
    "function C(a,b){this.x=a+b}function* f(){return new (yield 1)(...(yield 2))}var g=f();g.next();g.next(C);g.next([3,4]).value.x===7",
    "function C(){this.target=new.target}function* f(){return new (yield 1)()}var g=f();g.next();g.next(C).value.target===C",
    "function C(a,b){this.x=a+b}var B=C.bind(null,3);function* f(){return new (yield 1)(4)}var g=f();g.next();var o=g.next(B).value;o.x===7&&Object.getPrototypeOf(o)===C.prototype",
    "var p={};function C(){}function* f(){return new (yield 1)(yield 2)}var g=f();g.next();g.next(C);C.prototype=p;Object.getPrototypeOf(g.next().value)===p",
    "function C(){return {x:7}}function* f(){return new (yield 1)()}var g=f();g.next();g.next(C).value.x===7",
    "function C(){throw 7}function* f(){try{return new (yield 1)()}catch(e){return e}}var g=f();g.next();g.next(C).value===7",
    "function* f(){try{return new (yield 1)()}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(()=>7).value===true",
    "function C(){this.x=7}function* f(){return [new (yield 1)()][0].x}var g=f();g.next();g.next(C).value===7",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "constructor case " + i,
    );
}
for (const source of [
    "async function f(){return new (await Promise.resolve(C))(7)}f().then(o=>out=o.x)",
    "async function* f(){yield new (await Promise.resolve(C))(await Promise.resolve(7))}f().next().then(r=>out=r.value.x)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(
        run("var out=0;function C(x){this.x=x}" + source, realm, session).type === "normal",
        "async setup",
    );
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async constructor result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run("function* f(){return new (yield 1)(7)}var g=f();g.next();", A, creator);
define(B, "g", own(A, "g"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run(
    "function C(x){this.x=x}var o=g.next(C).value;o.x===7&&Object.getPrototypeOf(o)===C.prototype",
    B,
    session,
);
check(
    result.type === "normal" && result.value.kind === "boolean" && result.value.value,
    "supplied constructor realm",
);
check(creator.inspect().steps === steps, "current constructor session");
console.log("generator constructor passed");
