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
    "function* f(){var [x,y=3,...rest]=yield 1;return x+y+rest[0];}var g=f();g.next();g.next([2,undefined,4]).value===9;",
    "function* f(){let {a:{b},...rest}=yield 1;return b+rest.c;}var g=f();g.next();g.next({a:{b:2},c:4}).value===6;",
    "function* f(){const [x]=yield 1;try{x=2;}catch(e){return e instanceof TypeError&&x===7;}}var g=f();g.next();g.next([7]).value===true;",
    "var read;function* f(){read=()=>x;let [x]=yield 1;return read();}var g=f();g.next();var tdz=false;try{read();}catch(e){tdz=e instanceof ReferenceError;}tdz&&g.next([7]).value===7&&read()===7;",
    "var x=1;function* f(){[x]=yield 1;return x;}var g=f();g.next();g.next([7]).value===7&&x===7;",
    'var o={},key="a";function* f(){({x:o[key]}=yield 1);return o;}var g=f();g.next();key="b";g.next({x:7}).value.b===7&&!Object.hasOwn(o,"a");',
    'var trace="",o={set x(v){trace+="S"+v;}};function* f(){[o.x]=yield (trace+="Y",1);}var g=f();g.next();var before=trace;g.next([7]);before==="Y"&&trace==="YS7";',
    'var trace="",n=2;function key(){trace+="K";return "x";}function* f(){let {[key()]:x=n}=yield 1;return x;}var g=f();g.next();var before=trace;n=7;before===""&&g.next({}).value===7&&trace==="K";',
    "function* inner(){yield 1;return [7];}function* f(){let [x]=yield* inner();return x;}var g=f();g.next();g.next().value===7;",
    'var n=0;function key(){n++;return "x";}function* f(){try{let {[key()]:x}=yield 1;}finally{yield n;}}var g=f();g.next();g.return(7).value===0&&g.next().value===7&&n===0;',
    "var x=1,marker={};function* f(){try{[x]=yield 1;}catch(e){return e;}}var g=f();g.next();g.throw(marker).value===marker&&x===1;",
    "var closed=0,it={next(){return {done:false,value:7};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){let [x]=yield 1;return x;}var g=f();g.next();g.next(it).value===7&&closed===1;",
    "var closed=0,marker={},o={set x(v){throw marker;}},it={next(){return {done:false,value:7};},return(){closed++;throw 9;},[Symbol.iterator](){return this;}};function* f(){try{[o.x]=yield 1;}catch(e){yield e;}}var g=f();g.next();g.next(it).value===marker&&closed===1;",
    "function* f(){try{let [x]=yield 1;}catch(e){return e instanceof TypeError;}}var g=f();g.next();g.next(null).value===true;",
    "var outer=1;function* f(){try{throw 2;}catch(outer){var [outer]=yield 1;return outer;}}var g=f();g.next();g.next([7]).value===7&&outer===1;",
    "function* f(){let [a=()=>b,b=7]=yield 1;return a();}var g=f();g.next();g.next([]).value===7;",
    "var read;function* f(){read=()=>x;let [x]=yield 1;}var g=f();g.next();g.return();var caught=false;try{read();}catch(e){caught=e instanceof ReferenceError;}caught;",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "pattern case " + i,
    );
}
for (const source of ["function* f(){let [x=yield 1]=[];}", "function* f(){({[yield 1]:x}={});}"]) {
    if (source === "function* f(){let [x=yield 1]=[];}") {
        const realm = new Realm((_line: string): void => {}, "script");
        check(
            prepareBoundedScript({ id: "boundary", text: source }, realm).kind === "ready",
            "declaration pattern admitted",
        );
        check(
            run(source, realm).type === "normal",
            "original declaration prepares without execution",
        );
        const result = run(
            "var iter=f();var first=iter.next();var last=iter.next(7);first.value===1&&!first.done&&last.done;",
            realm,
        );
        check(
            result.type === "normal" && result.value.kind === "boolean" && result.value.value,
            "original declaration resumes",
        );
        continue;
    }
    if (source === "function* f(){({[yield 1]:x}={});}") {
        const realm = new Realm((_line: string): void => {}, "script");
        check(
            prepareBoundedScript({ id: "boundary", text: source }, realm).kind === "ready",
            "assignment pattern admitted",
        );
        check(
            run(source, realm).type === "normal",
            "original assignment prepares without execution",
        );
        const result = run(
            'var x=3,iter=f();var first=iter.next();var last=iter.next("key");first.value===1&&!first.done&&last.done&&x===undefined;',
            realm,
        );
        check(
            result.type === "normal" && result.value.kind === "boolean" && result.value.value,
            "original assignment resumes",
        );
        continue;
    }
    check(
        prepareBoundedScript(
            { id: "boundary", text: source },
            new Realm((_line: string): void => {}, "script"),
        ).kind === "blocked",
        "pattern boundary",
    );
}
const A = new Realm((_line: string): void => {}, "script"),
    B = new Realm((_line: string): void => {}, "script");
const creator = createScriptSession();
run("function* f(){let [x]=yield 1;}var g=f();g.next();", A, creator);
define(B, "g", own(A, "g"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const failed = run("g.next(null);", B, session);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "pattern error Realm",
);
check(creator.inspect().steps === steps && session.inspect().steps > 0, "pattern current session");
const formal = run(
    "function* f([x]){yield x;}f([7]).next().value===7;",
    new Realm((_line: string): void => {}, "script"),
);
check(
    formal.type === "normal" && formal.value.kind === "boolean" && formal.value.value,
    "preserved generator formal input",
);
console.log("generator pattern passed");
