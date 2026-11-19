import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
    type ScriptSession,
} from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "promise-helpers", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(session, prepared.record).completion;
}
function string(text: string, expected: string, realm: Realm, session: ScriptSession): void {
    const result = run(text, realm, session);
    check(
        result.type === "normal" &&
            result.value.kind === "string" &&
            result.value.value === expected,
        text + " expected " + expected,
    );
}
const cases: { source: string; before: string; after: string }[] = [
    {
        source: 'async function f(){for await(const x of [Promise.resolve(1),2])out+=x;}f();out+="s"',
        before: "s",
        after: "s12",
    },
    {
        source: 'async function f(){for await(const x of [])out+="bad";out+="e";}f();out+="s"',
        before: "s",
        after: "se",
    },
    {
        source: 'async function f(){var fs=[];for await(let x of [1,2])fs.push(()=>x);out+=fs[0]()+":"+fs[1]();}f();',
        before: "",
        after: "1:2",
    },
    {
        source: "async function f(){for await(const [a,b] of [[1,2],[3,4]])out+=a+b;}f();",
        before: "",
        after: "37",
    },
    {
        source: "async function f(){var a,b;for await([a,b] of [[1,2]])out+=a+b;}f();",
        before: "",
        after: "3",
    },
    {
        source: "async function f(){var o={};for await(o.x of [1,2])out+=o.x;out+=o.x;}f();",
        before: "",
        after: "122",
    },
    {
        source: "async function f(){for await(var x of [1,2]){if(x===1)continue;out+=x;}out+=x;}f();",
        before: "",
        after: "22",
    },
    {
        source: 'var i=0;var o={[Symbol.asyncIterator](){out+="a";return this},next(){out+="n";return Promise.resolve({done:i===2,value:++i})},get [Symbol.iterator](){throw 9}};async function f(){for await(let x of o)out+=x;out+="e";}f();out+="s"',
        before: "ans",
        after: "ans1n2ne",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {done:false,value:Promise.resolve(7)}},return(){return {}}};async function f(){for await(let x of o){out+=x instanceof Promise;break;}}f();",
        before: "",
        after: "true",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){throw 7},return(){out+="bad"}};async function f(){try{for await(let x of o){}}catch(e){out+=e}}f();out+="s"',
        before: "7s",
        after: "7s",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return Promise.reject(7)},return(){out+="bad"}};async function f(){try{for await(let x of o){}}catch(e){out+=e}}f();out+="s"',
        before: "s",
        after: "s7",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return 7},return(){out+="bad"}};async function f(){try{for await(let x of o){}}catch(e){out+=e instanceof TypeError}}f();',
        before: "",
        after: "true",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {get done(){throw 7}}},return(){out+="bad"}};async function f(){try{for await(let x of o){}}catch(e){out+=e}}f();',
        before: "",
        after: "7",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {get value(){throw 7}}},return(){out+="bad"}};async function f(){try{for await(let x of o){}}catch(e){out+=e}}f();',
        before: "",
        after: "7",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {done:false,value:7}},return(){out+="c";return {then(r){out+="a";r({});}}}};async function f(){for await(let x of o){out+=x;break;}out+="e";}f();out+="s"',
        before: "s",
        after: "s7cae",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},return(){out+="c";return Promise.reject(8)}};async function f(){try{for await(let x of o){throw x}}catch(e){out+=e}}f();',
        before: "",
        after: "c7",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},return(){out+="c";return Promise.reject(8)}};async function f(){try{for await(let x of o){break}}catch(e){out+=e}}f();',
        before: "",
        after: "c8",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},return(){return 8}};async function f(){try{for await(let x of o){return x}}catch(e){out+=e instanceof TypeError}}f();",
        before: "",
        after: "true",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},get return(){throw 8}};async function f(){try{for await(let x of o){throw x}}catch(e){out+=e}}f();",
        before: "",
        after: "7",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},return:3};async function f(){try{for await(let x of o){break}}catch(e){out+=e instanceof TypeError}}f();",
        before: "",
        after: "true",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {value:7}}};async function f(){for await(let x of o){return x}}f().then(v=>out+=v);",
        before: "",
        after: "7",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {value:null}},return(){out+="c";return {}}};async function f(){try{for await(let {x} of o){}}catch(e){out+=e instanceof TypeError}}f();',
        before: "",
        after: "ctrue",
    },
    {
        source: 'var i=0;var o={[Symbol.asyncIterator](){return this},next(){return {value:++i,done:i>2}},return(){out+="bad";return {}}};async function f(){outer:for await(let x of o){continue outer;}out+="e"}f();',
        before: "",
        after: "e",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},return(){out+="c";return {}}};async function f(){outer:while(true){for await(let x of o){break outer;}}out+="e"}f();',
        before: "",
        after: "ce",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},return(){out+="c";return {}}};async function f(){outer:for(let i=0;i<2;i++){for await(let x of o){continue outer;}}out+="e"}f();',
        before: "",
        after: "cce",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},return(){out+="c";return {}}};async function f(){try{for await(let x of o){try{return x}finally{out+="f";await 1;out+="g"}}}finally{out+="h"}}f().then(v=>out+=v);',
        before: "",
        after: "fgch7",
    },
    {
        source: "async function f(){for await(const x of [1,2]){await 0;out+=x}}f();",
        before: "",
        after: "12",
    },
    {
        source: "var x=[1];async function f(){try{for await(let x of x){}}catch(e){out+=e instanceof ReferenceError}}f();",
        before: "true",
        after: "true",
    },
    {
        source: 'var i=0;var o={[Symbol.asyncIterator](){return this},get next(){out+="g";return function(){out+="n";o.next=()=>{throw 9};return {value:++i,done:i>1}}}};async function f(){for await(let x of o)out+=x}f();',
        before: "gn",
        after: "gn1n",
    },
    {
        source: 'function* g(){try{yield Promise.reject(7)}finally{out+="c"}}async function f(){try{for await(const x of g()){}}catch(e){out+=e}}f();',
        before: "",
        after: "c7",
    },
];
cases.push({
    source: 'var p=Promise.resolve([7]);async function f(){for await(let x of await p){}}f().then(()=>out="done")',
    before: "",
    after: "done",
});
for (const test of cases) {
    const realm = fresh(),
        session = createScriptSession();
    check(
        run("var out='';" + test.source, realm, session).type === "normal",
        "setup " + test.source,
    );
    string("out", test.before, realm, session);
    const drained = drainScriptJobs(session);
    check(!drained.fatal && drained.failures.length === 0, "jobs " + test.source);
    string("out", test.after, realm, session);
}
for (const text of [
    "for await(let x of []){}",
    "function f(){for await(let x of []){}}",
    "async function f(){for await(let x in []){}}",
    "async function f(){for await(;;){}}",
    "async function f(){for await(var x=1 of []){}}",
]) {
    check(
        prepareBoundedScript({ id: "boundary", text }, fresh()).kind === "blocked",
        "for-await boundary " + text,
    );
}
{
    const owner = fresh(),
        caller = fresh(),
        creator = createScriptSession();
    check(
        run(
            'var out="",c=Promise.withResolvers();var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},return(){out+="c";return c.promise}};async function f(){try{for await(let x of o){throw x}}catch(e){out+=e}}var p=f();',
            owner,
            creator,
        ).type === "normal",
        "pending cleanup setup",
    );
    check(!drainScriptJobs(creator).fatal, "suspend at cleanup");
    string("out", "c", owner, creator);
    for (const name of ["c", "p"]) {
        const property = owner.globalObject.getOwnProperty(name);
        if (property === undefined || property.kind !== "data") {
            throw new Error(name);
        }
        caller.defineScriptGlobal(name, { value: property.value });
    }
    const session = createScriptSession();
    check(
        run('var out="";p.then(()=>out+="done");c.reject(8);', caller, session).type === "normal",
        "resolve foreign cleanup",
    );
    const steps = creator.inspect().steps,
        drained = drainScriptJobs(session);
    check(
        !drained.fatal && drained.failures.length === 0 && creator.inspect().steps === steps,
        "cleanup uses current session",
    );
    string("out", "c7", owner, creator);
    string("out", "done", caller, session);
}
{
    const realm = fresh(),
        session = createScriptSession({ maxSteps: 250, maxCalls: 32 });
    check(
        run(
            'var out="";var o={[Symbol.asyncIterator](){return this},next(){return {value:7}},return(){return {then(){while(true){}}}}};async function f(){try{for await(let x of o){break}}catch(e){out+="bad"}finally{out+="bad"}}f();',
            realm,
            session,
        ).type === "normal",
        "cleanup budget setup",
    );
    const drained = drainScriptJobs(session);
    check(
        drained.fatal &&
            drained.failures.length === 1 &&
            drained.failures[0].completion.origin.kind === "resource-limit",
        "async close fatal budget",
    );
    string("out", "", realm, createScriptSession());
}
console.log("for await passed");
