import type { ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";

const cases: { id: string; text: string; expected: string }[] = [
  {
    "id": "assignment-default-yield",
    "text": "function* g(){var x;[x=yield \"init\"]=[];return x;}var i=g();console.log(i.next().value);console.log(i.next(7).value);\n",
    "expected": "init\n7\n"
  },
  {
    "id": "assignment-reference",
    "text": "var log=[];var first={};var target=first;var input={get x(){log.push(\"get\");return undefined}};function ref(){log.push(\"target\");return target}function* g(){var result=({x:ref().x=yield \"default\"}=input);console.log(result===input,first.x,target.x,log.join(\",\"))}var i=g();console.log(i.next().value,log.join(\",\"));target={};i.next(7);",
    "expected": "default target,get\ntrue 7 undefined target,get\n"
  },
  {
    "id": "array-target-yield",
    "text": "var log=[];var target={};var input={[Symbol.iterator](){log.push(\"iterator\");return {next(){log.push(\"next\");return {value:4,done:false}},return(){log.push(\"close\");return {}}}}};function* g(){[target[yield \"key\"]]=input;console.log(target.x,log.join(\",\"))}var i=g();console.log(i.next().value,log.join(\",\"));i.next(\"x\");",
    "expected": "key iterator\n4 iterator,next,close\n"
  },
  {
    "id": "rest-target-yield",
    "text": "var log=[];var target={};var input={get x(){log.push(\"get\");return 4}};function* g(){({...target[yield \"key\"]}=input);console.log(target.rest.x,log.join(\",\"))}var i=g();console.log(i.next().value,log.length);i.next(\"rest\");",
    "expected": "key 0\n4 get\n"
  },
  {
    "id": "nested-result",
    "text": "var x,input={};function* g(){return 3+(({x=yield \"pause\"}=input)===input?4:9)}var i=g();console.log(i.next().value);console.log(i.next(8).value,x);",
    "expected": "pause\n7 8\n"
  },
  {
    "id": "call-context",
    "text": "var x,log=[];var input={get x(){log.push(\"get\");return undefined}};var receiver={get m(){log.push(\"method\");return function(a,b){console.log(this===receiver,a===input,b,x,log.join(\",\"))}}};function* g(){receiver.m(({x=yield \"pause\"}=input),(log.push(\"tail\"),9))}var i=g();console.log(i.next().value,log.join(\",\"));i.next(7);",
    "expected": "pause method,get\ntrue true 9 7 method,get,tail\n"
  },
  {
    "id": "nested-pattern-expression",
    "text": "var x,y,input={};function* g(){return ({x=({y=yield \"inner\"}={})}=input)}var i=g();console.log(i.next().value);var r=i.next(8);console.log(r.value===input,typeof x,y);",
    "expected": "inner\ntrue object 8\n"
  },
  {
    "id": "target-base-capture",
    "text": "var first={},target=first;function* g(){[target[yield \"key\"]]=[9]}var i=g();console.log(i.next().value);target={};i.next(\"x\");console.log(first.x,target.x);",
    "expected": "key\n9 undefined\n"
  },
  {
    "id": "await-default-result",
    "text": "var x,input={};async function f(){return ({x=await Promise.resolve(6)}=input)}f().then(r=>console.log(r===input,x));",
    "expected": "true 6\n"
  },
  {
    "id": "target-close-order",
    "text": "var log=[],target={};var input={[Symbol.iterator](){log.push(\"iterator\");return {next(){log.push(\"next\");return {value:4,done:false}},return(){log.push(\"close\");return {}}}}};function* g(){try{[target[yield \"key\"]]=input}finally{log.push(\"finally\")}}var i=g();i.next();var r=i.return(7);console.log(r.value,r.done,log.join(\",\"));",
    "expected": "7 true iterator,close,finally\n"
  },
  {
    "id": "private-target",
    "text": "class C{#x=0;*g(){[(yield \"base\").#x]=[9];return this.#x}}var c=new C,i=c.g();console.log(i.next().value);console.log(i.next(c).value);",
    "expected": "base\n9\n"
  },
  {
    "id": "super-target",
    "text": "class B{set x(v){this.saved=v}}class C extends B{*g(){[super[yield \"key\"]]=[9];return this.saved}}var i=new C().g();console.log(i.next().value);console.log(i.next(\"x\").value);",
    "expected": "key\n9\n"
  },
  {
    "id": "class-scope-throw",
    "text": "class C{#x=8;*g(){var x;try{class Inner extends (({x=yield \"pause\"}={}),null){}}finally{console.log(this.#x)}}}var i=new C().g();console.log(i.next().value);try{i.throw(\"bad\")}catch(e){console.log(e)}",
    "expected": "pause\n8\nbad\n"
  },
  {
    "id": "class-key-resume",
    "text": "class C{#x=7;*g(){var x;class D{[(({x=yield \"key\"}={}),\"m\")](){return 1}}return [this.#x,x,new D().m()].join(\",\")}}var i=new C().g();console.log(i.next().value);console.log(i.next(9).value);",
    "expected": "key\n7,9,1\n"
  },
  {
    "id": "throw-close-precedence",
    "text": "var log=[],x;var a={[Symbol.iterator](){return {next(){return {done:false}},return(){log.push(\"close\");throw \"close-error\"}}}};function* g(){try{[x=yield 1]=a}catch(e){return e}}var i=g();i.next();console.log(i.throw(\"original\").value,log.join(\",\"));",
    "expected": "original close\n"
  },
  {
    "id": "target-key-coercion",
    "text": "var log=[],target={};var key={toString(){log.push(\"coerce\");return \"x\"}};var input={get x(){log.push(\"get\");return 4}};function* g(){({x:target[yield \"key\"]}=input);console.log(target.x,log.join(\",\"))}var i=g();console.log(i.next().value);i.next(key);",
    "expected": "key\n4 get,coerce\n"
  }
];
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "assignment-pattern", text }, realm);
    if (prepared.kind !== "ready") throw new Error("assignment pattern preparation");
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    if (state.active !== null || state.calls !== 0 || state.depth !== 0) throw new Error("assignment pattern cleanup");
    return result;
}
for (const item of cases) {
    let output = "";
    const realm = new Realm((line: string) => { output += line + "\n"; }, "script");
    const session = createScriptSession();
    if (run(item.text, realm, session).type !== "normal") throw new Error("execute " + item.id);
    const jobs = drainScriptJobs(session);
    if (jobs.fatal || jobs.failures.length !== 0) throw new Error("jobs " + item.id);
    if (output !== item.expected) throw new Error("output " + item.id + ": " + output);
}
const admittedLoops: { text: string; execution: string; expected: string }[] = [
  {
    "text": "function* g(){for(let [x=yield 1] of [[]]){}}",
    "execution": "var i=g();var first=i.next();var last=i.next(7);console.log(first.value,first.done,last.done);",
    "expected": "1 false true\n"
  },
  {
    "text": "async function f(){for await(let {x=await 1} of [{}]){}}",
    "execution": "f().then(()=>console.log(\"done\"));",
    "expected": "done\n"
  }
];
for (const text of ["function* g(){for(let [x=yield 1] of [[]]){}}", "async function f(){for await(let {x=await 1} of [{}]){}}", "function* g(x=yield 1){}", "async function f(x=await 1){}"]) {
    const admitted = admittedLoops.find(item => item.text === text);
    if (admitted !== undefined) {
        let output = "";
        const realm = new Realm((line: string) => { output += line + "\n"; }, "script");
        const session = createScriptSession();
        if (prepareBoundedScript({ id: "pattern-boundary", text }, realm).kind !== "ready") throw new Error("original loop preparation");
        if (run(text, realm, session).type !== "normal" || output !== "") throw new Error("original loop definition");
        if (run(admitted.execution, realm, session).type !== "normal") throw new Error("original loop execution");
        const jobs = drainScriptJobs(session);
        if (jobs.fatal || jobs.failures.length !== 0 || output !== admitted.expected) throw new Error("original loop output");
        continue;
    }
    const prepared = prepareBoundedScript({ id: "pattern-boundary", text }, new Realm((_line: string) => {}, "script"));
    if (prepared.kind === "ready") throw new Error("loop or parameter boundary admitted");
}
const owner = new Realm((_line: string) => {}, "script");
const caller = new Realm((_line: string) => {}, "script");
const creator = createScriptSession();
if (run("var iter=(function*(){var target={};({...target[yield 1]}={a:4});yield [target.rest];while(true){}})();", owner, creator).type !== "normal")
    throw new Error("assignment lifetime setup");
