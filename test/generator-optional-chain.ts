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
    "function* f(){return (yield 1)?.x}var g=f();g.next();g.next({x:7}).value===7",
    "function* f(){return (yield 1)?.[yield 2]}var g=f();g.next();var a=g.next(null);a.done&&a.value===undefined",
    'function* f(){return (yield 1)?.[yield 2]}var g=f();g.next();g.next({x:7}).value===2&&g.next("x").value===7',
    "function* f(){return null?.[yield 1]}var a=f().next();a.done&&a.value===undefined",
    "function* f(){return null?.(yield 1)}var a=f().next();a.done&&a.value===undefined",
    "var o={x:7,m(a){return this.x+a}};function* f(){return o?.m(yield 1)}var g=f();g.next();g.next(3).value===10",
    'var o={x:7,m(a){return this.x+a}};function* f(){return o?.[yield 1]?.(yield 2)}var g=f();g.next();g.next("m").value===2&&g.next(3).value===10',
    'var o={x:7,m(a){return this.x+a}};function* f(){return (o?.[yield 1])(yield 2)}var g=f();g.next();g.next("m").value===2&&g.next(3).value===10',
    'var o={x:7,m(a){return this.x+a}};function* f(){return (o?.[yield 1])?.(yield 2)}var g=f();g.next();g.next("m").value===2&&g.next(3).value===10',
    'var o={x:7,m(a){return this.x+a}};function* f(){return (yield 1)[yield 2]?.(yield 3)}var g=f();g.next();g.next(o);g.next("m");g.next(3).value===10',
    'var o={x:7,m(a){return this.x+a}};function* f(){return ((yield 1)?.[yield 2])?.(yield 3)}var g=f();g.next();g.next(o);g.next("m");g.next(3).value===10',
    "var n=0;function* f(){return null?.[yield 1].x(n++)}var a=f().next();a.done&&a.value===undefined&&n===0",
    "var n=0;function* f(){return (null?.[yield 1])?.[n++]}var a=f().next();a.done&&a.value===undefined&&n===0",
    'var o={x:7};function* f(){return delete o?.[yield 1]}var g=f();g.next();g.next("x").value===true&&!Object.hasOwn(o,"x")',
    'var n=0,o={get x(){n++;throw 8}};function* f(){return delete o?.[yield 1]}var g=f();g.next();g.next("x").value===true&&n===0',
    "function* f(){return delete null?.[yield 1]}var a=f().next();a.done&&a.value===true",
    'var o={x:7};Object.defineProperty(o,"x",{configurable:false});function* f(){"use strict";try{return delete o?.[yield 1]}catch(e){return e instanceof TypeError}}var g=f();g.next();g.next("x").value===true&&o.x===7',
    'var o={__proto__:{m(a){return this.x+a}},x:7,*g(){return super[yield 1]?.(yield 2)}};var g=o.g();g.next();g.next("m");g.next(3).value===10',
    'var x=7;function* f(){var x=9;return eval?.(yield 1)}var g=f();g.next();g.next("x").value===7',
    'var o={C:function(x){this.x=x}};function* f(){return new (o?.[yield 1])(yield 2)}var g=f();g.next();g.next("C");g.next(7).value.x===7',
    "var o={m(a,b,c){return a+b+c}};function* f(){return o?.m(...yield 1,yield 2)}var g=f();g.next();g.next([1,2]);g.next(4).value===7",
    'var log="",key={toString(){log+="k";return "m"}},o={get m(){log+="g";return function(x){log+="c";return x}}};function* f(){return o?.[yield 1](yield 2)}var g=f();g.next();g.next(key);log==="kg"&&g.next(7).value===7&&log==="kgc"',
    "var o={m:3};function* f(){try{return o?.m(yield 1)}catch(e){return e instanceof TypeError}}var g=f();g.next().value===1&&g.next(7).value===true",
    "var o={get m(){throw 8}};function* f(){try{return o?.m(yield 1)}catch(e){return e}}var a=f().next();a.done&&a.value===8",
    'var o={x:null};function* f(){try{return o?.x[yield 1]}catch(e){return e instanceof TypeError}}var g=f();g.next().value===1&&g.next("x").value===true',
    "var n=0,o={m(){n++}};function* f(){try{return o?.m(yield 1)}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8&&n===0",
    "var o={x:7};function* f(){try{return o?.[yield 1]}catch(e){return e}}var g=f();g.next();g.throw(8).value===8",
    "var s=Symbol(),o={[s]:7};function* f(){return o?.[yield 1]}var g=f();g.next();g.next(s).value===7",
    'var o={x:7};function* keys(){yield 1;return "x"}function* f(){return o?.[yield* keys()]}var g=f();g.next();g.next().value===7',
    'String.prototype.f=function(x){"use strict";return typeof this+this+x};function* f(){return "abc"?.[yield 1]?.(yield 2)}var g=f();g.next();g.next("f");g.next(7).value==="stringabc7"',
    "var o={x:7,m(a){return this.x+a}},old=o;function* f(){return o?.m(yield 1)}var g=f();g.next();o={x:99};old.m=function(){return 99};g.next(3).value===10",
    'var o={m(){return {x:7}}};function* f(){return o?.[yield 1]()?.[yield 2]}var g=f();g.next();g.next("m");g.next("x").value===7',
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "optional chain case " + i,
    );
}
for (const source of [
    'var o={x:7};async function f(){return o?.[await "x"]}f().then(v=>out=v)',
    'var o={x:3,m(a){return this.x+a}};async function f(){return (o?.[await "m"])?.(await 4)}f().then(v=>out=v)',
    'var o={x:7};async function* f(){yield (await o)?.[await "x"]}f().next().then(r=>out=r.value)',
    "async function f(){return null?.[await Promise.reject(8)]??7}f().then(v=>out=v)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async optional chain",
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "var o={m:3},p={get x(){while(true){}}};function* f(){return o?.m(yield 1)}function* h(){return p?.[yield 1]}var g=f(),slow=h();g.next();slow.next();",
    A,
    creator,
);
define(B, "g", own(A, "g"));
define(B, "slow", own(A, "slow"));
const steps = creator.inspect().steps,
    result = run("g.next(7)", B);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "chain error Realm",
);
const stopped = run('slow.next("x")', B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "chain current budget");
check(creator.inspect().steps === steps, "creator session untouched");
console.log("generator optional chain passed");
