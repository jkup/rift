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
    "var x=false,old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=false,old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=false,old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=0,old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=0,old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=0,old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=-0,old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=-0,old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=-0,old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=NaN,old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=NaN,old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=NaN,old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    'var x="",old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0',
    'var x="",old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1',
    'var x="",old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0',
    "var x=null,old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=null,old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=null,old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=undefined,old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=undefined,old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=undefined,old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=1,old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=1,old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=1,old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    'var x="a",old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1',
    'var x="a",old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0',
    'var x="a",old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0',
    "var x={},old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x={},old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x={},old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=Symbol(),old=x,n=0;function rhs(){n++;return 7}var result=(x&&=rhs());Object.is(result,7)&&Object.is(x,7)&&n===1",
    "var x=Symbol(),old=x,n=0;function rhs(){n++;return 7}var result=(x||=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    "var x=Symbol(),old=x,n=0;function rhs(){n++;return 7}var result=(x??=rhs());Object.is(result,old)&&Object.is(x,old)&&n===0",
    'var log="",key={toString(){log+="k";return "x"}},o={get x(){log+="g";return 0},set x(v){log+="s"+v}};function rhs(){log+="r";return 7}var result=(o[key]||=rhs());result===7&&log==="kgrs7"',
    'var log="",o={get x(){log+="g";return 1},set x(v){log+="s"}};function rhs(){log+="r";return 7}(o.x||=rhs())===1&&log==="g"',
    'var n=0,key={toString(){n++;return "x"}},o={get x(){key.toString=function(){throw 8};return null},set x(v){this.y=v}};(o[key]??=7)===7&&o.y===7&&n===1',
    'var o={get x(){Object.defineProperty(o,"x",{set(v){this.y=v+1}});return null},set x(v){this.y=v}};(o.x??=7)===7&&o.y===8',
    "var a,b,c;a||=b??=c=7;a===7&&b===7&&c===7",
    'var x;x||=function(){};x.name==="x"',
    'var x;x??=()=>7;x.name==="x"&&x()===7',
    'var x=1;x&&=class{};x.name==="x"',
    'var x;(x)||=function(){};x.name===""',
    'var o={};o.x||=function(){};o.x.name===""',
    "const x=1;(x||=7)===1&&x===1",
    "const x=null;var ok=false;try{x??=7}catch(e){ok=e instanceof TypeError}ok",
    "var n=0,ok=false;try{missing||=(n++,7)}catch(e){ok=e instanceof ReferenceError}ok&&n===0",
    "var ok=false;try{x||=7;let x}catch(e){ok=e instanceof ReferenceError}ok",
    'var o={};Object.defineProperty(o,"x",{value:1});function f(){"use strict";return o.x||=7}f()===1',
    'var o={};Object.defineProperty(o,"x",{value:0});function f(){"use strict";return o.x||=7}var ok=false;try{f()}catch(e){ok=e instanceof TypeError}ok',
    "var base={get x(){return this.y},set x(v){this.y=v}},o={__proto__:base,y:0,f(){return super.x||=7}};o.f()===7&&o.y===7",
    "var n=0,o={get x(){throw 8},set x(v){n++}};var ok=false;try{o.x??=(n++,7)}catch(e){ok=e===8}ok&&n===0",
    "var o={x:0};function rhs(){throw 8}var ok=false;try{o.x||=rhs()}catch(e){ok=e===8}ok&&o.x===0",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "logical assignment case " + i,
    );
}
for (const source of ["1||=7", "({x})??=7", "[x]&&=7", "null?.x||=7"]) {
    check(
        prepareBoundedScript(
            { id: "boundary", text: source },
            new Realm((_line: string) => {}, "script"),
        ).kind === "blocked",
        "logical assignment boundary " + source,
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    'var f=function(){"use strict";var o={};Object.defineProperty(o,"x",{value:0});return o.x||=7},h=function(){var o={get x(){while(true){}}};return o.x??=7}',
    A,
    creator,
);
define(B, "f", own(A, "f"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    result = run("f()", B);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "logical assignment error Realm",
);
const stopped = run("h()", B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "logical assignment current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("logical assignment passed");

{
    const result = run(
        "function* f(){var x;x??=yield 1}var g=f();g.next().value===1&&g.next(7).done",
        new Realm((_line: string) => {}, "script"),
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original logical RHS boundary",
    );
}
{
    const result = run(
        'function* f(){var o={};o[yield 1]||=7}var g=f();g.next().value===1&&g.next("x").done',
        new Realm((_line: string) => {}, "script"),
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original logical target boundary",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(
        run(
            "var done=false;async function f(){var x;x||=await 7}f().then(()=>done=true)",
            realm,
            session,
        ).type === "normal",
        "original logical async setup",
    );
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "original logical async jobs");
    const result = run("done", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original logical async boundary",
    );
}
