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
const cases: string[] = [
    'function* f(){return `a${yield 1}b`}var g=f();g.next();g.next(7).value==="a7b"',
    'function* f(){return `${yield 1}:${yield 2}`}var g=f();g.next();g.next(7).value===2&&g.next(8).value==="7:8"',
    'function* f(){return `a${`b${yield 1}c`}d`}var g=f();g.next();g.next(7).value==="ab7cd"',
    'var log="";function side(x){log+=x;return x}function* f(){return `${side(1)}${yield 2}${side(3)}`}var g=f();g.next();var before=log;g.next(7).value==="173"&&before==="1"&&log==="13"',
    'var log="",o={[Symbol.toPrimitive](hint){log+=hint;return 7}};function* f(){return `${yield 1}:${yield 2}`}var g=f();g.next();g.next(o).value===2&&log==="string"&&g.next(8).value==="7:8"',
    'var log="",o={toString(){log+="s";return 7},valueOf(){log+="v";return 8}};function* f(){return `${yield 1}`}var g=f();g.next();g.next(o).value==="7"&&log==="s"',
    "function* f(){try{return `${yield 1}`}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(Symbol()).value===true",
    "var n=0,o={toString(){n++;throw 7}};function* f(){try{return `${yield 1}:${yield 2}`}catch(e){return e}}var g=f();g.next();g.next(o).value===7&&n===1",
    "var n=0,o={toString(){n++;return 8}};function* f(){try{return `${yield 1}`}finally{yield 2}}var g=f();g.next();g.return(o).value===2&&g.next().value===o&&n===0",
    "function* f(){try{return `${yield 1}`}catch(e){return e}}var g=f();g.next();g.throw(7).value===7",
    "function* f(){return `${yield 1}`.length}var g=f();g.next();g.next(123).value===3",
    'function id(x){return x}function* f(){return id(`${yield 1}`)}var g=f();g.next();g.next(7).value==="7"',
    'function* f(){return [`${yield 1}`][0]}var g=f();g.next();g.next(7).value==="7"',
    'function* inner(){yield 1;return 7}function* f(){return `x${yield* inner()}`}var g=f();g.next();g.next().value==="x7"',
    'function* f(){return `${yield 1}`}var a=f(),b=f();a.next();b.next();a.next(undefined).value==="undefined"&&b.next(null).value==="null"',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "template case " + i,
    );
}
for (const source of [
    "async function f(){return `a${await Promise.resolve(7)}b`}f().then(x=>out=x)",
    "async function* f(){yield `a${await Promise.resolve(7)}b`}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run('var out="";' + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run('out==="a7b"', realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async template result",
    );
}
console.log("generator template passed");