const exported = owner.globalObject.getOwnProperty("iter");
if (exported === undefined || exported.kind !== "data") throw new Error("assignment export");
caller.defineScriptGlobal("iter", { value: exported.value });
const before = creator.inspect().steps;
if (run("iter.next()", caller, createScriptSession()).type !== "normal") throw new Error("assignment first step");
const resumed = run('iter.next("rest").value', caller, createScriptSession());
if (resumed.type !== "normal" || resumed.value.kind !== "object" || resumed.value.object.getPrototypeOf() !== owner.arrayPrototype)
    throw new Error("assignment defining Realm");
const rest = resumed.value.object.getOwnProperty("0");
if (rest === undefined || rest.kind !== "data" || rest.value.kind !== "object" || rest.value.object.getPrototypeOf() !== owner.objectPrototype)
    throw new Error("assignment rest Realm");
const limited = run("iter.next()", caller, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
if (limited.type !== "throw" || limited.origin.kind !== "resource-limit" || creator.inspect().steps !== before)
    throw new Error("assignment current caller budget");
for (const maxSteps of [0, 10, 30, 60, 120]) {
    const realm = new Realm((_line: string) => {}, "script");
    if (run("var reached=false;var iter=(function*(){var x,y;var result=1+([x=yield 1,y=(function(){while(true){}})()]=[]);reached=true;})();iter.next();", realm, createScriptSession()).type !== "normal")
        throw new Error("assignment budget setup");
    const result = run("iter.next(7)", realm, createScriptSession({ maxSteps, maxCalls: 16 }));
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") throw new Error("assignment initialization budget");
    const reached = realm.globalObject.getOwnProperty("reached");
    if (reached === undefined || reached.kind !== "data" || reached.value.kind !== "boolean" || reached.value.value)
        throw new Error("continued after assignment resource failure");
    const fresh = run("3", realm, createScriptSession());
    if (fresh.type !== "normal" || fresh.value.kind !== "number" || fresh.value.value !== 3) throw new Error("assignment resource recovery");
}
console.log("assignment pattern controls passed");
