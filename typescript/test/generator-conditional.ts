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
    "function* f(){yield (yield 1)?2:3;}var g=f();g.next().value===1&&g.next(false).value===3&&g.next().done;",
    "function* f(){return -(yield 1);}var g=f();g.next().value===1&&g.next(7).value===-7;",
    "function* f(){return (yield 1)?yield 2:yield 3;}var g=f();g.next();g.next(false).value===3&&g.next(7).value===7;",
    "function* f(){return (yield 1)?(yield 2):(yield 3);}var a=f(),b=f();a.next();b.next();a.next(true).value===2&&b.next(false).value===3&&a.next(7).value===7&&b.next(8).value===8;",
    "var trace=\"\";function yes(){trace+=\"T\";return 7;}function no(){trace+=\"F\";return 8;}function* f(){return (yield 1)?yes():no();}var g=f();g.next();var before=trace;before===\"\"&&g.next(true).value===7&&trace===\"T\";",
    "var trace=\"\";function test(){trace+=\"T\";return true;}function* f(){return test()?(yield 1):(yield 2);}var g=f();g.next();var before=trace;before===\"T\"&&g.next(7).value===7&&trace===\"T\";",
    "function* f(){return true?7:(yield 1);}var r=f().next();r.done&&r.value===7;",
    "function* f(){return false?(yield 1):8;}var r=f().next();r.done&&r.value===8;",
    "function* f(){var x=(yield 1)?2:3;return x;}var g=f();g.next();g.next(true).value===2;",
    "var read;function* f(){read=()=>x;let x=(yield 1)?(yield 2):3;return x;}var g=f();g.next();var n=0;try{read();}catch(e){if(e instanceof ReferenceError)n++;}g.next(true);try{read();}catch(e){if(e instanceof ReferenceError)n++;}n===2&&g.next(7).value===7;",
    "function* f(){return 1+((yield 1)?(yield 2):(yield 3));}var g=f();g.next();g.next(false).value===3&&g.next(7).value===8;",
    "function* f(){return ((yield 1)+1)?(yield 2):(yield 3);}var g=f();g.next();g.next(-1).value===3&&g.next(7).value===7;",
    "function* f(){return (yield 1)?((yield 2)?3:4):5;}var g=f();g.next();g.next(true).value===2&&g.next(false).value===4;",
    "function* f(){return (yield 1)?2:(yield 3)?4:5;}var g=f();g.next();g.next(false).value===3&&g.next(true).value===4;",
    "function* inner(){yield 1;return false;}function* f(){return (yield* inner())?(yield 2):(yield 3);}var g=f();g.next().value===1&&g.next().value===3&&g.next(7).value===7;",
    "function* inner(){yield 2;return 7;}function* f(){return (yield 1)?(yield* inner()):9;}var g=f();g.next();g.next(true).value===2&&g.next().value===7;",
    "var trace=\"\",o={get x(){trace+=\"G\";return 1;},set x(v){trace+=\"S\"+v;}};function* f(){o.x+=(yield 1)?(yield 2):3;}var g=f();g.next();g.next(true);g.next(7);trace===\"GS8\";",
    "function* f(){let [x]=(yield 1)?[7]:[8];return x;}var g=f();g.next();g.next(false).value===8;",
    "var marker={};function* f(){try{throw (yield 1)?marker:7;}catch(e){return e;}}var g=f();g.next();g.next(true).value===marker;",
    "var n=0;function side(){n++;return 7;}function* f(){try{return (yield 1)?side():side();}finally{yield n;}}var g=f();g.next();g.return(9).value===0&&g.next().value===9&&n===0;",
    "var n=0,marker={};function side(){n++;return 7;}function* f(){try{return (yield 1)?side():side();}catch(e){return e;}}var g=f();g.next();g.throw(marker).value===marker&&n===0;",
    "var marker={};function fail(){throw marker;}function* f(){try{return (yield 1)?fail():7;}catch(e){yield e;return 8;}}var g=f();g.next();g.next(true).value===marker&&g.next().value===8;",
    "var object={valueOf(){throw 7;}};function* f(){return (yield 1)?2:3;}var g=f();g.next();g.next(object).value===2;",
    "var marker={},o={get x(){throw marker;}};function* f(){try{return (yield 1)?o.x:7;}catch(e){return e;}}var g=f();g.next();g.next(false).value===7;",
    "function* f(){(yield 1)?(yield 2):(yield 3);return 9;}var g=f();g.next();g.next(true).value===2&&g.next(7).value===9;",
    "function* f(){var x=(yield 1)?function(){}:function(){};return x.name;}var g=f();g.next();g.next(true).value===\"\";"
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "conditional case " + i);
}
for (const source of [ "function* f(){return foo((yield 1)?2:3);}", "function* f(){if(yield 1){}}"])
    check(prepareBoundedScript({id: "boundary", text: source}, new Realm((_line: string): void => {}, "script")).kind === "blocked", "conditional boundary " + source);
const A = new Realm((_line: string): void => {}, "script"), B = new Realm((_line: string): void => {}, "script");
const creator = createScriptSession();run('function* f(){return (yield 1)?null.x:7;}var g=f();g.next();', A, creator);define(B, "g", own(A, "g"));
const steps = creator.inspect().steps, session = createScriptSession();
const failed = run('g.next(true);', B, session);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"), "conditional error Realm");
check(creator.inspect().steps === steps && session.inspect().steps > 0, "conditional current session");
console.log("generator conditional passed");
