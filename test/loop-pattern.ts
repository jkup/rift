import type { ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";

const cases: { id: string; text: string; expected: string }[] = [
    {
        id: "foreach-default-yield",
        text: 'function* g(){for(const [x=yield "init"] of [[]])return x;}var i=g();console.log(i.next().value);console.log(i.next(7).value);\n',
        expected: "init\n7\n",
    },
    {
        id: "loop-nested-close",
        text: 'var log=[];function it(name,value){return {[Symbol.iterator](){return {next(){return {value:value,done:false}},return(){log.push(name);return {}}}}}}function* g(){try{for(let [x=yield 1] of it("outer",it("inner",undefined))){log.push("body")}}finally{log.push("finally")}}var i=g();i.next();var r=i.return(9);console.log(r.value,r.done,log.join(","));',
        expected: "9 true inner,outer,finally\n",
    },
    {
        id: "per-iteration",
        text: 'function* g(){var out=[];for(let [x=yield "init"] of [[],[]])out.push(()=>x);return out.map(f=>f()).join(",")}var i=g();console.log(i.next().value);console.log(i.next(3).value);console.log(i.next(4).value);',
        expected: "init\ninit\n3,4\n",
    },
    {
        id: "var-iteration",
        text: 'function* g(){var out=[];for(var [x=yield "init"] of [[],[]])out.push(()=>x);return out.map(f=>f()).join(",")}var i=g();console.log(i.next().value);console.log(i.next(3).value);console.log(i.next(4).value);',
        expected: "init\ninit\n4,4\n",
    },
    {
        id: "for-in-default",
        text: 'function* g(){var out=[];for(let [x=yield "empty"] in {"":1,a:2})out.push(()=>x);return out.map(f=>f()).join(",")}var i=g();console.log(i.next().value);console.log(i.next("z").value);',
        expected: "empty\nz,a\n",
    },
    {
        id: "assignment-target",
        text: 'var first={},target=first;function* g(){for([target[yield "key"]] of [[7]]){return first.x}}var i=g();console.log(i.next().value);target={};console.log(i.next("x").value,target.x);',
        expected: "key\n7 undefined\n",
    },
    {
        id: "await-reject-close",
        text: 'var log=[];var inner={[Symbol.iterator](){return {next(){return {done:false}},return(){log.push("inner");return {}}}}};var outer={[Symbol.asyncIterator](){return {next(){return Promise.resolve({value:inner,done:false})},return(){log.push("outer");return Promise.resolve({done:true})}}}};async function f(){try{for await(let [x=await Promise.reject("bad")] of outer){log.push("body")}}catch(e){log.push(e)}}f().then(()=>console.log(log.join(",")));',
        expected: "inner,outer,bad\n",
    },
    {
        id: "close-precedence",
        text: 'var log=[];function it(name,value){return {[Symbol.iterator](){return {next(){return {value:value,done:false}},return(){log.push(name);throw name}}}}}function* g(){try{for(let [x=yield 1] of it("outer",it("inner",undefined))){log.push("body")}}finally{log.push("finally")}}var i=g();i.next();try{i.return(9)}catch(e){console.log(e,log.join(","))}',
        expected: "inner inner,outer,finally\n",
    },
    {
        id: "async-generator-return",
        text: 'var log=[];var inner={[Symbol.iterator](){return {next(){return {done:false}},return(){log.push("inner");return {}}}}};var outer={[Symbol.asyncIterator](){return {next(){return Promise.resolve({value:inner,done:false})},return(){log.push("outer");return Promise.resolve({done:true})}}}};async function* g(){for await(let [x=yield "init"] of outer){log.push("body")}}var i=g();i.next().then(r=>{console.log(r.value);return i.return(9)}).then(r=>console.log(r.value,r.done,log.join(",")));',
        expected: "init\n9 true inner,outer\n",
    },
    {
        id: "tdz",
        text: 'function* g(){try{for(let [x=(yield "init",y),y=3] of [[]]){console.log("body")}}catch(e){console.log(e instanceof ReferenceError)}}var i=g();console.log(i.next().value);console.log(i.next().done);',
        expected: "init\ntrue\ntrue\n",
    },
    {
        id: "const-binding",
        text: 'function* g(){for(const [x=yield "init"] of [[]]){try{x=9}catch(e){console.log(e instanceof TypeError)}return x}}var i=g();console.log(i.next().value);console.log(i.next(7).value);',
        expected: "init\ntrue\n7\n",
    },
    {
        id: "labelled-continue-break",
        text: 'var log=[];function* source(){try{yield [];yield [];yield []}finally{log.push("close")}}function* g(){outer:for(let [x=yield "init"] of source()){log.push(x);if(x===1)continue outer;break outer}return log.join(",")}var i=g();console.log(i.next().value);console.log(i.next(1).value);console.log(i.next(2).value);',
        expected: "init\ninit\n1,2,close\n",
    },
    {
        id: "computed-key-order",
        text: 'var log=[];var o={get x(){log.push("get");return undefined}};function* g(){for(let {[yield "key"]:x=yield "default"} of [o]){log.push(x)}return log.join(",")}var i=g();console.log(i.next().value);console.log(i.next("x").value,log.join(","));console.log(i.next(7).value);',
        expected: "key\ndefault get\nget,7\n",
    },
    {
        id: "async-for-in",
        text: 'async function f(){var out=[];for(let {[await Promise.resolve("length")]:x} in {abc:1,q:2})out.push(x);return out.join(",")}f().then(console.log);',
        expected: "3,1\n",
    },
    {
        id: "injected-throw",
        text: 'var log=[];function it(name,value){return {[Symbol.iterator](){return {next(){return {value,done:false}},return(){log.push(name);throw name}}}}}function* g(){for(let [x=yield "init"] of it("outer",it("inner",undefined)))log.push("body")}var i=g();console.log(i.next().value);try{i.throw("original")}catch(e){console.log(e,log.join(","))}',
        expected: "init\noriginal inner,outer\n",
    },
    {
        id: "async-break-close-reject",
        text: 'var log=[];var source={[Symbol.asyncIterator](){return {next(){return Promise.resolve({value:[],done:false})},return(){log.push("close");return Promise.reject("rejected")}}}};async function f(){try{for await(let [x=await Promise.resolve(7)] of source){log.push(x);break}}catch(e){log.push(e)}console.log(log.join(","))}f();',
        expected: "7,close,rejected\n",
    },
];
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "loop-pattern", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("loop pattern preparation");
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    if (state.active !== null || state.calls !== 0 || state.depth !== 0) {
        throw new Error("loop pattern cleanup");
    }
    return result;
}
for (const item of cases) {
    let output = "";
    const realm = new Realm((line: string) => {
        output += line + "\n";
    }, "script");
    const session = createScriptSession();
    if (run(item.text, realm, session).type !== "normal") {
        throw new Error("execute " + item.id);
    }
    const jobs = drainScriptJobs(session);
    if (jobs.fatal || jobs.failures.length !== 0) {
        throw new Error("jobs " + item.id);
    }
    if (output !== item.expected) {
        throw new Error("output " + item.id + ": " + output);
    }
}
for (const text of ["function* g(x=yield 1){}", "async function f(x=await 1){}"]) {
    const prepared = prepareBoundedScript(
        { id: "pattern-boundary", text },
        new Realm((_line: string) => {}, "script"),
    );
    if (prepared.kind === "ready") {
        throw new Error("parameter boundary admitted");
    }
}
const owner = new Realm((_line: string) => {}, "script");
const caller = new Realm((_line: string) => {}, "script");
const creator = createScriptSession();
if (
    run(
        "var iter=(function*(){for(const {x=yield 1,...rest} of [{a:4}]){yield [rest];while(true){}}})();",
        owner,
        creator,
    ).type !== "normal"
) {
    throw new Error("loop lifetime setup");
}
const exported = owner.globalObject.getOwnProperty("iter");
if (exported === undefined || exported.kind !== "data") {
    throw new Error("loop export");
}
caller.defineScriptGlobal("iter", { value: exported.value });
const before = creator.inspect().steps;
if (run("iter.next()", caller, createScriptSession()).type !== "normal") {
    throw new Error("loop first step");
}
const resumed = run('iter.next("rest").value', caller, createScriptSession());
if (
    resumed.type !== "normal" ||
    resumed.value.kind !== "object" ||
    resumed.value.object.getPrototypeOf() !== owner.arrayPrototype
) {
    throw new Error("loop defining Realm");
}
const rest = resumed.value.object.getOwnProperty("0");
if (
    rest === undefined ||
    rest.kind !== "data" ||
    rest.value.kind !== "object" ||
    rest.value.object.getPrototypeOf() !== owner.objectPrototype
) {
    throw new Error("loop rest Realm");
}
const limited = run("iter.next()", caller, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
if (
    limited.type !== "throw" ||
    limited.origin.kind !== "resource-limit" ||
    creator.inspect().steps !== before
) {
    throw new Error("loop current caller budget");
}
for (const maxSteps of [0, 10, 30, 60, 120]) {
    const realm = new Realm((_line: string) => {}, "script");
    if (
        run(
            "var reached=false;var iter=(function*(){for(let [x=yield 1,y=(function(){while(true){}})()] of [[]]){reached=true}})();iter.next();",
            realm,
            createScriptSession(),
        ).type !== "normal"
    ) {
        throw new Error("loop budget setup");
    }
    const result = run("iter.next(7)", realm, createScriptSession({ maxSteps, maxCalls: 16 }));
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") {
        throw new Error("loop initialization budget");
    }
    const reached = realm.globalObject.getOwnProperty("reached");
    if (
        reached === undefined ||
        reached.kind !== "data" ||
        reached.value.kind !== "boolean" ||
        reached.value.value
    ) {
        throw new Error("continued after loop resource failure");
    }
    const fresh = run("3", realm, createScriptSession());
    if (fresh.type !== "normal" || fresh.value.kind !== "number" || fresh.value.value !== 3) {
        throw new Error("loop resource recovery");
    }
}
console.log("loop pattern controls passed");
