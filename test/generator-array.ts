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
const cases: string[] = [
    "function* f(){return [yield 1]}var g=f();g.next();var a=g.next(7).value;a.length===1&&a[0]===7",
    'function* f(){return [1,yield 2,3,yield 4]}var g=f();g.next();g.next(7);g.next(8).value.join(":")==="1:7:3:8"',
    "function* f(){return [,,yield 1,,]}var g=f();g.next();var a=g.next(7).value;a.length===4&&!(0 in a)&&!(1 in a)&&a[2]===7&&!(3 in a)",
    'function* f(){return [...(yield 1)]}var g=f();g.next();g.next([2,3]).value.join(":")==="2:3"',
    "function* f(){return [0,...(yield 1),,4]}var g=f();g.next();var a=g.next([2,3]).value;a.length===5&&a[1]===2&&a[2]===3&&!(3 in a)&&a[4]===4",
    "function* f(){return [[yield 1],[yield 2]]}var g=f();g.next();g.next(7);var a=g.next(8).value;a[0][0]===7&&a[1][0]===8",
    "function* f(){return [yield 1][0]}var g=f();g.next();g.next(7).value===7",
    'var log="";function side(x){log+=x;return x}function* f(){return [side(1),yield 2,side(3)]}var g=f();g.next();var before=log;g.next(7).value.join(":")==="1:7:3"&&before==="1"&&log==="13"',
    'var n=0;Object.defineProperty(Array.prototype,"0",{set(){n++},configurable:true});function* f(){return [yield 1]}var g=f();g.next();var a=g.next(7).value;a[0]===7&&n===0&&Object.getOwnPropertyDescriptor(a,"0").writable',
    "var n=0;function side(){n++;return 9}function* f(){try{return [yield 1,side()]}finally{yield 2}}var g=f();g.next();g.return(7).value===2&&g.next().value===7&&n===0",
    "var n=0;function side(){n++;return 9}function* f(){try{return [yield 1,side()]}catch(e){return e}}var g=f();g.next();g.throw(7).value===7&&n===0",
    "var n=0,o={[Symbol.iterator](){return {next(){throw 7},return(){n++;return {}}}}};function* f(){try{return [...(yield 1)]}catch(e){return e}}var g=f();g.next();g.next(o).value===7&&n===0",
    'function* f(){return [...(yield 1)]}var g=f();g.next();g.next("ab").value.join(":")==="a:b"',
    "function* f(){return [...[],yield 1,...[],,]}var g=f();g.next();var a=g.next(7).value;a.length===2&&a[0]===7&&!(1 in a)",
    "function* inner(){yield 1;return 7}function* f(){return [yield* inner()]}var g=f();g.next();g.next().value[0]===7",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "array case " + i,
    );
}
for (const source of [
    "async function f(){return [await Promise.resolve(7)][0]}f().then(x=>out=x)",
    "async function f(){return [...(await Promise.resolve([7]))][0]}f().then(x=>out=x)",
    "async function* f(){yield [await Promise.resolve(7)][0]}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async array result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run("function* f(){return [yield 1]}var g=f();g.next();", A, creator);
define(B, "g", own(A, "g"));
define(B, "ownerArray", { kind: "object", object: A.arrayPrototype });
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run("Object.getPrototypeOf(g.next(7).value)===ownerArray", B, session);
check(
    result.type === "normal" && result.value.kind === "boolean" && result.value.value,
    "owner array prototype",
);
check(creator.inspect().steps === steps, "current array session");
console.log("generator array passed");
