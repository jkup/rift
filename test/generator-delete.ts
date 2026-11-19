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
    'var o={x:7};function* f(){return delete (yield 1).x}var g=f();g.next();g.next(o).value===true&&!Object.hasOwn(o,"x")',
    'var o={x:7};function* f(){return delete o[yield 1]}var g=f();g.next();g.next("x").value===true&&!Object.hasOwn(o,"x")',
    'var o={x:7};function* f(){return delete (yield 1)[yield 2]}var g=f();g.next();g.next(o).value===2&&Object.hasOwn(o,"x")&&g.next("x").value===true&&!Object.hasOwn(o,"x")',
    'var n=0,o={get x(){n++;throw 7}};function* f(){return delete (yield 1).x}var g=f();g.next();g.next(o).value===true&&n===0&&!Object.hasOwn(o,"x")',
    'var n=0,key={toString(){n++;return "x"}},o={x:7};function* f(){return delete o[yield 1]}var g=f();g.next();g.next(key).value===true&&n===1&&!Object.hasOwn(o,"x")',
    'var n=0,key={toString(){n++;return "x"}};function* f(){try{return delete (yield 1)[yield 2]}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(null).value===2&&g.next(key).value===true&&n===0',
    'var o={};Object.defineProperty(o,"x",{value:7});function* f(){return delete (yield 1).x}var g=f();g.next();g.next(o).value===false&&o.x===7',
    'var o={};Object.defineProperty(o,"x",{value:7});function* f(){"use strict";try{return delete (yield 1).x}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next(o).value===true&&o.x===7',
    'var o={x:7},other=o;function* f(){return delete o[yield 1]}var g=f();g.next();o={x:8};g.next("x").value===true&&!Object.hasOwn(other,"x")&&o.x===8',
    "var s=Symbol(),o={[s]:7};function* f(){return delete o[yield 1]}var g=f();g.next();g.next(s).value===true&&!Object.hasOwn(o,s)",
    'function* f(){return delete (yield 1)[0]}var g=f();g.next();g.next("abc").value===false',
    "var o=Object.create({x:7});function* f(){return delete (yield 1).x}var g=f();g.next();g.next(o).value===true&&o.x===7",
    "var o=[7,8];function* f(){return delete o[yield 1]}var g=f();g.next();g.next(0).value===true&&o.length===2&&!(0 in o)",
    'var o={x:7},n=0;function key(){n++;return "x"}function* f(){try{return delete (yield 1)[key()]}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8&&n===0&&o.x===7',
    "var o={x:7};function* f(){try{return delete o[yield 1]}catch(e){return e}}var g=f();g.next();g.throw(8).value===8&&o.x===7",
    "var o={x:7},key={[Symbol.toPrimitive](){throw 8}};function* f(){try{return delete o[yield 1]}catch(e){return e}}var g=f();g.next();g.next(key).value===8&&o.x===7",
    'var o={x:7};function* f(){return !(delete (yield 1).x)}var g=f();g.next();g.next(o).value===false&&!Object.hasOwn(o,"x")',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "delete case " + i,
    );
}
for (const source of [
    "async function f(){return delete (await Promise.resolve(o)).x}f().then(v=>out=v)",
    'async function* f(){yield delete o[await Promise.resolve("x")]}f().next().then(r=>out=r.value)',
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=false,o={x:7};" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run('out&&!Object.hasOwn(o,"x")', realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async delete result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run('function* f(){"use strict";return delete (yield 1).x}var g=f();g.next();', A, creator);
define(B, "g", own(A, "g"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run('var o={};Object.defineProperty(o,"x",{value:7});g.next(o)', B, session);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "deletion error realm",
);
check(creator.inspect().steps === steps, "current delete session");
console.log("generator delete passed");
