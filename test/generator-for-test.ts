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

const cases: string[] = [
    "function* f(){for(var i=0;yield i;i++){}return i}var g=f();g.next().value===0&&g.next(true).value===1&&g.next(false).value===1",
    "function* f(){for(let i=0;yield i;i++){}return 7}var g=f();g.next().value===0&&g.next(true).value===1&&g.next(false).value===7",
    "function* f(){for(const i=7;yield i;){break}return 8}var g=f();g.next().value===7&&g.next(true).value===8",
    'var a=[];function* f(){for(let i=0;yield i;i++){a.push(()=>i)}return a[0]()+":"+a[1]()}var g=f();g.next();g.next(true);g.next(true);g.next(false).value==="0:1"',
    'var log="";function* f(){for(let i=0;(log+="t",yield i);(log+="u",i++)){log+="b"}return log}var g=f();g.next();var before=log;g.next(true);var middle=log;g.next(false).value==="tbut"&&before==="t"&&middle==="tbut"',
    'var log="";function* f(){for(var i=0;yield i;(log+="u",i++)){log+="b";continue}return log}var g=f();g.next();g.next(true);g.next(false).value==="bu"',
    "var n=0;function* f(){for(var i=0;yield i;n++){break}return n}var g=f();g.next();g.next(true).value===0",
    "var n=0;function* f(){outer:for(var i=0;i<2;i++){for(;yield i;){n++;continue outer}}return n}var g=f();g.next().value===0&&g.next(true).value===1&&g.next(true).value===2",
    "var n=0;function* f(){try{for(;yield 1;n++){n+=10}}finally{yield n}}var g=f();g.next();g.return(7).value===0&&g.next().value===7&&n===0",
    "var marker={};function* f(){try{for(;yield 1;){}}catch(e){return e}}var g=f();g.next();g.throw(marker).value===marker",
    "function* f(){for(var i=0;(yield 1)&&(yield 2);i++){}return i}var g=f();g.next();g.next(true).value===2&&g.next(false).value===0",
    "function yes(x){return x}function* f(){for(var i=0;yes(yield 1);i++){}return i}var g=f();g.next();g.next(false).value===0",
    "function* f(){for(var i=0;(yield 1).x;i++){}return i}var g=f();g.next();g.next({x:false}).value===0",
    "function* f(){for(var i=0;yield i;i++){yield i+10}return i}var g=f();g.next();g.next(true).value===10&&g.next().value===1&&g.next(false).value===1",
    "var a=[];function* f(){for(let i=0;(a.push(()=>i),yield i);i++){i=3}}var g=f();g.next();g.next(true);g.next(false);a[0]()===3&&a[1]()===4",
    "var i=9;function* f(){for(let i=0;yield i;i++){}return i}var g=f();g.next();g.next(false).value===9",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "for test case " + i,
    );
}
for (const source of [
    "async function f(){for(let i=0;await Promise.resolve(i<2);i++)out+=i}f()",
    "async function* f(){for(let i=0;await Promise.resolve(i<2);i++)yield i}var g=f();g.next().then(r=>out+=r.value);g.next().then(r=>out+=r.value)",
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    check(run('var out="";' + source, realm, session).type === "normal", "async setup");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "async jobs");
    const result = run('out==="01"', realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "async for test result",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const result = run(
        "function* f(){for(let i=yield 1;;){}}var g=f();g.next().value===1&&g.return(7).value===7",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "original lexical initializer boundary",
    );
}
{
    const source = "function* f(){for(;;yield 1){}}",
        realm = new Realm((_line: string) => {}, "script");
    check(
        prepareBoundedScript({ id: "historical-for-update", text: source }, realm).kind === "ready",
        "historical update admitted",
    );
    const result = run(
        source + "var g=f();g.next().value===1&&g.next().value===1&&g.return(7).done",
        realm,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "historical update resumes",
    );
}
console.log("generator for test passed");
