import type { ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import { parseDeclarationPlan } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";
const cases: { id: string; text: string; expected: string }[] = [
    {
        id: "single-let-control",
        text: 'var out=[];for(let i=0;i<2;i++)out.push(()=>i);console.log(out.map(f=>f()).join(","));',
        expected: "0,1\n",
    },
    {
        id: "var-list-control",
        text: "for(var i=0,j=2;i<2;i++,j--){}console.log(i,j);",
        expected: "2 0\n",
    },
    {
        id: "for-of-pattern-control",
        text: "var sum=0;for(const [a,b] of [[1,2],[3,4]])sum+=a+b;console.log(sum);",
        expected: "10\n",
    },
    {
        id: "lexical-list-closures",
        text: 'var out=[];for(let i=0,j=10;i<3;i++,j++)out.push(()=>i+":"+j);console.log(out.map(f=>f()).join(","));',
        expected: "0:10,1:11,2:12\n",
    },
    {
        id: "pattern-closures",
        text: 'var out=[];for(let [i,j]=[0,10];i<3;i++,j++)out.push(()=>i+":"+j);console.log(out.map(f=>f()).join(","));',
        expected: "0:10,1:11,2:12\n",
    },
    {
        id: "initializer-closure",
        text: "var get;for(let i=(get=()=>i,0),j=1;i<1;i++){}console.log(get());",
        expected: "0\n",
    },
    {
        id: "continue-update",
        text: 'var out=[];for(let i=0,j=10;i<3;i++,j++){if(i===1)continue;out.push(()=>i+":"+j);}console.log(out.map(f=>f()).join(","),typeof i);',
        expected: "0:10,2:12 undefined\n",
    },
    {
        id: "const-pattern-list",
        text: "var once=true;for(const [a]=[7],b=a+1;once;once=false)console.log(a,b);",
        expected: "7 8\n",
    },
    {
        id: "empty-pattern",
        text: "var n=0;for(let []=[];n<2;n++){}console.log(n);",
        expected: "2\n",
    },
    {
        id: "pattern-tdz",
        text: "var a=7;try{for(let [a]=[a];false;){} }catch(e){console.log(e.name);}",
        expected: "ReferenceError\n",
    },
    {
        id: "abrupt-initializer",
        text: 'var log="";function fail(){throw "stop";}try{for(let a=(log+="a"),b=fail(),c=(log+="c");false;){} }catch(e){console.log(log,e);}',
        expected: "a stop\n",
    },
    {
        id: "var-pattern-list",
        text: "for(var [i]=[0],j=2;i<2;i++,j--){}console.log(i,j);",
        expected: "2 0\n",
    },
    {
        id: "generator-initializer",
        text: "function* f(){for(let [i]=yield [0],j=2;i<2;i++){yield i+j;}}var g=f();console.log(JSON.stringify(g.next().value),g.next([0]).value,g.next().value,g.next().done);",
        expected: "[0] 2 3 true\n",
    },
    {
        id: "async-initializer",
        text: "async function f(){var sum=0;for(let [i]=await Promise.resolve([0]),j=2;i<2;i++)sum+=i+j;return sum;}f().then(v=>console.log(v));",
        expected: "5\n",
    },
    {
        id: "parenthesized-in",
        text: 'for(let [a]=[("x" in {x:1})];;){console.log(a);break;}',
        expected: "true\n",
    },

    {
        id: "later-var-pattern",
        text: "for(var a=0,[b]=[2];a<2;a++,b--){}console.log(a,b);",
        expected: "2 0\n",
    },
    {
        id: "object-defaults",
        text: "var once=true;for(let {a=3}={},[b=a+1]=[];once;once=false)console.log(a,b);",
        expected: "3 4\n",
    },
    {
        id: "labelled-continue",
        text: 'var out=[];outer:for(let a=0,b=10;a<3;a++,b++){for(let [c]=[0];c<2;c++){out.push(()=>a+":"+b);continue outer;}}console.log(out.map(f=>f()).join(","));',
        expected: "0:10,1:11,2:12\n",
    },
    {
        id: "const-write",
        text: "try{for(const a=1,b=2;;){b=3;}}catch(e){console.log(e.name);}",
        expected: "TypeError\n",
    },
    {
        id: "iterator-close",
        text: "var closed=0;var values={[Symbol.iterator]:function(){return {next:function(){return {value:4,done:false};},return:function(){closed++;return {};}};}};for(let [a]=values,b=closed;;){console.log(a,b);break;}",
        expected: "4 1\n",
    },
    {
        id: "later-binding-tdz",
        text: "try{for(let a=b,b=2;false;){} }catch(e){console.log(e.name);}",
        expected: "ReferenceError\n",
    },
    {
        id: "generator-two-initializers",
        text: "function* f(){for(let a=yield 1,[b]=yield [2];;){return a+b;}}var g=f();console.log(g.next().value,JSON.stringify(g.next(3).value),g.next([4]).value);",
        expected: "1 [2] 7\n",
    },
    {
        id: "inferred-names",
        text: "for(let a=function(){},[b=function(){}]=[];;){console.log(a.name,b.name);break;}",
        expected: "a b\n",
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

const invalid = [
    ["duplicate-let", "for(let a=0,a=1;false;){}"],
    ["duplicate-pattern", "for(let [a,a]=[0,1];false;){}"],
    ["lexical-var-conflict", "for(let a=0,b=1;false;){var b;}"],
    ["const-initializer", "for(const a=0,b;false;){}"],
    ["pattern-initializer", "for(let [a];false;){}"],
    ["for-in-list", "for(let a,b in {}){}"],
    ["for-of-list", "for(var a,b of []){}"],
    ["for-of-pattern-list", "for(let [a],b of []){}"],
    ["unparenthesized-in", 'for(let a="x" in {};false;){}'],
    ["await-classic", "async function f(){for await(let a=0;a<1;a++){}}"],
];
for (const [id, text] of invalid) {
    const prepared = prepareBoundedScript({ id, text }, new Realm((_line: string) => {}, "script"));
    const expected =
        id === "duplicate-let" || id === "duplicate-pattern" || id === "lexical-var-conflict"
            ? "conflict"
            : "blocked";
    if (prepared.kind !== expected) {
        throw new Error("invalid loop phase: " + id);
    }
    if (prepared.diagnostic.phase !== "parse" || prepared.diagnostic.name !== "SyntaxError") {
        throw new Error("invalid loop diagnostic: " + id);
    }
}

function run(source: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "loop-lifetime", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("loop lifetime preparation");
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    if (state.active !== null || state.calls !== 0 || state.depth !== 0) {
        throw new Error("loop session cleanup");
    }
    return result;
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const creator = createScriptSession();
const setup = run(
    "function* f(){for(let a=yield 1,b=[a];;){return b;}}var g=f();g.next();function spin(){while(true){}}function* slow(){for(let a=yield 1,b=spin();;){return b;}}var h=slow();h.next();",
    owner,
    creator,
);
if (setup.type !== "normal") {
    throw new Error("loop lifetime setup");
}
for (const name of ["g", "h"]) {
    const property = owner.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("loop lifetime global");
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
    throw new Error("loop defining Realm");
}
const stopped = run("h.next(7)", caller, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
if (stopped.type !== "throw" || stopped.origin.kind !== "resource-limit") {
    throw new Error("loop caller budget");
}
if (creator.inspect().steps !== before) {
    throw new Error("loop retained creator session");
}
for (const source of [
    "for(let [i,j]=[0,1];;i++,j++){}",
    "for(const a=0,b=1;;){}",
    "for(let []=[];;){}",
]) {
    for (const budget of [0, 10, 50, 200]) {
        const result = run(
            source,
            new Realm((_line: string) => {}, "script"),
            createScriptSession({ maxSteps: budget, maxCalls: 16 }),
        );
        if (result.type !== "throw" || result.origin.kind !== "resource-limit") {
            throw new Error("loop resource bound");
        }
    }
}
const source = "for(let [a,b]=[1,2],c=a+b;false;){var z;}";
const plan = parseDeclarationPlan({ id: "loop-plan", text: source });
if (plan.kind !== "complete") {
    throw new Error("loop plan incomplete");
}
if (
    plan.scopes[1].kind !== "for-lexical" ||
    plan.scopes[1].lexicalNames.join(",") !== "a,b,c" ||
    plan.scopes[0].varNames.join(",") !== "z"
) {
    throw new Error("loop declaration ownership");
}
for (let i = 0; i < 3; i++) {
    const declaration = plan.declarations[plan.scopes[1].lexicalDeclarations[i]];
    const span = declaration.initializer;
    if (span === null || source.slice(span.start, span.end) !== (i < 2 ? "[1,2]" : "a+b")) {
        throw new Error("loop initializer span");
    }
    if (source.slice(declaration.site.start, declaration.site.end) !== ["a", "b", "c"][i]) {
        throw new Error("loop binding span");
    }
}
console.log("classic-for declarations passed");
