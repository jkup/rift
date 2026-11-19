import type { ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import { parseDeclarationPlan } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";
const cases: { id: string; text: string; expected: string }[] = [
    {
        id: "basic",
        text: 'try{throw 1;}catch{console.log("caught");}',
        expected: "caught\n",
    },
    {
        id: "strict",
        text: '"use strict";try{throw 1;}catch{let x=2;console.log(x);}',
        expected: "2\n",
    },
    {
        id: "scope",
        text: "let x=1;try{throw 2;}catch{let x=3;console.log(x);}console.log(x);",
        expected: "3\n1\n",
    },
    {
        id: "var",
        text: "function f(){try{throw 1;}catch{var x=4;}return x;}console.log(f());",
        expected: "4\n",
    },
    {
        id: "eval",
        text: 'function f(){var x=2;try{throw 1;}catch{eval("var y=3; x=4;");}return x+y;}console.log(f());',
        expected: "7\n",
    },
    {
        id: "finally",
        text: "function f(){try{throw 1;}catch{return 2;}finally{return 3;}}console.log(f());",
        expected: "3\n",
    },
    {
        id: "break",
        text: "var n=0;outer:while(true){try{throw 1;}catch{break outer;}finally{n++;}}console.log(n);",
        expected: "1\n",
    },
    {
        id: "continue",
        text: "var n=0;for(var i=0;i<3;i++){try{throw 1;}catch{continue;}finally{n++;}}console.log(n);",
        expected: "3\n",
    },
    {
        id: "nested",
        text: "try{try{throw 1;}catch{throw 2;}}catch(e){console.log(e);}",
        expected: "2\n",
    },
    {
        id: "closure",
        text: "var f;try{throw 1;}catch{let x=7;f=()=>x;}console.log(f());",
        expected: "7\n",
    },
    {
        id: "generator",
        text: "function* g(){try{throw 1;}catch{yield 2;}finally{yield 3;}}var i=g();console.log(i.next().value,i.next().value,i.next().done);",
        expected: "2 3 true\n",
    },
    {
        id: "generator-return",
        text: "function* g(){try{throw 1;}catch{yield 2;}finally{yield 3;}}var i=g();console.log(i.next().value);console.log(i.return(9).value);var r=i.next();console.log(r.value,r.done);",
        expected: "2\n3\n9 true\n",
    },
    {
        id: "async",
        text: "async function f(){try{await Promise.reject(1);}catch{return await Promise.resolve(7);}}f().then(x=>console.log(x));",
        expected: "7\n",
    },
    {
        id: "annex-function",
        text: "try{throw 1;}catch{function f(){return 4;}}console.log(f());",
        expected: "4\n",
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
    "try{}catch(){}",
    "try{}catch(e=1){}",
    "try{}catch e {}",
    "try{}catch;",
    "try;catch{}",
    "try{}catch{}catch{}",
    "try{}catch{let x;let x;}",
    "try{}catch(e){let e;}",
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
    const prepared = prepareBoundedScript({ id: "optional-catch-lifetime", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("optional catch preparation");
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    if (state.active !== null || state.calls !== 0 || state.depth !== 0) {
        throw new Error("optional catch cleanup");
    }
    return result;
}
const owner = new Realm((_line: string) => {}, "script");
const caller = new Realm((_line: string) => {}, "script");
const creator = createScriptSession();
const setup =
    "var make,slow,it;try{throw 1;}catch{let secret=7;make=function(){return [secret];};slow=function(){while(true){}};it=(function*(){try{throw 1;}catch{yield [secret];while(true){}}})();}";
if (run(setup, owner, creator).type !== "normal") {
    throw new Error("optional catch setup");
}
for (const name of ["make", "slow", "it"]) {
    const property = owner.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("optional catch export");
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
        throw new Error("optional catch defining Realm");
    }
}
for (const source of ["slow()", "it.next()"]) {
    const result = run(source, caller, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") {
        throw new Error("optional catch caller budget");
    }
}
if (creator.inspect().steps !== before) {
    throw new Error("optional catch retained creator session");
}
for (const budget of [0, 10, 50, 200]) {
    const result = run(
        "try{while(true){}}catch{1;}",
        new Realm((_line: string) => {}, "script"),
        createScriptSession({ maxSteps: budget, maxCalls: 16 }),
    );
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") {
        throw new Error("optional catch swallowed resource failure");
    }
}
const source = "try{}catch{let x=1;var y=2;}";
const plan = parseDeclarationPlan({ id: "optional-catch-plan", text: source });
if (plan.kind !== "complete") {
    throw new Error("optional catch plan");
}
if (plan.scopes.length !== 3 || plan.scopes.some((scope) => scope.kind === "catch")) {
    throw new Error("optional catch fabricated scope");
}
if (
    plan.scopes[2].parent !== 0 ||
    plan.scopes[2].lexicalNames.join(",") !== "x" ||
    plan.scopes[0].varNames.join(",") !== "y"
) {
    throw new Error("optional catch declaration ownership");
}
console.log("optional catch passed");
