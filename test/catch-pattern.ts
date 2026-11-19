import type { ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";
const cases: { id: string; text: string; expected: string }[] = [
    {
        id: "object-default",
        text: "try{throw {x:undefined,y:4};}catch({x=2,y:z}){console.log(x,z);}",
        expected: "2 4\n",
    },
    {
        id: "array-close",
        text: 'var log="";var it={[Symbol.iterator](){return this;},next(){return {value:7,done:false};},return(){log+="close";return {};}};try{throw it;}catch([x]){console.log(x,log);}',
        expected: "7 close\n",
    },
    {
        id: "abrupt-default",
        text: 'var marker={};try{try{throw {};}catch({x=(()=>{throw marker;})()}){console.log("wrong");}}catch(e){console.log(e===marker);}',
        expected: "true\n",
    },
    {
        id: "pattern-tdz",
        text: 'try{try{throw {};}catch({x=y,y=1}){console.log("wrong");}}catch(e){console.log(e.name);}',
        expected: "ReferenceError\n",
    },
    {
        id: "yield-default",
        text: 'function* g(){try{throw [];}catch([x=yield "init"]){return x;}}var i=g();console.log(i.next().value);var r=i.next(7);console.log(r.value,r.done);',
        expected: "init\n7 true\n",
    },
    {
        id: "yield-key",
        text: 'function* g(){try{throw {a:4};}catch({[yield "key"]:x}){return x;}}var i=g();console.log(i.next().value);console.log(i.next("a").value);',
        expected: "key\n4\n",
    },
    {
        id: "yield-return-close",
        text: 'var log="";var it={[Symbol.iterator](){return this;},next(){return {value:undefined,done:false};},return(){log+="close";return {};}};function* g(){try{try{throw it;}catch([x=yield "init"]){log+="body";}}finally{log+="finally";}}var i=g();console.log(i.next().value);var r=i.return(9);console.log(r.value,r.done,log);',
        expected: "init\n9 true closefinally\n",
    },
    {
        id: "yield-throw-close",
        text: 'var log="";var it={[Symbol.iterator](){return this;},next(){return {value:undefined,done:false};},return(){log+="close";return {};}};function* g(){try{try{throw it;}catch([x=yield "init"]){log+="body";}}catch(e){log+=e;}return log;}var i=g();console.log(i.next().value);console.log(i.throw("outer").value);',
        expected: "init\ncloseouter\n",
    },
    {
        id: "await-default",
        text: "async function f(){try{throw {};}catch({x=await Promise.resolve(7)}){return x;}}f().then(x=>console.log(x));",
        expected: "7\n",
    },
    {
        id: "await-reject",
        text: 'async function f(){try{try{throw {};}catch({x=await Promise.reject("outer")}){return "wrong";}}catch(e){return e;}}f().then(x=>console.log(x));',
        expected: "outer\n",
    },
    {
        id: "array",
        text: "try{throw [2,3,4];}catch([a,,b]){console.log(a,b);}",
        expected: "2 4\n",
    },
    {
        id: "nested",
        text: "try{throw {a:[1,{b:2}]};}catch({a:[x,{b:y}]}){console.log(x,y);}",
        expected: "1 2\n",
    },
    {
        id: "rest",
        text: 'try{throw {x:1,y:2,z:3};}catch({x,...r}){console.log(x,r.y,r.z,Object.keys(r).join(","));}',
        expected: "1 2 3 y,z\n",
    },
    {
        id: "array-rest",
        text: 'try{throw [1,2,3];}catch([x,...r]){console.log(x,r.join(","));}',
        expected: "1 2,3\n",
    },
    {
        id: "getter-order",
        text: 'var log="";try{throw {get x(){log+="x";return undefined;},get y(){log+="y";return 2;}};}catch({x=(log+="d",1),y}){console.log(x,y,log);}',
        expected: "1 2 xdy\n",
    },
    {
        id: "computed-once",
        text: 'var n=0;try{throw {a:4};}catch({[(n++,"a")]:x}){console.log(n,x);}',
        expected: "1 4\n",
    },
    {
        id: "null",
        text: 'try{try{throw null;}catch({x}){console.log("wrong");}}catch(e){console.log(e.name);}',
        expected: "TypeError\n",
    },
    {
        id: "closure",
        text: "var f;try{throw {x:7};}catch({x}){f=()=>x;}console.log(f());",
        expected: "7\n",
    },
    {
        id: "eval-pattern-conflict",
        text: 'try{throw {x:2};}catch({x}){try{eval("var x=3");}catch(e){console.log(e.name);}console.log(x);}',
        expected: "SyntaxError\n2\n",
    },
    {
        id: "eval-identifier-control",
        text: 'try{throw 2;}catch(x){eval("var x=3");console.log(x);}',
        expected: "3\n",
    },
    {
        id: "nested-function-veto",
        text: "var x=1;try{throw {x:2};}catch({x}){{function x(){return 3;}console.log(typeof x);}console.log(x);}console.log(x);",
        expected: "function\n2\n1\n",
    },
    {
        id: "nested-once",
        text: 'var log=[];function* g(){try{throw {get a(){log.push("get");return [undefined];}};}catch({a:[x=yield 1]}){log.push(x);}}var i=g();console.log(i.next().value);console.log(i.next(7).done,log.join(","));',
        expected: "1\ntrue get,7\n",
    },
    {
        id: "return-close-failure",
        text: 'var log=[];var source={[Symbol.iterator](){return {next(){return {value:undefined,done:false}},return(){log.push("close");throw "close-error"}}}};function* g(){try{try{throw source}catch([x=yield 1]){log.push("handler")}}catch(e){log.push(e)}finally{log.push("finally")}}var i=g();i.next();var r=i.return(9);console.log(r.done,r.value,log.join(","));',
        expected: "true undefined close,close-error,finally\n",
    },
    {
        id: "throw-close-failure",
        text: 'var log=[];var source={[Symbol.iterator](){return {next(){return {value:undefined,done:false}},return(){log.push("close");throw "close-error"}}}};function* g(){try{try{throw source}catch([x=yield 1]){log.push("handler")}}catch(e){log.push(e)}finally{log.push("finally")}}var i=g();i.next();var r=i.throw("original");console.log(r.done,r.value,log.join(","));',
        expected: "true undefined close,original,finally\n",
    },
    {
        id: "async-generator",
        text: "async function* g(){try{throw {}}catch({x=await Promise.resolve(4),y=yield x}){yield y}}var i=g();i.next().then(r=>{console.log(r.value,r.done);return i.next(7)}).then(r=>{console.log(r.value,r.done);return i.next()}).then(r=>console.log(r.done));",
        expected: "4 false\n7 false\ntrue\n",
    },
];
for (const item of cases) {
    let output = "";
    const realm = new Realm((line: string) => {
        output += line + "\n";
    }, "script");
    const prepared = prepareBoundedScript({ id: item.id, text: item.text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + item.id);
    }
    const session = createScriptSession();
    const result = evaluateScript(session, prepared.record).completion;
    if (result.type !== "normal") {
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
const invalid = [
    "try{}catch({x}){var x;}",
    '"use strict";try{}catch({x}){var x;}',
    "try{}catch({x:a,y:a}){}",
    "try{}catch([a,a]){}",
    "try{}catch({x}){let x;}",
    "try{}catch({...x,y}){}",
    "try{}catch([a]=[]){}",
    "async function f(){try{}catch({await}){}}",
];
for (const text of invalid) {
    const result = prepareBoundedScript(
        { id: "invalid", text },
        new Realm((_line: string) => {}, "script"),
    );
    if (
        result.kind === "ready" ||
        !("diagnostic" in result) ||
        result.diagnostic.name !== "SyntaxError" ||
        result.diagnostic.phase !== "parse"
    ) {
        throw new Error("invalid accepted: " + text);
    }
}

function run(source: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "catch-pattern-lifetime", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("catch pattern preparation");
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    if (state.active !== null || state.calls !== 0 || state.depth !== 0) {
        throw new Error("catch pattern cleanup");
    }
    return result;
}
const owner = new Realm((_line: string) => {}, "script");
const caller = new Realm((_line: string) => {}, "script");
const creator = createScriptSession();
const setup =
    "var make,slow,it;try{throw {secret:7};}catch({secret}){make=function(){return [secret];};slow=function(){while(true){}};it=(function*(){try{throw 1;}catch{yield [secret];while(true){}}})();}";
if (run(setup, owner, creator).type !== "normal") {
    throw new Error("catch pattern setup");
}
for (const name of ["make", "slow", "it"]) {
    const property = owner.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("catch pattern export");
    }
    caller.defineScriptGlobal(name, { value: property.value });
}
const before = creator.inspect().steps;
for (const source of ["make()", "it.next().value"]) {
    const result = run(source, caller, createScriptSession());
    if (
        result.type !== "normal" ||
        result.value.kind !== "object" ||
        result.value.object.getPrototypeOf() !== owner.arrayPrototype
    ) {
        throw new Error("catch pattern defining Realm");
    }
}
for (const source of ["slow()", "it.next()"]) {
    const result = run(source, caller, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") {
        throw new Error("catch pattern caller budget");
    }
}
if (creator.inspect().steps !== before) {
    throw new Error("catch pattern retained creator session");
}
for (const budget of [0, 10, 50, 200]) {
    const result = run(
        "try{while(true){}}catch{1;}",
        new Realm((_line: string) => {}, "script"),
        createScriptSession({ maxSteps: budget, maxCalls: 16 }),
    );
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") {
        throw new Error("catch pattern swallowed resource failure");
    }
}

for (const binding of ["{}", "[]", "{x,y:z}"]) {
    const source = "try{}catch(" + binding + "){let local=1;var outer=2;}";
    const prepared = prepareBoundedScript({ id: "catch-pattern-plan", text: source }, owner);
    if (prepared.kind !== "ready") {
        throw new Error("catch pattern plan");
    }
    const plan = prepared.record.inspect();
    const scope = plan.scopes.find((item) => item.kind === "catch");
    const names = binding === "{x,y:z}" ? "x,z" : "";
    if (
        scope === undefined ||
        scope.catchParameter !== null ||
        scope.catchBindings === undefined ||
        scope.catchBindings.map((site) => site.name).join(",") !== names
    ) {
        throw new Error("catch pattern bound sites");
    }
    const copy = prepared.record.inspect().scopes.find((item) => item.kind === "catch");
    if (copy === undefined || copy.catchBindings === scope.catchBindings) {
        throw new Error("catch pattern metadata identity");
    }
    for (let i = 0; i < scope.catchBindings.length; i++) {
        const site = scope.catchBindings[i],
            detached = copy.catchBindings?.[i];
        if (detached === undefined || detached === site || detached.loc === site.loc) {
            throw new Error("catch pattern detached site");
        }
    }
}
const suspendedOwner = new Realm((_line: string) => {}, "script");
const suspendedCaller = new Realm((_line: string) => {}, "script");
const suspendedCreator = createScriptSession();
const suspendedSource =
    "var iter=(function*(){try{throw {}}catch({x=yield 1}){yield [x];while(true){}}})();";
if (run(suspendedSource, suspendedOwner, suspendedCreator).type !== "normal") {
    throw new Error("suspended setup");
}
const exported = suspendedOwner.globalObject.getOwnProperty("iter");
if (exported === undefined || exported.kind !== "data") {
    throw new Error("suspended export");
}
suspendedCaller.defineScriptGlobal("iter", { value: exported.value });
const creatorSteps = suspendedCreator.inspect().steps;
if (run("iter.next().value", suspendedCaller, createScriptSession()).type !== "normal") {
    throw new Error("suspended first step");
}
const resumed = run("iter.next(7).value", suspendedCaller, createScriptSession());
if (
    resumed.type !== "normal" ||
    resumed.value.kind !== "object" ||
    resumed.value.object.getPrototypeOf() !== suspendedOwner.arrayPrototype
) {
    throw new Error("suspended defining Realm");
}
const limited = run(
    "iter.next()",
    suspendedCaller,
    createScriptSession({ maxSteps: 100, maxCalls: 16 }),
);
if (
    limited.type !== "throw" ||
    limited.origin.kind !== "resource-limit" ||
    suspendedCreator.inspect().steps !== creatorSteps
) {
    throw new Error("suspended caller budget");
}
for (const maxSteps of [0, 10, 30, 60, 120]) {
    const realm = new Realm((_line: string) => {}, "script");
    const setup =
        "var reached=false;var iter=(function*(){try{throw {}}catch({x=yield 1,y=(function(){while(true){}})()}){reached=true;}})();iter.next();";
    if (run(setup, realm, createScriptSession()).type !== "normal") {
        throw new Error("budget prefix setup");
    }
    const result = run("iter.next(7)", realm, createScriptSession({ maxSteps, maxCalls: 16 }));
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") {
        throw new Error("pattern initializer resource failure");
    }
    const reached = realm.globalObject.getOwnProperty("reached");
    if (
        reached === undefined ||
        reached.kind !== "data" ||
        reached.value.kind !== "boolean" ||
        reached.value.value
    ) {
        throw new Error("handler entered after resource failure");
    }
}
console.log("catch pattern controls passed");
