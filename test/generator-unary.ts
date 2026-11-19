import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
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
    "function* f(){yield -(yield 1);}var g=f();g.next().value===1&&g.next(3).value===-3&&g.next().done;",
    "function* f(){return -(yield 1);}var g=f();g.next();g.next(7).value===-7;",
    'function* f(){return +(yield 1);}var g=f();g.next();g.next("7").value===7;',
    "function* f(){return ~(yield 1);}var g=f();g.next();g.next(3).value===-4;",
    "function* f(){return !(yield 1);}var g=f();g.next();g.next(0).value===true;",
    'function* f(){return typeof (yield 1);}var g=f();g.next();g.next(Symbol()).value==="symbol";',
    "function* f(){return void (yield 1);}var g=f();g.next();g.next(7).value===undefined;",
    "function* f(){return delete (yield 1);}var g=f(),o={x:7};g.next();g.next(o).value===true&&o.x===7;",
    "function* f(){return -(yield 1);}var g=f();g.next();Object.is(g.next(0).value,-0);",
    "function* f(){return -(-(yield 1));}var g=f();g.next();g.next(7).value===7;",
    "function* f(){return -((yield 1)+(yield 2));}var g=f();g.next();g.next(3);g.next(4).value===-7;",
    "function* f(){return -(yield 1)+(yield 2);}var g=f();g.next();g.next(3);g.next(4).value===1;",
    "function* f(){return (!(yield 1))?(yield 2):(yield 3);}var g=f();g.next();g.next(0).value===2&&g.next(7).value===7;",
    "function* f(){return -((yield 1)?(yield 2):(yield 3));}var g=f();g.next();g.next(false);g.next(7).value===-7;",
    "function* f(){return (-(yield 1))**2;}var g=f();g.next();g.next(3).value===9;",
    "var n=0,o={valueOf(){n++;return 7;}};function* f(){return +(yield 1);}var g=f();g.next();o.valueOf=function(){n+=2;return 8;};g.next(o).value===8&&n===2;",
    'var n=0,o={[Symbol.toPrimitive](){n++;throw 7;}};function* f(){var a=typeof (yield 1);var b=void (yield 2);var c=!(yield 3);var d=delete (yield 4);return a==="object"&&b===undefined&&c===false&&d===true;}var g=f();g.next();g.next(o);g.next(o);g.next(o);g.next(o).value===true&&n===0;',
    "function* f(){try{return +(yield 1);}catch(e){return e instanceof TypeError;}}var g=f();g.next();g.next(Symbol()).value===true;",
    "function* inner(){yield 1;return 7;}function* f(){return -(yield* inner());}var g=f();g.next().value===1&&g.next().value===-7;",
    "var n=0;function* f(){try{return +(yield 1);}finally{yield n;}}var g=f();g.next();g.return(7).value===0&&g.next().value===7;",
    "var marker={};function* f(){try{return +(yield 1);}catch(e){return e;}}var g=f();g.next();g.throw(marker).value===marker;",
    "function* f(){var x=-(yield 1);return x;}var g=f();g.next();g.next(7).value===-7;",
    "var x=1;function* f(){x+=-(yield 1);return x;}var g=f();g.next();g.next(7).value===-6;",
    "function* f(){try{throw -(yield 1);}catch(e){return e;}}var g=f();g.next();g.next(7).value===-7;",
    "function* f(){try{return typeof (yield missing);}catch(e){return e instanceof ReferenceError;}}var r=f().next();r.done&&r.value===true;",
    'var n=0,o={get x(){n++;throw 7;}};delete o.x;typeof missing==="undefined"&&n===0;',
    "var caught=false;try{typeof x;}catch(e){caught=e instanceof ReferenceError;}let x; caught;",
    "var n=0,o={valueOf(){n++;return 7;}};(-o)===-7&&(+o)===7&&(~o)===-8&&n===3;",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "unary case " + i,
    );
}
for (const source of [
    "function* f(){return -yield 1;}",
    "function* f(){return typeof yield 1;}",
    "function* f(){return -(yield 1)**2;}",
]) {
    check(
        prepareBoundedScript(
            { id: "boundary", text: source },
            new Realm((_line: string): void => {}, "script"),
        ).kind === "blocked",
        "unary boundary " + source,
    );
}
const A = new Realm((_line: string): void => {}, "script"),
    B = new Realm((_line: string): void => {}, "script");
const creator = createScriptSession();
run(
    "function* f(){return +(yield 1);}var g=f();g.next();var cleaned=false;function* costly(){try{return -(yield 1);}finally{cleaned=true;}}var slow=costly();slow.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "slow", own(A, "slow"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const failed = run("g.next(Symbol());", B, session);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "unary error Realm",
);
check(creator.inspect().steps === steps && session.inspect().steps > 0, "unary current session");
const stopped = run(
    "slow.next({valueOf(){while(true){}}});",
    B,
    createScriptSession({ maxSteps: 80, maxCalls: 16 }),
);
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "unary resource stop");
const closed = run("!cleaned&&slow.next().done;", A);
check(
    closed.type === "normal" && closed.value.kind === "boolean" && closed.value.value,
    "unary fatal discard",
);
{
    const source = "function* f(){return foo(-(yield 1));}",
        realm = new Realm((_line: string): void => {}, "script");
    check(
        prepareBoundedScript({ id: "historical-call", text: source }, realm).kind === "ready",
        "historical call admitted",
    );
    const result = run(
        "function foo(x){return x}" + source + "var g=f();g.next();" + "g.next(7).value===-7",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "historical call resumes",
    );
}
console.log("generator unary passed");
