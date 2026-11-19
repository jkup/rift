import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
    type ScriptSession,
} from "../src/script-execution.js";
import { type ValueCompletion } from "../src/runtime.js";
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

const cases = [
    "true ?? 1;",
    "(null??7)===7&&(undefined??8)===8",
    '(0??7)===0&&(false??7)===false&&(""??7)===""',
    "Object.is(-0??7,-0)&&Number.isNaN(NaN??7)",
    "var o={},s=Symbol();(o??7)===o&&(s??7)===s",
    "var n=0;function rhs(){n++;return 7}(0??rhs())===0&&n===0",
    'var log="",o={get x(){log+="g";return null}};function rhs(){log+="r";return 7}(o.x??rhs())===7&&log==="gr"',
    "var n=0,o={valueOf(){n++;throw 8},toString(){n++;throw 9}};(o??7)===o&&n===0",
    "var n=0;function bad(){throw 8}function rhs(){n++;return 7}var caught=false;try{bad()??rhs()}catch(e){caught=e===8}caught&&n===0",
    "var caught=false;try{null??missing}catch(e){caught=e instanceof ReferenceError}caught",
    "(null??undefined??7)===7&&(3??null??7)===3",
    "(null??2+3*4)===14&&(null??false?1:2)===2",
    "(0??(false||7))===0&&((null??false)||7)===7",
    "((false&&null)??7)===false&&(null??(true&&7))===7",
    "var o=null;(o?.x??7)===7",
    "var x=0;function* f(){return (yield 1)??(x++,yield 2)}var g=f();g.next().value===1&&g.next(0).value===0&&x===0",
    "function* f(){return (yield 1)??(yield 2)}var g=f();g.next().value===1&&g.next(null).value===2&&g.next(7).value===7",
    "function* f(){return 0??(yield 1)}var r=f().next();r.done&&r.value===0",
    "function* f(){return null??(yield 1)}var g=f();g.next().value===1&&g.next(7).value===7",
    "function* f(){try{return null??(yield 1)}finally{yield 2}}var g=f();g.next();g.return(8).value===2&&g.next().value===8",
    "function* f(){try{return null??(yield 1)}catch(e){return e}}var g=f();g.next();g.throw(8).value===8",
    "var f=()=>null??7;f()===7",
    "var x=0,y=x??7;y===0",
    "var out=0;for(var x=null??7;out<1;out++){out=x;break}out===7",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "nullish case " + i,
    );
}
for (const source of [
    "null??false||true",
    "true||null??7",
    "null??true&&7",
    "true&&null??7",
    "null??false||true??7",
    "true||null??false&&7",
    "function* f(){return (yield 1)??false||true}",
    "async function f(){return await 1??false&&7}",
    "null??",
    "??7",
]) {
    const realm = new Realm((_line: string) => {}, "script");
    check(
        prepareBoundedScript({ id: "grammar", text: "globalThis.effect=1;" + source }, realm)
            .kind === "blocked",
        "logical mixing rejected " + source,
    );
    check(realm.globalObject.getOwnProperty("effect") === undefined, "no effects during parse");
}
for (const source of [
    "async function f(){return (await null)??(await 7)}f().then(v=>out=v)",
    "async function f(){return 7??await Promise.reject(8)}f().then(v=>out=v)",
    "async function* f(){yield (await undefined)??(await 7)}f().next().then(r=>out=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run("var out=0;" + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run("out===7", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async nullish",
    );
}
console.log("nullish coalescing passed");
