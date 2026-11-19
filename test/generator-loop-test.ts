import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
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
    "function* f(){while(yield 1){yield 2;}return 7;}var g=f();g.next().value===1&&g.next(true).value===2&&g.next().value===1&&g.next(false).value===7;",
    "function* f(){do{yield 2;}while(yield 1);return 7;}var g=f();g.next().value===2&&g.next().value===1&&g.next(true).value===2&&g.next().value===1&&g.next(false).value===7;",
    "function* f(){while(yield 1){}return 7;}var g=f();g.next();g.next(true).value===1&&g.next(false).value===7;",
    "function* f(){var i=0;do{i++;continue;}while(yield i);return i;}var g=f();g.next().value===1&&g.next(true).value===2&&g.next(false).value===2;",
    "function* f(){while(yield 1){break;}return 7;}var g=f();g.next();g.next(true).value===7;",
    "function* f(){do{break;}while(yield 1);return 7;}var r=f().next();r.done&&r.value===7;",
    "function* f(){while((yield 1)+(yield 2)===3){yield 4;break;}return 7;}var g=f();g.next();g.next(1).value===2&&g.next(2).value===4&&g.next().value===7;",
    "function* inner(){yield 1;return false;}function* f(){while(yield* inner()){yield 2;}return 7;}var g=f();g.next();g.next().value===7;",
    "function* inner(){return false;}function* f(){while(yield* inner()){yield 2;}return 7;}var r=f().next();r.done&&r.value===7;",
    "function* f(){while(false&&(yield 1)){yield 2;}return 7;}var r=f().next();r.done&&r.value===7;",
    "function* f(){while(yield yield 1){yield 2;break;}return 7;}var g=f();g.next();g.next(3).value===3&&g.next(true).value===2&&g.next().value===7;",
    "var n=0;function* f(){try{while(yield 1)n++;}finally{yield n;}}var g=f();g.next();g.return(7).value===0&&g.next().value===7;",
    "var marker={};function* f(){try{do{yield 1;}while(yield 2);}catch(e){return e;}}var g=f();g.next();g.next().value===2&&g.throw(marker).value===marker;",
    "function* f(){outer:while(yield 1){while(true){yield 2;continue outer;}}return 7;}var g=f();g.next();g.next(true).value===2&&g.next().value===1&&g.next(false).value===7;",
    "function* f(){while(yield 1){try{continue;}finally{yield 2;}}return 7;}var g=f();g.next();g.next(true).value===2&&g.next().value===1&&g.next(false).value===7;",
    "function* f(){var i=0;while(yield i){let x=++i;yield ()=>x;}}var g=f();g.next();var a=g.next(true).value;g.next();var b=g.next(true).value;g.next();g.next(false);a()===1&&b()===2;",
    "function* f(){while(yield 1){while(yield 2){yield 3;break;}}return 7;}var g=f();g.next();g.next(true).value===2&&g.next(true).value===3&&g.next().value===1&&g.next(false).value===7;",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "loop test case " + i,
    );
}
const A = new Realm((_line: string): void => {}, "script"),
    B = new Realm((_line: string): void => {}, "script"),
    creator = createScriptSession();
run(
    "var cleaned=false;function* f(){try{while((yield 1)+(yield 2)){}}finally{cleaned=true;}}var g=f();g.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
run("g.next(1);", B);
const steps = creator.inspect().steps,
    session = createScriptSession({ maxSteps: 80, maxCalls: 16 });
const stopped = run("g.next({valueOf(){while(true){}}});", B, session);
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "loop test current budget",
);
check(
    creator.inspect().steps === steps && session.inspect().steps > 0,
    "loop test current session",
);
const closed = run("!cleaned&&g.next().done;", A);
check(
    closed.type === "normal" && closed.value.kind === "boolean" && closed.value.value,
    "loop test fatal discard",
);
{
    const source = "function* f(){while(foo(yield 1)){}}",
        realm = new Realm((_line: string): void => {}, "script");
    check(
        prepareBoundedScript({ id: "historical-call", text: source }, realm).kind === "ready",
        "historical call admitted",
    );
    const result = run(
        "function foo(x){return x}" + source + "var g=f();g.next();" + "g.next(false).done",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "historical call resumes",
    );
}
{
    const source = "function* f(){for(;yield 1;){}}",
        realm = new Realm((_line: string) => {}, "script");
    check(
        prepareBoundedScript({ id: "historical-for-test", text: source }, realm).kind === "ready",
        "historical for test admitted",
    );
    const result = run(source + "var g=f();g.next().value===1&&g.next(false).done", realm);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "historical for test resumes",
    );
}
console.log("generator loop test passed");
