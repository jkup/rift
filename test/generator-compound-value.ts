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
const cases = [
    "var x=6;function* f(){return (x+=yield 1)}var g=f();g.next();g.next(2).value===8&&x===8",
    "var x=6;function* f(){return (x-=yield 1)}var g=f();g.next();g.next(2).value===4&&x===4",
    "var x=6;function* f(){return (x*=yield 1)}var g=f();g.next();g.next(2).value===12&&x===12",
    "var x=6;function* f(){return (x/=yield 1)}var g=f();g.next();g.next(2).value===3&&x===3",
    "var x=6;function* f(){return (x%=yield 1)}var g=f();g.next();g.next(2).value===0&&x===0",
    "var x=6;function* f(){return (x**=yield 1)}var g=f();g.next();g.next(2).value===36&&x===36",
    "var x=6;function* f(){return (x&=yield 1)}var g=f();g.next();g.next(2).value===2&&x===2",
    "var x=6;function* f(){return (x|=yield 1)}var g=f();g.next();g.next(2).value===6&&x===6",
    "var x=6;function* f(){return (x^=yield 1)}var g=f();g.next();g.next(2).value===4&&x===4",
    "var x=6;function* f(){return (x<<=yield 1)}var g=f();g.next();g.next(2).value===24&&x===24",
    "var x=6;function* f(){return (x>>=yield 1)}var g=f();g.next();g.next(2).value===1&&x===1",
    "var x=6;function* f(){return (x>>>=yield 1)}var g=f();g.next();g.next(2).value===1&&x===1",
    "var x=3;function* f(){return (x+=yield 1)}var g=f();g.next();x=100;g.next(4).value===7&&x===7",
    'var x="a";function* f(){return (x+=yield 1)}var g=f();g.next();g.next("b").value==="ab"&&x==="ab"',
    'var log="",key={toString(){log+="k";return "x"}},o={get x(){log+="g";return {valueOf(){log+="l";return 3}}},set x(v){log+="s"+v}};function* f(){return (o[key]+=yield 1)}var g=f();g.next();log==="kg"&&g.next({valueOf(){log+="r";return 4}}).value===7&&log==="kglrs7"',
    'var n=0,key={toString(){n++;return "x"}},o={x:3,y:8};function* f(){return (o[key]+=yield 1)}var g=f();g.next();key.toString=function(){n++;return "y"};g.next(4).value===7&&o.x===7&&o.y===8&&n===1',
    "var o={x:3},old=o;function* f(){return (o.x+=yield 1)}var g=f();g.next();o={x:100};g.next(4).value===7&&old.x===7&&o.x===100",
    "var left={valueOf(){return 3}},x=left;function* f(){return (x+=yield 1)}var g=f();g.next();left.valueOf=function(){return 8};g.next(2).value===10&&x===10",
    'var n=0,o={get x(){return 3},set x(v){n=v}};function* f(){return (o.x+=yield 1)}var g=f();g.next();Object.defineProperty(o,"x",{set(v){n=v+1}});g.next(3).value===6&&n===7',
    "var o={get x(){throw 7}};function* f(){try{return (o.x+=yield 1)}catch(e){return e}}f().next().value===7",
    "var n=0;function* f(){const x=3;try{return (x+=yield 1)}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next({valueOf(){n++;return 4}}).value===true&&n===1",
    'var n=0,x={valueOf(){n++;return 3}};function* f(){try{return (x+=yield 1)}catch(e){return e}}var g=f();g.next();g.throw(7).value===7&&n===0&&typeof x==="object"',
    "var n=0,x={valueOf(){n++;return 3}};function* f(){try{return (x+=yield 1)}finally{yield 2}}var g=f();g.next();g.return(7).value===2&&g.next().value===7&&n===0",
    "var x=Symbol();function* f(){try{return (x+=yield 1)}catch(e){return e instanceof TypeError}}var g=f();g.next().value===1&&g.next(2).value===true",
    "var x=1,y=2;function* f(){return (x+=(y+=yield 1))}var g=f();g.next();g.next(4).value===7&&x===7&&y===6",
    "function* f(){var i=0;for(;i<2;i+=yield 1)yield i;return i}var g=f();g.next().value===0&&g.next().value===1&&g.next(2).value===2",
    "var x=3;function* f(){return [x+=yield 1][0]}var g=f();g.next();g.next(4).value===7&&x===7",
    "var x=3;function id(x){return x}function* f(){return id(x+=yield 1)}var g=f();g.next();g.next(4).value===7&&x===7",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "compound value case " + i,
    );
}
for (const source of [
    "async function f(){var x=3;return (x+=await Promise.resolve(4))}f().then(v=>out=v)",
    "async function* f(){var x=3;yield (x+=await Promise.resolve(4))}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async compound result",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "function* f(){const x=1;return (x+=yield 1)}var g=f();g.next();var x={valueOf(){while(true){}}};function* slow(){return (x+=yield 1)}var h=slow();h.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    session = createScriptSession();
const result = run("g.next(7)", B, session);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "compound error Realm",
);
const stopped = run("h.next(7)", B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "compound coercion current budget",
);
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator compound value passed");
