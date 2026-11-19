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
    "function* f(){for(var x of yield 1)yield x;return x}var g=f();g.next().value===1&&g.next([3,7]).value===3&&g.next().value===7&&g.next().value===7",
    "function* f(){for(let x of yield 1)yield ()=>x}var g=f();g.next();var a=g.next([3,7]).value,b=g.next().value;g.next().done&&a()===3&&b()===7",
    "function* f(){for(const x of yield 1)yield x}var g=f();g.next();g.next([7]).value===7&&g.next().done",
    "function* f(){var x;for(x of yield 1)yield x;return x}var g=f();g.next();g.next([7]).value===7&&g.next().value===7",
    "var o={};function* f(){for(o.x of yield 1)yield o.x}var g=f();g.next();g.next([7]).value===7&&g.next().done&&o.x===7",
    "function* f(){for(const [x] of yield 1)yield x}var g=f();g.next();g.next([[7]]).value===7&&g.next().done",
    'function* f(){for(var x in yield 1)yield x}var g=f();g.next();g.next({a:1,b:2}).value==="a"&&g.next().value==="b"&&g.next().done',
    'function* f(){for(let x in yield 1)yield ()=>x}var g=f();g.next();var a=g.next({a:1,b:2}).value,b=g.next().value;g.next().done&&a()==="a"&&b()==="b"',
    "function* f(){for(const x in yield 1)yield x;return 7}var g=f();g.next();g.next(null).value===7",
    "function* f(){for(var x in yield 1)yield x;return 7}var g=f();g.next();g.next(undefined).value===7",
    'function* f(){for(var x in yield 1)yield x}var g=f();g.next();g.next("ab").value==="0"&&g.next().value==="1"&&g.next().done',
    "var x=7;function* f(){try{for(let x of yield x){}}catch(e){return e instanceof ReferenceError}}f().next().value===true",
    "var x=7;function* f(){for(let x of yield (()=>x))yield x;return 8}var g=f(),read=g.next().value,tdz=false;try{read()}catch(e){tdz=e instanceof ReferenceError}var first=g.next([7]).value;g.next();var still=false;try{read()}catch(e){still=e instanceof ReferenceError}tdz&&first===7&&still&&x===7",
    "var x=7;function* f(){try{for(const x in yield x){}}catch(e){return e instanceof ReferenceError}}f().next().value===true",
    "var n=0;function source(x){n++;return x}function* f(){for(let x of source(yield 1))yield x;return n}var g=f();g.next();g.next([3,7]);g.next();g.next().value===1&&n===1",
    "var closed=0,o={[Symbol.iterator](){return this},next(){return {value:7,done:false}},return(){closed++;return {}}};function* f(){outer:for(const x of yield 1){yield x;break outer}return 8}var g=f();g.next();g.next(o).value===7&&g.next().value===8&&closed===1",
    "function* f(){outer:for(const x of yield 1){yield x;continue outer}return 8}var g=f();g.next();g.next([3,7]).value===3&&g.next().value===7&&g.next().value===8",
    "var n=0,o={get [Symbol.iterator](){n++;return function(){return [7][Symbol.iterator]()}}};function* f(){try{for(const x of yield 1)yield x}finally{yield 2}}var g=f();g.next();g.return(o).value===2&&g.next().value===o&&n===0",
    "var n=0,o={get [Symbol.iterator](){n++}};function* f(){try{for(const x of yield 1)yield x}catch(e){return e}}var g=f();g.next();g.throw(o).value===o&&n===0",
    "var x=3;function* f(){try{for(let x of yield 1){}}catch(e){return x===3&&e instanceof TypeError}}var g=f();g.next();g.next(null).value===true",
    "function* f(){try{for(const x of yield 1){}}catch(e){return e}}var g=f();g.next();g.next({get [Symbol.iterator](){throw 7}}).value===7",
    'var p={a:1},o=Object.create(p);o.b=2;function* f(){for(const x in yield 1)yield x}var g=f();g.next();g.next(o).value==="b"&&g.next().value==="a"&&g.next().done',
    "function* inner(){yield 1;return [7]}function* f(){for(const x of yield* inner())yield x}var g=f();g.next().value===1&&g.next().value===7&&g.next().done",
    'var n=0;function* f(){for(const x of yield 1){for(const y in yield 2){yield x+y;n++}}return n}var g=f();g.next();g.next([7]).value===2&&g.next({a:1}).value==="7a"&&g.next().value===1',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "for source case " + i,
    );
}
for (const source of [
    "async function f(){for(const x of await Promise.resolve([7]))return x}f().then(v=>out=v)",
    "async function f(){for await(const x of await Promise.resolve([7]))return x}f().then(v=>out=v)",
    "async function* f(){for await(const x of await Promise.resolve([7]))yield x}f().next().then(r=>out=r.value)",
    'async function f(){for(const x in await Promise.resolve({x:7}))return x==="x"?7:8}f().then(v=>out=v)',
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async source result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "function* f(){for(const x of yield 1)yield x}var g=f();g.next();var h=f();h.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run("g.next(null)", B, session);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "source error Realm",
);
const stopped = run(
    "h.next({get [Symbol.iterator](){while(true){}}})",
    B,
    createScriptSession({ maxSteps: 100, maxCalls: 16 }),
);
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "source current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator for source passed");
