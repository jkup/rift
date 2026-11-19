import type { ValueCompletion } from "../src/runtime.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
    type ScriptSession,
} from "../src/script-execution.js";
const cases: { id: string; text: string; expected: string }[] = [
    {
        id: "lexical-order",
        text: "let a=1,b=a+1; const c=b+1,d=c+1; console.log(a,b,c,d);",
        expected: "1 2 3 4\n",
    },
    {
        id: "default-let",
        text: "let a,b=2;console.log(a===undefined,b);",
        expected: "true 2\n",
    },
    {
        id: "patterns",
        text: "let [a]=[1],{b}={b:a+1},c=b+1;console.log(a,b,c);",
        expected: "1 2 3\n",
    },
    {
        id: "later-pattern",
        text: "const a=1,[b=a+1]=[],{c=b+1}={};console.log(a,b,c);",
        expected: "1 2 3\n",
    },
    {
        id: "mixed-var",
        text: "function f(){console.log(a,b);var [a]=[1],b=a+1;console.log(a,b);}f();",
        expected: "undefined undefined\n1 2\n",
    },
    {
        id: "tdz",
        text: "try{let a=b,b=1;}catch(e){console.log(e.name);}try{const [a]=[b],b=2;}catch(e){console.log(e.name);}",
        expected: "ReferenceError\nReferenceError\n",
    },
    {
        id: "closure",
        text: "let f=()=>b,b=3;console.log(f());",
        expected: "3\n",
    },
    {
        id: "no-block",
        text: "{let a=1,b=2;console.log(a+b);}console.log(typeof a,typeof b);",
        expected: "3\nundefined undefined\n",
    },
    {
        id: "abrupt",
        text: 'var log="";function fail(){throw "stop";}try{let a=(log+="a"),b=fail(),c=(log+="c");}catch(e){console.log(log,e);}',
        expected: "a stop\n",
    },
    {
        id: "names",
        text: "const a=function(){},b=()=>0,[c=function(){}]=[];console.log(a.name,b.name,c.name);",
        expected: "a b c\n",
    },
    {
        id: "empty-pattern",
        text: "let []=[],{}={},a=7;console.log(a);",
        expected: "7\n",
    },
    {
        id: "generator",
        text: "function* f(){let a=yield 1,b=yield a+1;return a+b;}var g=f();console.log(g.next().value,g.next(4).value,g.next(6).value);",
        expected: "1 5 10\n",
    },
    {
        id: "generator-pattern",
        text: "function* f(){let [a]=yield [1],{b}=yield {b:a+1};return a+b;}var g=f();console.log(JSON.stringify(g.next().value),JSON.stringify(g.next([4]).value),g.next({b:6}).value);",
        expected: '[1] {"b":5} 10\n',
    },
    {
        id: "async",
        text: "async function f(){const a=await Promise.resolve(1),[b]=await Promise.resolve([a+1]);return a+b;}f().then(v=>console.log(v));",
        expected: "3\n",
    },
    {
        id: "close",
        text: "var closed=0;var iterable={[Symbol.iterator]:function(){return {next:function(){return {value:4,done:false};},return:function(){closed++;return {};}};}};let [a]=iterable,b=closed;console.log(a,b);",
        expected: "4 1\n",
    },
    {
        id: "computed-order",
        text: 'var log="";function key(){log+="k";return "x";}let {[key()]:a}={x:2},b=(log+="b");console.log(a,log);',
        expected: "2 kb\n",
    },
    {
        id: "const-write",
        text: "try{const a=1,b=2;b=3;}catch(e){console.log(e.name);}",
        expected: "TypeError\n",
    },
    {
        id: "eval-scope",
        text: 'function f(){let a=1,b=2;return eval("a+b");}console.log(f());',
        expected: "3\n",
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
    const state = session.inspect();
    if (state.active !== null || state.calls !== 0 || state.depth !== 0) {
        throw new Error("session " + item.id);
    }
}

const negative: { text: string; kind: string }[] = [
    {
        text: "let a=1,a=2;",
        kind: "conflict",
    },
    {
        text: "const [a]=[1],{a}={a:2};",
        kind: "conflict",
    },
    {
        text: "let a=1;var a;",
        kind: "conflict",
    },
    {
        text: "function f(a){let a=1,b=2;}",
        kind: "conflict",
    },
    {
        text: "const a=1,b;",
        kind: "blocked",
    },
    {
        text: "let a=1,[b];",
        kind: "blocked",
    },
    {
        text: "var a=1,;",
        kind: "blocked",
    },
    {
        text: "let a=1,b=;",
        kind: "blocked",
    },
    {
        text: "if(true)let a=1,b=2;",
        kind: "blocked",
    },
];
for (const item of negative) {
    const result = prepareBoundedScript(
        { id: "negative-list", text: item.text },
        new Realm((_line: string) => {}, "script"),
    );
    if (result.kind !== item.kind) {
        throw new Error("negative kind " + item.text);
    }
    if (result.kind === "ready" || result.kind === "profile-rejected") {
        throw new Error("negative admitted");
    }
    if (result.diagnostic.phase !== "parse" || result.diagnostic.name !== "SyntaxError") {
        throw new Error("negative diagnostic");
    }
}
function run(source: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "list-lifetime", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("lifetime preparation");
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    if (state.active !== null || state.calls !== 0 || state.depth !== 0) {
        throw new Error("lifetime session cleanup");
    }
    return result;
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const creator = createScriptSession();
const setup = run(
    "function* f(){let a=yield 1,b=[a];return b;}var g=f();g.next();function spin(){while(true){}}function* slow(){const a=yield 1,b=spin();return b;}var h=slow();h.next();",
    owner,
    creator,
);
if (setup.type !== "normal") {
    throw new Error("lifetime setup");
}
for (const name of ["g", "h"]) {
    const property = owner.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("lifetime global");
    }
    caller.defineScriptGlobal(name, { value: property.value });
}
const before = creator.inspect().steps;
const resumed = run("g.next(5).value", caller, createScriptSession());
if (
    resumed.type !== "normal" ||
    resumed.value.kind !== "object" ||
    resumed.value.object.getPrototypeOf() !== owner.arrayPrototype
) {
    throw new Error("list defining Realm");
}
const stopped = run("h.next(7)", caller, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
if (stopped.type !== "throw" || stopped.origin.kind !== "resource-limit") {
    throw new Error("list caller budget");
}
if (creator.inspect().steps !== before) {
    throw new Error("list retained creator session");
}

console.log("declaration lists passed");
