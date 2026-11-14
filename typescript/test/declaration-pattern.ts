import type { ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";

const cases: { id: string; text: string; expected: string }[] = [
  {
    "id": "binding-default-yield",
    "text": "function* g(){let [x=yield \"init\"]=[];return x;}var i=g();console.log(i.next().value);console.log(i.next(7).value);\n",
    "expected": "init\n7\n"
  },
  {
    "id": "binding-key-yield",
    "text": "function* g(){let {[yield \"key\"]:x}={a:4};return x;}var i=g();console.log(i.next().value);console.log(i.next(\"a\").value);\n",
    "expected": "key\n4\n"
  },
  {
    "id": "binding-default-await",
    "text": "async function f(){let [x=await Promise.resolve(7)]=[];return x;}f().then(x=>console.log(x));\n",
    "expected": "7\n"
  },
  {
    "id": "binding-key-await",
    "text": "async function f(){let {[await Promise.resolve(\"a\")]:x}={a:4};return x;}f().then(x=>console.log(x));\n",
    "expected": "4\n"
  },
  {
    "id": "binding-tdz-resume",
    "text": "function* g(){let [x=yield ()=>y,y=x]=[];console.log(x,y)}var i=g();var read=i.next().value;try{read()}catch(e){console.log(e.name)}i.next(8);console.log(read());",
    "expected": "ReferenceError\n8 8\n8\n"
  },
  {
    "id": "var-default",
    "text": "function* g(){var [x=yield \"init\",y=function(){}]=[];console.log(x,y.name)}var i=g();console.log(i.next().value);i.next(7);",
    "expected": "init\n7 y\n"
  },
  {
    "id": "classic-for",
    "text": "function* g(){for(let [x=yield \"init\"]=[];x<2;x++){console.log(x)}}var i=g();console.log(i.next().value);console.log(i.next(0).done);",
    "expected": "init\n0\n1\ntrue\n"
  },
  {
    "id": "declaration-list",
    "text": "function* g(){let [x=yield \"first\"]=[],{y=yield \"second\"}={};console.log(x,y)}var i=g();console.log(i.next().value);console.log(i.next(4).value);i.next(5);",
    "expected": "first\nsecond\n4 5\n"
  },
  {
    "id": "nested-close-return",
    "text": "var log=[];function it(name,value){return {[Symbol.iterator](){return {next(){return {value:value,done:false}},return(){log.push(name);return {}}}}}}function* g(){try{let [[x=yield 1]]=it(\"outer\",it(\"inner\",undefined));log.push(\"body\")}finally{log.push(\"finally\")}}var i=g();i.next();var r=i.return(9);console.log(r.value,r.done,log.join(\",\"));",
    "expected": "9 true inner,outer,finally\n"
  },
  {
    "id": "const-await-reject",
    "text": "var log=[];var a={[Symbol.iterator](){return {next(){return {done:false}},return(){log.push(\"close\");return {}}}}};async function f(){try{const [x=await Promise.reject(\"bad\")]=a;log.push(\"body\")}catch(e){log.push(e)}finally{log.push(\"finally\")}}f().then(()=>console.log(log.join(\",\")));",
    "expected": "close,bad,finally\n"
  },
  {
    "id": "input-and-default",
    "text": "function* g(){let [x=yield \"default\"]=yield \"input\";console.log(x)}var i=g();console.log(i.next().value);console.log(i.next([]).value);i.next(8);",
    "expected": "input\ndefault\n8\n"
  }
];
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "declaration-pattern", text }, realm);
    if (prepared.kind !== "ready") throw new Error("declaration pattern preparation");
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    if (state.active !== null || state.calls !== 0 || state.depth !== 0) throw new Error("declaration pattern cleanup");
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
const unsupported = [
  "function* g(){var x;[x=yield \"init\"]=[];return x;}var i=g();console.log(i.next().value);console.log(i.next(7).value);\n",
  "function* g(){for(const [x=yield \"init\"] of [[]])return x;}var i=g();console.log(i.next().value);console.log(i.next(7).value);\n",
  "var log=[];var first={};var target=first;var input={get x(){log.push(\"get\");return undefined}};function ref(){log.push(\"target\");return target}function* g(){var result=({x:ref().x=yield \"default\"}=input);console.log(result===input,first.x,target.x,log.join(\",\"))}var i=g();console.log(i.next().value,log.join(\",\"));target={};i.next(7);",
  "var log=[];var target={};var input={[Symbol.iterator](){log.push(\"iterator\");return {next(){log.push(\"next\");return {value:4,done:false}},return(){log.push(\"close\");return {}}}}};function* g(){[target[yield \"key\"]]=input;console.log(target.x,log.join(\",\"))}var i=g();console.log(i.next().value,log.join(\",\"));i.next(\"x\");",
  "var log=[];var target={};var input={get x(){log.push(\"get\");return 4}};function* g(){({...target[yield \"key\"]}=input);console.log(target.rest.x,log.join(\",\"))}var i=g();console.log(i.next().value,log.length);i.next(\"rest\");",
  "var log=[];function it(name,value){return {[Symbol.iterator](){return {next(){return {value:value,done:false}},return(){log.push(name);return {}}}}}}function* g(){try{for(let [x=yield 1] of it(\"outer\",it(\"inner\",undefined))){log.push(\"body\")}}finally{log.push(\"finally\")}}var i=g();i.next();var r=i.return(9);console.log(r.value,r.done,log.join(\",\"));"
];
for (const text of unsupported) {
    const prepared = prepareBoundedScript({ id: "unsupported-pattern", text }, new Realm((_line: string) => {}, "script"));
    if (prepared.kind === "ready" || !("diagnostic" in prepared) || !prepared.diagnostic.message.includes("unsupported"))
        throw new Error("unsupported pattern admitted");
}
const owner = new Realm((_line: string) => {}, "script");
const caller = new Realm((_line: string) => {}, "script");
const creator = createScriptSession();
if (run("var iter=(function*(){let {x=yield 1,...rest}={a:4};yield [x,rest];while(true){}})();", owner, creator).type !== "normal")
    throw new Error("declaration pattern setup");
