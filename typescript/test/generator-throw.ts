import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import { type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(source: string, realm: Realm, session: ScriptSession = createScriptSession()): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "generator-start", text: source }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + ": " + source);
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller state restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") throw new Error("missing " + name);
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
const cases: string[] = [
    "function* f(){throw 1+(yield 2);}var g=f(),caught;g.next();try{g.next(7);}catch(e){caught=e;}caught===8&&g.next().done;",
    "function* f(){throw yield 1;}var g=f(),marker={},caught;var first=g.next();try{g.next(marker);}catch(e){caught=e;}first.value===1&&!first.done&&caught===marker&&g.next().done;",
    "function* f(){try{throw yield 1;}catch(e){yield e;return 8;}}var g=f(),marker={};g.next();g.next(marker).value===marker&&g.next().value===8;",
    "function* f(){try{throw yield 1;}finally{yield 2;}}var g=f(),marker={},caught;g.next();var cleanup=g.next(marker);try{g.next(99);}catch(e){caught=e;}cleanup.value===2&&caught===marker&&g.next().done;",
    "function* f(){try{throw yield 1;}finally{return 9;}}var g=f();g.next();g.next(7).value===9;",
    "function* f(){try{throw yield 1;}finally{yield 2;}}var g=f();g.next();g.return(7).value===2&&g.next(99).value===7;",
    "function* f(){try{throw yield 1;}catch(e){return e;}}var g=f(),marker={};g.next();g.throw(marker).value===marker;",
    "function* f(){try{throw yield 1;}catch(e){return e;}}var g=f();g.next();g.next().value===undefined&&g.next().done;",
    "function* inner(){yield 1;return 7;}function* f(){try{throw yield* inner();}catch(e){return e;}}var g=f();g.next().value===1&&g.next().value===7;",
    "var it={next(){return {done:false,value:1};},return(v){return {done:true,value:v};},[Symbol.iterator](){return this;}};function* f(){throw yield* it;}var g=f();g.next();g.return(7).value===7&&g.next().done;",
    "var it={next(){return {done:false,value:1};},throw(v){return {done:true,value:v};},[Symbol.iterator](){return this;}};function* f(){try{throw yield* it;}catch(e){return e;}}var g=f(),marker={};g.next();g.throw(marker).value===marker;",
    "var marker={};function fail(){throw marker;}function* f(){try{throw yield fail();}catch(e){return e;}}var r=f().next();r.done&&r.value===marker;",
    "var trace=\"\";function* f(){for(var x of { [Symbol.iterator](){return {next(){return {done:false,value:1};},return(){trace+=\"C\";return {};}};}}){throw yield x;}}var g=f(),marker={},caught;g.next();try{g.next(marker);}catch(e){caught=e;}caught===marker&&trace===\"C\";"
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "throw case " + i);
}
for (const source of [ "function* f(){throw\nyield 1;}"]) {
    check(prepareBoundedScript({id: "boundary", text: source}, new Realm((_line: string): void => {}, "script")).kind === "blocked", "throw boundary");
}
const A = new Realm((_line: string): void => {}, "script"), B = new Realm((_line: string): void => {}, "script");
const creator = createScriptSession();
run('function* f(){\nthrow yield 1;\n}var g=f();g.next();', A, creator);
define(B, "g", own(A, "g"));
const marker: Value = {kind: "object", object: B.createObject()};
define(B, "marker", marker);
const steps = creator.inspect().steps, resumed = createScriptSession();
const failed = run('g.next(marker);', B, resumed);
check(failed.type === "throw" && failed.value === marker, "cross-Realm throw identity");
check(failed.type === "throw" && failed.diagnostic.loc.line === 2, "resumed throw source location");
check(resumed.inspect().lastAbrupt?.realm === A && creator.inspect().steps === steps, "resumed source Realm/current session");
console.log("generator throw passed");