const exported = owner.globalObject.getOwnProperty("iter");
if (exported === undefined || exported.kind !== "data") throw new Error("declaration pattern export");
caller.defineScriptGlobal("iter", { value: exported.value });
const before = creator.inspect().steps;
if (run("iter.next()", caller, createScriptSession()).type !== "normal") throw new Error("declaration first step");
const resumed = run("iter.next(7).value", caller, createScriptSession());
if (resumed.type !== "normal" || resumed.value.kind !== "object" || resumed.value.object.getPrototypeOf() !== owner.arrayPrototype)
    throw new Error("declaration defining Realm");
const rest = resumed.value.object.getOwnProperty("1");
if (rest === undefined || rest.kind !== "data" || rest.value.kind !== "object" || rest.value.object.getPrototypeOf() !== owner.objectPrototype)
    throw new Error("declaration rest defining Realm");
const limited = run("iter.next()", caller, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
if (limited.type !== "throw" || limited.origin.kind !== "resource-limit" || creator.inspect().steps !== before)
    throw new Error("declaration caller budget");
for (const maxSteps of [0, 10, 30, 60, 120]) {
    const realm = new Realm((_line: string) => {}, "script");
    if (run("var reached=false;var iter=(function*(){let [x=yield 1,y=(function(){while(true){}})()]=[];reached=true;})();iter.next();", realm, createScriptSession()).type !== "normal")
        throw new Error("declaration budget setup");
    const result = run("iter.next(7)", realm, createScriptSession({ maxSteps, maxCalls: 16 }));
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") throw new Error("declaration initialization budget");
    const reached = realm.globalObject.getOwnProperty("reached");
    if (reached === undefined || reached.kind !== "data" || reached.value.kind !== "boolean" || reached.value.value)
        throw new Error("continued after declaration resource failure");
}
console.log("declaration pattern controls passed");
